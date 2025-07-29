import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activityLogger'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: settlementId } = await params
    const { borrowerAccountId, lenderAccountId } = await request.json()

    // Get the settlement
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        borrower: true,
        lender: true,
        group: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    // Check if user is authorized (must be borrower, lender, or group member)
    const isAuthorized = settlement.borrowerUserId === session.user.id ||
                        settlement.lenderUserId === session.user.id ||
                        settlement.group.members.length > 0

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow the borrower to update borrower account and lender to update lender account
    const updateData: any = {}
    
    if (session.user.id === settlement.borrowerUserId && borrowerAccountId !== undefined) {
      updateData.borrowerAccountId = borrowerAccountId
    }
    
    if (session.user.id === settlement.lenderUserId && lenderAccountId !== undefined) {
      updateData.lenderAccountId = lenderAccountId
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    // Update the settlement
    const updatedSettlement = await prisma.settlement.update({
      where: { id: settlementId },
      data: updateData
    })

    // Update the corresponding transactions
    const defaultGroupCategory = await getOrCreateGroupCategory()
    const othersAccountBorrower = await getOrCreateOthersAccount(settlement.borrowerUserId)
    const othersAccountLender = await getOrCreateOthersAccount(settlement.lenderUserId)

    if (updateData.borrowerAccountId !== undefined) {
      // Update borrower's expense transaction using the stored transaction ID
      const newAccountId = borrowerAccountId || othersAccountBorrower.id
      const oldAccountId = settlement.borrowerAccountId || othersAccountBorrower.id

      // Try to find transaction by ID first (preferred), fallback to search method
      let expenseTransaction = null
      if (settlement.borrowerExpenseId) {
        expenseTransaction = await prisma.expense.findUnique({
          where: { id: settlement.borrowerExpenseId }
        })
      } else {
        // Fallback for old settlements
        expenseTransaction = await prisma.expense.findFirst({
          where: {
            userId: settlement.borrowerUserId,
            amount: settlement.amount,
            description: { contains: `Payment to ${settlement.lender.name || settlement.lender.email}` },
            groupType: 'SETTLEMENT_PAID',
            date: {
              gte: new Date(settlement.settledAt.getTime() - 60000), // 1 minute before
              lte: new Date(settlement.settledAt.getTime() + 60000)  // 1 minute after
            }
          }
        })
      }

      if (expenseTransaction && expenseTransaction.accountId !== newAccountId) {
        // Revert balance change from old account
        await updateAccountBalance(oldAccountId, settlement.amount)
        
        // Apply balance change to new account
        await updateAccountBalance(newAccountId, -settlement.amount)
        
        // Update the transaction
        await prisma.expense.update({
          where: { id: expenseTransaction.id },
          data: { accountId: newAccountId }
        })
      }
    }

    if (updateData.lenderAccountId !== undefined) {
      // Update lender's income transaction using the stored transaction ID
      const newAccountId = lenderAccountId || othersAccountLender.id
      const oldAccountId = settlement.lenderAccountId || othersAccountLender.id

      // Try to find transaction by ID first (preferred), fallback to search method
      let incomeTransaction = null
      if (settlement.lenderIncomeId) {
        incomeTransaction = await prisma.income.findUnique({
          where: { id: settlement.lenderIncomeId }
        })
      } else {
        // Fallback for old settlements
        incomeTransaction = await prisma.income.findFirst({
          where: {
            userId: settlement.lenderUserId,
            amount: settlement.amount,
            description: { contains: `Payment from ${settlement.borrower.name || settlement.borrower.email}` },
            groupType: 'SETTLEMENT_RECEIVED',
            date: {
              gte: new Date(settlement.settledAt.getTime() - 60000), // 1 minute before
              lte: new Date(settlement.settledAt.getTime() + 60000)  // 1 minute after
            }
          }
        })
      }

      if (incomeTransaction && incomeTransaction.accountId !== newAccountId) {
        // Revert balance change from old account
        await updateAccountBalance(oldAccountId, -settlement.amount)
        
        // Apply balance change to new account
        await updateAccountBalance(newAccountId, settlement.amount)
        
        // Update the transaction
        await prisma.income.update({
          where: { id: incomeTransaction.id },
          data: { accountId: newAccountId }
        })
      }
    }

    return NextResponse.json({ 
      message: 'Settlement updated successfully',
      settlement: updatedSettlement
    })
  } catch (error) {
    console.error('Error updating settlement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getOrCreateGroupCategory() {
  let category = await prisma.category.findFirst({
    where: {
      name: 'Group Expenses',
      type: 'EXPENSE'
    }
  })

  if (!category) {
    const firstUser = await prisma.user.findFirst()
    if (firstUser) {
      category = await prisma.category.create({
        data: {
          name: 'Group Expenses',
          type: 'EXPENSE',
          color: '#8B5CF6',
          icon: '👥',
          userId: firstUser.id
        }
      })
    } else {
      throw new Error('No users found in database')
    }
  }

  return category
}

async function getOrCreateOthersAccount(userId: string) {
  let account = await prisma.userAccount.findFirst({
    where: {
      userId,
      type: 'OTHERS_FIXED'
    }
  })

  if (!account) {
    account = await prisma.userAccount.create({
      data: {
        name: 'Others',
        type: 'OTHERS_FIXED',
        balance: 0,
        color: '#6B7280',
        userId
      }
    })
  }

  return account
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: settlementId } = await params

    // Find the settlement with all related data
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        borrower: true,
        lender: true,
        group: {
          include: {
            members: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    // Check if user is authorized (must be borrower or lender)
    if (session.user.id !== settlement.borrowerUserId && session.user.id !== settlement.lenderUserId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Find all splits that were settled by this settlement and unsettle them
    // Simplified approach: unsettle all splits for the borrower that were settled
    // in expenses where the lender was involved
    const settledSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: settlement.borrowerUserId,
        settled: true,
        groupExpense: {
          groupId: settlement.groupId,
          lenders: {
            some: {
              userId: settlement.lenderUserId
            }
          }
        }
      }
    })

    console.log(`Found ${settledSplits.length} settled splits to potentially unsettle for settlement ${settlement.id}`)
    
    // For simplicity, we'll unsettle all splits that match the criteria
    // This is safer than trying to calculate proportions
    const splitsToUnsettle = settledSplits.map(split => split.id)
    
    console.log(`Will unsettle ${splitsToUnsettle.length} splits:`, splitsToUnsettle)

    // Find transactions by ID (much more reliable than searching by description/date)
    // This fixes the issue where account changes prevent proper deletion
    const transactionsToDelete = {
      expenses: [] as any[],
      incomes: [] as any[],
      lendings: [] as any[],
      borrowings: [] as any[]
    }

    // Find expense transactions by ID
    if (settlement.borrowerExpenseId) {
      const expense = await prisma.expense.findUnique({
        where: { id: settlement.borrowerExpenseId }
      })
      if (expense) {
        transactionsToDelete.expenses.push(expense)
      }
    }

    // Find income transactions by ID
    if (settlement.lenderIncomeId) {
      const income = await prisma.income.findUnique({
        where: { id: settlement.lenderIncomeId }
      })
      if (income) {
        transactionsToDelete.incomes.push(income)
      }
    }

    // Find lending transactions by ID
    if (settlement.borrowerLendingId) {
      const lending = await prisma.lending.findUnique({
        where: { id: settlement.borrowerLendingId }
      })
      if (lending) {
        transactionsToDelete.lendings.push(lending)
      }
    }

    // Find borrowing transactions by ID
    if (settlement.lenderBorrowingId) {
      const borrowing = await prisma.borrowing.findUnique({
        where: { id: settlement.lenderBorrowingId }
      })
      if (borrowing) {
        transactionsToDelete.borrowings.push(borrowing)
      }
    }

    // For backward compatibility with old settlements that don't have transaction IDs,
    // fall back to the old search method
    if (!settlement.borrowerExpenseId && !settlement.lenderIncomeId && 
        !settlement.borrowerLendingId && !settlement.lenderBorrowingId) {
      
      const borrowerGroupLendingAccount = await getOrCreateGroupLendingAccount(settlement.borrowerUserId)
      const lenderGroupLendingAccount = await getOrCreateGroupLendingAccount(settlement.lenderUserId)

      const expensesToReverse = await prisma.expense.findMany({
        where: {
          OR: [
            {
              userId: settlement.borrowerUserId,
              description: { contains: `Payment to ${settlement.lender.name || settlement.lender.email}` },
              groupType: 'SETTLEMENT_PAID',
              date: {
                gte: new Date(settlement.settledAt.getTime() - 60000),
                lte: new Date(settlement.settledAt.getTime() + 60000)
              }
            },
            {
              userId: settlement.lenderUserId,
              description: { contains: `Payment to ${settlement.borrower.name || settlement.borrower.email}` },
              groupType: 'SETTLEMENT_PAID',
              date: {
                gte: new Date(settlement.settledAt.getTime() - 60000),
                lte: new Date(settlement.settledAt.getTime() + 60000)
              }
            }
          ]
        }
      })

      const incomesToReverse = await prisma.income.findMany({
        where: {
          OR: [
            {
              userId: settlement.lenderUserId,
              description: { contains: `Payment from ${settlement.borrower.name || settlement.borrower.email}` },
              groupType: 'SETTLEMENT_RECEIVED',
              date: {
                gte: new Date(settlement.settledAt.getTime() - 60000),
                lte: new Date(settlement.settledAt.getTime() + 60000)
              }
            }
          ]
        }
      })

      const lendingsToReverse = await prisma.lending.findMany({
        where: {
          OR: [
            {
              userId: settlement.borrowerUserId,
              description: { contains: `Debt reduction to ${settlement.lender.name || settlement.lender.email}` },
              groupType: 'SETTLEMENT_PAID',
              accountId: borrowerGroupLendingAccount.id,
              date: {
                gte: new Date(settlement.settledAt.getTime() - 60000),
                lte: new Date(settlement.settledAt.getTime() + 60000)
              }
            }
          ]
        }
      })

      const borrowingsToReverse = await prisma.borrowing.findMany({
        where: {
          OR: [
            {
              userId: settlement.lenderUserId,
              description: { contains: `Credit reduction from ${settlement.borrower.name || settlement.borrower.email}` },
              groupType: 'SETTLEMENT_RECEIVED',
              accountId: lenderGroupLendingAccount.id,
              date: {
                gte: new Date(settlement.settledAt.getTime() - 60000),
                lte: new Date(settlement.settledAt.getTime() + 60000)
              }
            }
          ]
        }
      })

      // Add found transactions to the delete list
      transactionsToDelete.expenses.push(...expensesToReverse)
      transactionsToDelete.incomes.push(...incomesToReverse)
      transactionsToDelete.lendings.push(...lendingsToReverse)
      transactionsToDelete.borrowings.push(...borrowingsToReverse)
    }

    // Start transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Unsettle the splits
      if (splitsToUnsettle.length > 0) {
        const unsettleResult = await tx.expenseSplit.updateMany({
          where: {
            id: { in: splitsToUnsettle }
          },
          data: {
            settled: false,
            settledAt: null
          }
        })
        console.log(`Unsettled ${unsettleResult.count} splits`)
      }

      // Reverse all the transactions by updating account balances
      for (const expense of transactionsToDelete.expenses) {
        await tx.userAccount.update({
          where: { id: expense.accountId },
          data: {
            balance: {
              increment: expense.amount // Add back the expense amount
            }
          }
        })
        await tx.expense.delete({
          where: { id: expense.id }
        })
      }

      for (const income of transactionsToDelete.incomes) {
        await tx.userAccount.update({
          where: { id: income.accountId },
          data: {
            balance: {
              increment: -income.amount // Subtract back the income amount
            }
          }
        })
        await tx.income.delete({
          where: { id: income.id }
        })
      }

      // Reverse lending transactions (these add positive balance, so subtract to reverse)
      for (const lending of transactionsToDelete.lendings) {
        await tx.userAccount.update({
          where: { id: lending.accountId },
          data: {
            balance: {
              increment: -lending.amount // Subtract back the lending amount
            }
          }
        })
        await tx.lending.delete({
          where: { id: lending.id }
        })
      }

      // Reverse borrowing transactions (these subtract balance, so add to reverse)
      for (const borrowing of transactionsToDelete.borrowings) {
        await tx.userAccount.update({
          where: { id: borrowing.accountId },
          data: {
            balance: {
              increment: borrowing.amount // Add back the borrowing amount
            }
          }
        })
        await tx.borrowing.delete({
          where: { id: borrowing.id }
        })
      }

      // Delete the settlement
      await tx.settlement.delete({
        where: { id: settlementId }
      })
    })

    // Create notifications for all group members except the one who deleted the settlement
    const otherMembers = settlement.group.members.filter(m => m.userId !== session.user.id)
    const deleterName = session.user.name || session.user.email || 'Someone'
    const borrowerName = settlement.borrower.name || settlement.borrower.email
    const lenderName = settlement.lender.name || settlement.lender.email

    for (const member of otherMembers) {
      await createNotification({
        userId: member.userId,
        title: 'Settlement Deleted',
        message: `${deleterName} deleted a settlement of $${settlement.amount.toFixed(2)} from ${borrowerName} to ${lenderName} in group "${settlement.group.name}".`,
        type: 'GROUP_EXPENSE_DELETED',
        relatedId: settlement.groupId
      })
    }

    // Log activity
    await logActivity({
      action: 'SETTLEMENT_DELETED',
      description: `Deleted settlement of $${settlement.amount.toFixed(2)} from ${borrowerName} to ${lenderName}`,
      userId: session.user.id,
      groupId: settlement.groupId,
      entityType: 'settlement',
      entityId: settlementId,
      metadata: {
        amount: settlement.amount,
        fromUser: borrowerName,
        toUser: lenderName,
        deletedBy: deleterName,
        unsettledSplits: splitsToUnsettle.length
      }
    })

    return NextResponse.json({ 
      message: 'Settlement deleted successfully',
      unsettledSplits: splitsToUnsettle.length,
      debug: {
        settlementAmount: settlement.amount,
        borrower: settlement.borrower.name || settlement.borrower.email,
        lender: settlement.lender.name || settlement.lender.email,
        splitsFound: settledSplits.length,
        splitsUnsettled: splitsToUnsettle.length
      }
    })
  } catch (error) {
    console.error('Error deleting settlement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getOrCreateGroupLendingAccount(userId: string) {
  let account = await prisma.userAccount.findFirst({
    where: {
      userId,
      type: 'GROUP_LENDING'
    }
  })

  if (!account) {
    account = await prisma.userAccount.create({
      data: {
        name: 'Group Lending/Borrowing',
        type: 'GROUP_LENDING',
        balance: 0,
        color: '#10B981',
        userId
      }
    })
  }

  return account
}

async function updateAccountBalance(accountId: string, amount: number) {
  await prisma.userAccount.update({
    where: { id: accountId },
    data: {
      balance: {
        increment: amount
      }
    }
  })
}