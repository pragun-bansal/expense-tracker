import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        category: true,
        account: true
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error fetching expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { amount, description, categoryId, accountId, date, receiptUrl, isRecurring } = await request.json()

    if (!amount || !categoryId || !accountId) {
      return NextResponse.json(
        { error: 'Amount, category, and account are required' },
        { status: 400 }
      )
    }

    // Get the original expense to calculate balance adjustment
    const originalExpense = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!originalExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const newAmount = parseFloat(amount)
    const amountDifference = newAmount - originalExpense.amount

    // Update the expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        amount: newAmount,
        description,
        categoryId,
        accountId,
        date: date ? new Date(date) : originalExpense.date,
        receiptUrl,
        isRecurring: isRecurring || false
      },
      include: {
        category: true,
        account: true
      }
    })

    // Adjust account balances if needed
    if (amountDifference !== 0) {
      // If account changed, adjust both accounts
      if (originalExpense.accountId !== accountId) {
        // Add back to original account
        await prisma.userAccount.update({
          where: { id: originalExpense.accountId },
          data: { balance: { increment: originalExpense.amount } }
        })
        
        // Subtract from new account
        await prisma.userAccount.update({
          where: { id: accountId },
          data: { balance: { decrement: newAmount } }
        })
      } else {
        // Same account, just adjust the difference
        await prisma.userAccount.update({
          where: { id: accountId },
          data: { balance: { decrement: amountDifference } }
        })
      }
    } else if (originalExpense.accountId !== accountId) {
      // Amount same but account changed
      await prisma.userAccount.update({
        where: { id: originalExpense.accountId },
        data: { balance: { increment: originalExpense.amount } }
      })
      
      await prisma.userAccount.update({
        where: { id: accountId },
        data: { balance: { decrement: newAmount } }
      })
    }

    return NextResponse.json(updatedExpense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the expense to adjust account balance
    const expense = await prisma.expense.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Delete the expense
    await prisma.expense.delete({
      where: { id }
    })

    // Restore account balance
    await prisma.userAccount.update({
      where: { id: expense.accountId },
      data: {
        balance: { increment: expense.amount }
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