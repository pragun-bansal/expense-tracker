import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPersonalTransactionsForGroupExpense } from '@/lib/groupTransactionSync'

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

    // Get all personal transactions related to this group expense before deleting
    const relatedExpenses = await prisma.expense.findMany({
      where: { groupExpenseId: expenseId }
    })
    
    const relatedIncomes = await prisma.income.findMany({
      where: { groupExpenseId: expenseId }
    })

    // Reverse account balance changes for expenses (add back the money)
    for (const expense of relatedExpenses) {
      await prisma.account.update({
        where: { id: expense.accountId },
        data: {
          balance: {
            increment: expense.amount
          }
        }
      })
    }

    // Reverse account balance changes for incomes (subtract the money)
    for (const income of relatedIncomes) {
      await prisma.account.update({
        where: { id: income.accountId },
        data: {
          balance: {
            decrement: income.amount
          }
        }
      })
    }

    // Delete all personal transactions related to this group expense
    await prisma.expense.deleteMany({
      where: { groupExpenseId: expenseId }
    })
    
    await prisma.income.deleteMany({
      where: { groupExpenseId: expenseId }
    })

    // Delete the expense (splits and lenders will be cascade deleted)
    await prisma.groupExpense.delete({
      where: { id: expenseId }
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

    // Validate split amounts
    const totalSplitAmount = splits.reduce((sum: number, split: any) => sum + split.amount, 0)
    if (Math.abs(totalSplitAmount - amount) > 0.01) {
      return NextResponse.json(
        { error: 'Split amounts must equal the total expense amount' },
        { status: 400 }
      )
    }

    // Validate lender amounts
    const totalLenderAmount = lenders.reduce((sum: number, lender: any) => sum + lender.amount, 0)
    if (Math.abs(totalLenderAmount - amount) > 0.01) {
      return NextResponse.json(
        { error: 'Lender amounts must equal the total expense amount' },
        { status: 400 }
      )
    }

    // First, clean up existing personal transactions and reverse balance changes
    const relatedExpenses = await prisma.expense.findMany({
      where: { groupExpenseId: expenseId }
    })
    
    const relatedIncomes = await prisma.income.findMany({
      where: { groupExpenseId: expenseId }
    })

    // Reverse account balance changes for expenses (add back the money)
    for (const expense of relatedExpenses) {
      await prisma.account.update({
        where: { id: expense.accountId },
        data: {
          balance: {
            increment: expense.amount
          }
        }
      })
    }

    // Reverse account balance changes for incomes (subtract the money)
    for (const income of relatedIncomes) {
      await prisma.account.update({
        where: { id: income.accountId },
        data: {
          balance: {
            decrement: income.amount
          }
        }
      })
    }

    // Delete existing personal transactions
    await prisma.expense.deleteMany({
      where: { groupExpenseId: expenseId }
    })
    
    await prisma.income.deleteMany({
      where: { groupExpenseId: expenseId }
    })

    // Update the expense
    const updatedExpense = await prisma.groupExpense.update({
      where: { id: expenseId },
      data: {
        description,
        amount: parseFloat(amount),
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
      await createPersonalTransactionsForGroupExpense(
        updatedExpense.id,
        {
          description,
          amount: parseFloat(amount),
          date: date ? new Date(date) : new Date(),
          groupId: expense.groupId
        },
        lenders,
        splits
      )
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

    return NextResponse.json(completeExpense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}