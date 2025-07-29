import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPersonalTransactionsForGroupExpense } from '@/lib/groupTransactionSync'
import { logActivity } from '@/lib/activityLogger'

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId, expenseId } = await params

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if the expense exists and belongs to the group
    const expense = await prisma.groupExpense.findFirst({
      where: {
        id: expenseId,
        groupId
      },
      include: {
        lenders: true
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Check if user is admin or one of the lenders
    const isAdmin = membership.role === 'ADMIN'
    const isLender = expense.lenders.some(lender => lender.userId === session.user.id)

    if (!isAdmin && !isLender) {
      return NextResponse.json({ 
        error: 'Only group admins or lenders can delete this expense' 
      }, { status: 403 })
    }

    // Store expense details for activity logging
    const expenseDescription = expense.description || 'Unnamed expense'
    const expenseAmount = expense.amount

    // Use transaction IDs for reliable deletion, with fallback to old method
    const transactionIds = {
      expenseIds: [
        expense.paidByExpenseId,
        ...(expense.memberExpenseIds || [])
      ].filter(Boolean),
      incomeIds: expense.memberIncomeIds || [],
      lendingIds: [
        expense.paidByLendingId,
        ...(expense.memberLendingIds || [])
      ].filter(Boolean),
      borrowingIds: expense.memberBorrowingIds || []
    }

    // Delete expenses by ID if we have transaction IDs, otherwise fallback to groupExpenseId search
    if (transactionIds.expenseIds.length > 0) {
      const relatedExpenses = await prisma.expense.findMany({
        where: { id: { in: transactionIds.expenseIds } }
      })
      
      // Reverse account balance changes for expenses (add back the money)
      for (const expenseRecord of relatedExpenses) {
        await prisma.userAccount.update({
          where: { id: expenseRecord.accountId },
          data: {
            balance: {
              increment: expenseRecord.amount
            }
          }
        })
      }
      
      await prisma.expense.deleteMany({
        where: { id: { in: transactionIds.expenseIds } }
      })
    } else {
      // Fallback to old method for expenses without transaction IDs
      const relatedExpenses = await prisma.expense.findMany({
        where: { groupExpenseId: expenseId }
      })
      
      for (const expenseRecord of relatedExpenses) {
        await prisma.userAccount.update({
          where: { id: expenseRecord.accountId },
          data: {
            balance: {
              increment: expenseRecord.amount
            }
          }
        })
      }
      
      await prisma.expense.deleteMany({
        where: { groupExpenseId: expenseId }
      })
    }

    // Delete incomes by ID if we have transaction IDs, otherwise fallback to groupExpenseId search
    if (transactionIds.incomeIds.length > 0) {
      const relatedIncomes = await prisma.income.findMany({
        where: { id: { in: transactionIds.incomeIds } }
      })
      
      // Reverse account balance changes for incomes (subtract the money)
      for (const income of relatedIncomes) {
        await prisma.userAccount.update({
          where: { id: income.accountId },
          data: {
            balance: {
              decrement: income.amount
            }
          }
        })
      }
      
      await prisma.income.deleteMany({
        where: { id: { in: transactionIds.incomeIds } }
      })
    } else {
      // Fallback to old method for incomes without transaction IDs
      const relatedIncomes = await prisma.income.findMany({
        where: { groupExpenseId: expenseId }
      })
      
      for (const income of relatedIncomes) {
        await prisma.userAccount.update({
          where: { id: income.accountId },
          data: {
            balance: {
              decrement: income.amount
            }
          }
        })
      }
      
      await prisma.income.deleteMany({
        where: { groupExpenseId: expenseId }
      })
    }

    // Delete lending transactions by ID if we have transaction IDs, otherwise fallback to groupExpenseId search
    if (transactionIds.lendingIds.length > 0) {
      const relatedLendings = await prisma.lending.findMany({
        where: { id: { in: transactionIds.lendingIds } }
      })
      
      // Reverse account balance changes for lendings (subtract the money)
      for (const lending of relatedLendings) {
        await prisma.userAccount.update({
          where: { id: lending.accountId },
          data: {
            balance: {
              decrement: lending.amount
            }
          }
        })
      }
      
      await prisma.lending.deleteMany({
        where: { id: { in: transactionIds.lendingIds } }
      })
    } else {
      // Fallback to old method for lendings without transaction IDs
      const relatedLendings = await prisma.lending.findMany({
        where: { groupExpenseId: expenseId }
      })
      
      for (const lending of relatedLendings) {
        await prisma.userAccount.update({
          where: { id: lending.accountId },
          data: {
            balance: {
              decrement: lending.amount
            }
          }
        })
      }
      
      await prisma.lending.deleteMany({
        where: { groupExpenseId: expenseId }
      })
    }

    // Delete borrowing transactions by ID if we have transaction IDs, otherwise fallback to groupExpenseId search
    if (transactionIds.borrowingIds.length > 0) {
      const relatedBorrowings = await prisma.borrowing.findMany({
        where: { id: { in: transactionIds.borrowingIds } }
      })
      
      // Reverse account balance changes for borrowings (add back the money)
      for (const borrowing of relatedBorrowings) {
        await prisma.userAccount.update({
          where: { id: borrowing.accountId },
          data: {
            balance: {
              increment: borrowing.amount
            }
          }
        })
      }
      
      await prisma.borrowing.deleteMany({
        where: { id: { in: transactionIds.borrowingIds } }
      })
    } else {
      // Fallback to old method for borrowings without transaction IDs
      const relatedBorrowings = await prisma.borrowing.findMany({
        where: { groupExpenseId: expenseId }
      })
      
      for (const borrowing of relatedBorrowings) {
        await prisma.userAccount.update({
          where: { id: borrowing.accountId },
          data: {
            balance: {
              increment: borrowing.amount
            }
          }
        })
      }
      
      await prisma.borrowing.deleteMany({
        where: { groupExpenseId: expenseId }
      })
    }

    // Delete the expense (splits and lenders will be cascade deleted)
    await prisma.groupExpense.delete({
      where: { id: expenseId }
    })

    // Log activity
    await logActivity({
      action: 'EXPENSE_DELETED',
      description: `Deleted expense "${expenseDescription}" worth $${expenseAmount.toFixed(2)}`,
      userId: session.user.id,
      groupId,
      entityType: 'expense',
      entityId: expenseId,
      metadata: {
        expenseName: expenseDescription,
        amount: expenseAmount,
        deletedBy: session.user.name || session.user.email || 'Unknown'
      }
    })

    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId, expenseId } = await params

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if the expense exists and belongs to the group
    const expense = await prisma.groupExpense.findFirst({
      where: {
        id: expenseId,
        groupId
      },
      include: {
        lenders: true
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Check if user is admin or one of the lenders
    const isAdmin = membership.role === 'ADMIN'
    const isLender = expense.lenders.some(lender => lender.userId === session.user.id)

    if (!isAdmin && !isLender) {
      return NextResponse.json({ 
        error: 'Only group admins or lenders can edit this expense' 
      }, { status: 403 })
    }

    // Store original expense details for activity logging
    const originalDescription = expense.description || 'Unnamed expense'
    const originalAmount = expense.amount

    const { 
      description, 
      amount, 
      date, 
      splitType, 
      splits,
      lenders,
      receiptUrl 
    } = await request.json()

    if (!description || !amount || !splits || splits.length === 0) {
      return NextResponse.json(
        { error: 'Description, amount, and splits are required' },
        { status: 400 }
      )
    }

    if (!lenders || lenders.length === 0) {
      return NextResponse.json(
        { error: 'At least one lender is required' },
        { status: 400 }
      )
    }

    // Convert amount to number for validation
    const amountNumber = parseFloat(amount)
    
    // Validate split amounts
    const totalSplitAmount = splits.reduce((sum: number, split: any) => sum + parseFloat(split.amount), 0)
    if (Math.abs(totalSplitAmount - amountNumber) > 0.01) {
      console.error('Split validation failed:', {
        totalSplitAmount,
        amountNumber,
        difference: Math.abs(totalSplitAmount - amountNumber),
        splits: splits.map((s: any) => ({ ...s, amount: parseFloat(s.amount) }))
      })
      return NextResponse.json(
        { error: `Split amounts (${totalSplitAmount.toFixed(2)}) must equal the total expense amount (${amountNumber.toFixed(2)})` },
        { status: 400 }
      )
    }

    // Validate lender amounts
    const totalLenderAmount = lenders.reduce((sum: number, lender: any) => sum + parseFloat(lender.amount), 0)
    if (Math.abs(totalLenderAmount - amountNumber) > 0.01) {
      console.error('Lender validation failed:', {
        totalLenderAmount,
        amountNumber,
        difference: Math.abs(totalLenderAmount - amountNumber),
        lenders: lenders.map((l: any) => ({ ...l, amount: parseFloat(l.amount) }))
      })
      return NextResponse.json(
        { error: `Lender amounts (${totalLenderAmount.toFixed(2)}) must equal the total expense amount (${amountNumber.toFixed(2)})` },
        { status: 400 }
      )
    }

    // First, clean up existing personal transactions and reverse balance changes using transaction IDs
    const existingTransactionIds = {
      expenseIds: [
        expense.paidByExpenseId,
        ...(expense.memberExpenseIds || [])
      ].filter(Boolean),
      incomeIds: expense.memberIncomeIds || [],
      lendingIds: [
        expense.paidByLendingId,
        ...(expense.memberLendingIds || [])
      ].filter(Boolean),
      borrowingIds: expense.memberBorrowingIds || []
    }

    console.log('Cleaning up existing transactions for expense update:')
    console.log('- Expense IDs to delete:', existingTransactionIds.expenseIds)
    console.log('- Income IDs to delete:', existingTransactionIds.incomeIds)
    console.log('- Lending IDs to delete:', existingTransactionIds.lendingIds)
    console.log('- Borrowing IDs to delete:', existingTransactionIds.borrowingIds)

    // Delete expenses using both methods to ensure comprehensive cleanup
    let cleanedExpenseIds: string[] = []
    
    // First try transaction ID method
    if (existingTransactionIds.expenseIds.length > 0) {
      const relatedExpenses = await prisma.expense.findMany({
        where: { id: { in: existingTransactionIds.expenseIds } }
      })
      
      console.log(`Found ${relatedExpenses.length} expenses by transaction IDs`)
      
      // Reverse account balance changes for expenses (add back the money)
      for (const expenseRecord of relatedExpenses) {
        await prisma.userAccount.update({
          where: { id: expenseRecord.accountId },
          data: {
            balance: {
              increment: expenseRecord.amount
            }
          }
        })
        cleanedExpenseIds.push(expenseRecord.id)
      }
      
      await prisma.expense.deleteMany({
        where: { id: { in: existingTransactionIds.expenseIds } }
      })
    }
    
    // Also check for any expenses missed by transaction ID method (fallback cleanup)
    const remainingExpenses = await prisma.expense.findMany({
      where: { 
        groupExpenseId: expenseId,
        id: { notIn: cleanedExpenseIds }
      }
    })
    
    if (remainingExpenses.length > 0) {
      console.log(`Found ${remainingExpenses.length} additional expenses by groupExpenseId`)
      
      for (const expenseRecord of remainingExpenses) {
        await prisma.userAccount.update({
          where: { id: expenseRecord.accountId },
          data: {
            balance: {
              increment: expenseRecord.amount
            }
          }
        })
      }
      
      await prisma.expense.deleteMany({
        where: { 
          groupExpenseId: expenseId,
          id: { notIn: cleanedExpenseIds }
        }
      })
    }

    // Delete incomes using both methods to ensure comprehensive cleanup
    let cleanedIncomeIds: string[] = []
    
    // First try transaction ID method
    if (existingTransactionIds.incomeIds.length > 0) {
      const relatedIncomes = await prisma.income.findMany({
        where: { id: { in: existingTransactionIds.incomeIds } }
      })
      
      console.log(`Found ${relatedIncomes.length} incomes by transaction IDs`)
      
      // Reverse account balance changes for incomes (subtract the money)
      for (const income of relatedIncomes) {
        await prisma.userAccount.update({
          where: { id: income.accountId },
          data: {
            balance: {
              decrement: income.amount
            }
          }
        })
        cleanedIncomeIds.push(income.id)
      }
      
      await prisma.income.deleteMany({
        where: { id: { in: existingTransactionIds.incomeIds } }
      })
    }
    
    // Also check for any incomes missed by transaction ID method (fallback cleanup)
    const remainingIncomes = await prisma.income.findMany({
      where: { 
        groupExpenseId: expenseId,
        id: { notIn: cleanedIncomeIds }
      }
    })
    
    if (remainingIncomes.length > 0) {
      console.log(`Found ${remainingIncomes.length} additional incomes by groupExpenseId`)
      
      for (const income of remainingIncomes) {
        await prisma.userAccount.update({
          where: { id: income.accountId },
          data: {
            balance: {
              decrement: income.amount
            }
          }
        })
      }
      
      await prisma.income.deleteMany({
        where: { 
          groupExpenseId: expenseId,
          id: { notIn: cleanedIncomeIds }
        }
      })
    }

    // Delete lendings using both methods to ensure comprehensive cleanup
    let cleanedLendingIds: string[] = []
    
    // First try transaction ID method
    if (existingTransactionIds.lendingIds.length > 0) {
      const relatedLendings = await prisma.lending.findMany({
        where: { id: { in: existingTransactionIds.lendingIds } }
      })
      
      console.log(`Found ${relatedLendings.length} lendings by transaction IDs`)
      
      // Reverse account balance changes for lendings (subtract the money)
      for (const lending of relatedLendings) {
        await prisma.userAccount.update({
          where: { id: lending.accountId },
          data: {
            balance: {
              decrement: lending.amount
            }
          }
        })
        cleanedLendingIds.push(lending.id)
      }
      
      await prisma.lending.deleteMany({
        where: { id: { in: existingTransactionIds.lendingIds } }
      })
    }
    
    // Also check for any lendings missed by transaction ID method (fallback cleanup)
    const remainingLendings = await prisma.lending.findMany({
      where: { 
        groupExpenseId: expenseId,
        id: { notIn: cleanedLendingIds }
      }
    })
    
    if (remainingLendings.length > 0) {
      console.log(`Found ${remainingLendings.length} additional lendings by groupExpenseId`)
      
      for (const lending of remainingLendings) {
        await prisma.userAccount.update({
          where: { id: lending.accountId },
          data: {
            balance: {
              decrement: lending.amount
            }
          }
        })
      }
      
      await prisma.lending.deleteMany({
        where: { 
          groupExpenseId: expenseId,
          id: { notIn: cleanedLendingIds }
        }
      })
    }

    // Delete borrowings using both methods to ensure comprehensive cleanup
    let cleanedBorrowingIds: string[] = []
    
    // First try transaction ID method
    if (existingTransactionIds.borrowingIds.length > 0) {
      const relatedBorrowings = await prisma.borrowing.findMany({
        where: { id: { in: existingTransactionIds.borrowingIds } }
      })
      
      console.log(`Found ${relatedBorrowings.length} borrowings by transaction IDs`)
      
      // Reverse account balance changes for borrowings (add back the money)
      for (const borrowing of relatedBorrowings) {
        await prisma.userAccount.update({
          where: { id: borrowing.accountId },
          data: {
            balance: {
              increment: borrowing.amount
            }
          }
        })
        cleanedBorrowingIds.push(borrowing.id)
      }
      
      await prisma.borrowing.deleteMany({
        where: { id: { in: existingTransactionIds.borrowingIds } }
      })
    }
    
    // Also check for any borrowings missed by transaction ID method (fallback cleanup)
    const remainingBorrowings = await prisma.borrowing.findMany({
      where: { 
        groupExpenseId: expenseId,
        id: { notIn: cleanedBorrowingIds }
      }
    })
    
    if (remainingBorrowings.length > 0) {
      console.log(`Found ${remainingBorrowings.length} additional borrowings by groupExpenseId`)
      
      for (const borrowing of remainingBorrowings) {
        await prisma.userAccount.update({
          where: { id: borrowing.accountId },
          data: {
            balance: {
              increment: borrowing.amount
            }
          }
        })
      }
      
      await prisma.borrowing.deleteMany({
        where: { 
          groupExpenseId: expenseId,
          id: { notIn: cleanedBorrowingIds }
        }
      })
    }

    // Update the expense
    const updatedExpense = await prisma.groupExpense.update({
      where: { id: expenseId },
      data: {
        description,
        amount: amountNumber,
        date: date ? new Date(date) : undefined,
        splitType: splitType || 'EQUAL',
        receiptUrl: receiptUrl || null
      }
    })

    // Delete existing splits and lenders
    await prisma.expenseSplit.deleteMany({
      where: { expenseId: expenseId }
    })

    await prisma.groupLender.deleteMany({
      where: { expenseId: expenseId }
    })

    // Create new lenders
    for (const lender of lenders) {
      await prisma.groupLender.create({
        data: {
          expenseId: updatedExpense.id,
          userId: lender.userId,
          amount: parseFloat(lender.amount),
          accountId: lender.accountId || null
        }
      })
    }

    // Create new splits
    for (const split of splits) {
      await prisma.expenseSplit.create({
        data: {
          expenseId: updatedExpense.id,
          userId: split.userId,
          amount: parseFloat(split.amount),
          settled: false
        }
      })
    }

    // Create new personal transactions with the updated data
    try {
      const transactionIds = await createPersonalTransactionsForGroupExpense(
        updatedExpense.id,
        {
          description,
          amount: amountNumber,
          date: date ? new Date(date) : new Date(),
          groupId: expense.groupId
        },
        lenders,
        splits
      )
      
      // Update the group expense with transaction IDs for reliable deletion/updates
      await prisma.groupExpense.update({
        where: { id: updatedExpense.id },
        data: {
          paidByExpenseId: transactionIds.paidByExpenseId,
          paidByLendingId: transactionIds.paidByLendingId,
          memberIncomeIds: transactionIds.memberIncomeIds,
          memberExpenseIds: transactionIds.memberExpenseIds,
          memberLendingIds: transactionIds.memberLendingIds,
          memberBorrowingIds: transactionIds.memberBorrowingIds
        }
      })

      console.log('Expense update completed successfully with new transaction IDs:')
      console.log('- New Expense IDs:', transactionIds.memberExpenseIds)
      console.log('- New Income IDs:', transactionIds.memberIncomeIds)
      console.log('- New Lending IDs:', transactionIds.memberLendingIds)
      console.log('- New Borrowing IDs:', transactionIds.memberBorrowingIds)
    } catch (error) {
      console.error('Error creating personal transactions after edit:', error)
    }

    // Fetch the complete updated expense
    const completeExpense = await prisma.groupExpense.findUnique({
      where: { id: expenseId },
      include: {
        lenders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Generate detailed change description
    const changes = []
    if (originalDescription !== description) {
      changes.push(`name from "${originalDescription}" to "${description}"`)
    }
    if (Math.abs(originalAmount - amountNumber) > 0.01) {
      changes.push(`amount from $${originalAmount.toFixed(2)} to $${amountNumber.toFixed(2)}`)
    }
    
    const changeDescription = changes.length > 0 
      ? `Updated ${changes.join(' and ')} for expense "${description}"`
      : `Updated expense "${description}"`

    // Log activity
    await logActivity({
      action: 'EXPENSE_EDITED',
      description: changeDescription,
      userId: session.user.id,
      groupId,
      entityType: 'expense',
      entityId: expenseId,
      metadata: {
        expenseName: description,
        originalName: originalDescription,
        newAmount: amountNumber,
        originalAmount: originalAmount,
        splitType: splitType || 'EQUAL',
        lenderCount: lenders.length,
        splitCount: splits.length,
        editedBy: session.user.name || session.user.email || 'Unknown',
        changes: changes
      }
    })

    return NextResponse.json(completeExpense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}