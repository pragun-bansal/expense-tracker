import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkBudgetAlert } from '@/lib/budgetAlerts'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the recurring expense
    const recurringExpense = await prisma.recurringExpense.findFirst({
      where: {
        id,
        userId: session.user.id,
        isActive: true
      },
      include: {
        category: true,
        account: true
      }
    })

    if (!recurringExpense) {
      return NextResponse.json({ error: 'Recurring expense not found or not active' }, { status: 404 })
    }

    // Check if it's due or allow manual processing
    const now = new Date()
    const isDue = new Date(recurringExpense.nextDueDate) <= now

    // Create the actual expense
    const expense = await prisma.expense.create({
      data: {
        amount: recurringExpense.amount,
        description: recurringExpense.description,
        date: isDue ? recurringExpense.nextDueDate : now,
        isRecurring: true,
        recurringExpenseId: recurringExpense.id,
        userId: session.user.id,
        accountId: recurringExpense.accountId,
        categoryId: recurringExpense.categoryId
      },
      include: {
        category: true,
        account: true
      }
    })

    // Update account balance
    await prisma.account.update({
      where: { id: recurringExpense.accountId },
      data: {
        balance: {
          decrement: recurringExpense.amount
        }
      }
    })

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(
      isDue ? recurringExpense.nextDueDate : now, 
      recurringExpense.frequency
    )

    // Update the recurring expense with the next due date
    await prisma.recurringExpense.update({
      where: { id: recurringExpense.id },
      data: {
        nextDueDate: nextDueDate
      }
    })

    // Check for budget alerts after creating the expense
    let budgetAlert = null
    try {
      budgetAlert = await checkBudgetAlert(session.user.id, recurringExpense.categoryId)
    } catch (budgetError) {
      console.error('Error checking budget alert:', budgetError)
      // Don't fail the main operation if budget check fails
    }

    return NextResponse.json({
      message: `Processed recurring expense: ${recurringExpense.description || 'Expense'}`,
      expense: expense,
      budgetAlert
    })
  } catch (error) {
    console.error('Error processing recurring expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const nextDate = new Date(currentDate)
  
  switch (frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case 'WEEKLY':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'MONTHLY':
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case 'YEARLY':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    default:
      throw new Error('Invalid frequency')
  }
  
  return nextDate
}