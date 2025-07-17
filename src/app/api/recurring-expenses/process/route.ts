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
      // Create the actual expense
      const expense = await prisma.expense.create({
        data: {
          amount: recurringExpense.amount,
          description: recurringExpense.description,
          date: recurringExpense.nextDueDate,
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
      const nextDueDate = calculateNextDueDate(recurringExpense.nextDueDate, recurringExpense.frequency)

      // Update the recurring expense with the next due date
      await prisma.recurringExpense.update({
        where: { id: recurringExpense.id },
        data: {
          nextDueDate: nextDueDate
        }
      })

      processedExpenses.push(expense)
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