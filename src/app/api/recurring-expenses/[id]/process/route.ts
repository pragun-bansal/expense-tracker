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

    // Check if it's due - don't allow processing before due date
    const now = new Date()
    const dueDate = new Date(recurringExpense.nextDueDate)
    
    if (dueDate > now) {
      return NextResponse.json(
        { error: `Cannot process before due date. Due on: ${dueDate.toLocaleDateString()}` },
        { status: 400 }
      )
    }

    // Check if end date has passed
    if (recurringExpense.endDate && new Date(recurringExpense.endDate) < now) {
      return NextResponse.json(
        { error: 'Recurring expense has ended and cannot be processed' },
        { status: 400 }
      )
    }

    // Calculate how many times this expense should be processed
    const dueDates = calculateMissedDueDates(
      dueDate,
      recurringExpense.frequency,
      now,
      recurringExpense.endDate
    )

    const processedExpenses = []

    // Process each missed due date
    for (const missedDueDate of dueDates) {
      const expense = await prisma.expense.create({
        data: {
          amount: recurringExpense.amount,
          description: recurringExpense.description,
          date: missedDueDate,
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
      await prisma.userAccount.update({
        where: { id: recurringExpense.accountId },
        data: {
          balance: {
            decrement: recurringExpense.amount
          }
        }
      })

      // Create generation tracking record
      await prisma.recurringExpenseGeneration.create({
        data: {
          recurringExpenseId: recurringExpense.id,
          generatedExpenseIds: [expense.id],
          processedDate: now,
          dueDate: missedDueDate,
          amount: recurringExpense.amount
        }
      })

      processedExpenses.push(expense)
    }

    // Update with the next future due date
    const nextDueDate = dueDates.length > 0 
      ? calculateNextDueDate(dueDates[dueDates.length - 1], recurringExpense.frequency)
      : recurringExpense.nextDueDate

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
      message: `Processed ${processedExpenses.length} instance(s) of recurring expense: ${recurringExpense.description || 'Expense'}`,
      expenses: processedExpenses,
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

function calculateMissedDueDates(
  nextDueDate: Date,
  frequency: string,
  currentDate: Date,
  endDate: Date | null
): Date[] {
  const dueDates: Date[] = []
  let currentDue = new Date(nextDueDate)
  
  // Only process dates that are due (on or before current date)
  while (currentDue <= currentDate) {
    // Check if end date has passed
    if (endDate && currentDue > endDate) {
      break
    }
    
    dueDates.push(new Date(currentDue))
    currentDue = calculateNextDueDate(currentDue, frequency)
  }
  
  return dueDates
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