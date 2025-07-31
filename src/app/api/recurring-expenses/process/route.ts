import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active recurring expenses that are due
    const now = new Date()
    const dueRecurringExpenses = await prisma.recurringExpense.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
        nextDueDate: {
          lte: now
        },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      },
      include: {
        category: true,
        account: true
      }
    })

    const processedExpenses = []

    for (const recurringExpense of dueRecurringExpenses) {
      // Calculate how many times this expense should be processed
      const dueDates = calculateMissedDueDates(
        recurringExpense.nextDueDate,
        recurringExpense.frequency,
        now,
        recurringExpense.endDate
      )

      // Process each missed due date
      for (const dueDate of dueDates) {
        const expense = await prisma.expense.create({
          data: {
            amount: recurringExpense.amount,
            description: recurringExpense.description,
            date: dueDate,
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
            dueDate: dueDate,
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
    }

    return NextResponse.json({
      message: `Processed ${processedExpenses.length} recurring expenses`,
      expenses: processedExpenses
    })
  } catch (error) {
    console.error('Error processing recurring expenses:', error)
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