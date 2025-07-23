import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recurringExpenses = await prisma.recurringExpense.findMany({
      where: { userId: session.user.id },
      include: {
        category: true,
        account: true,
        expenses: {
          orderBy: { date: 'desc' },
          take: 5
        }
      },
      orderBy: { nextDueDate: 'asc' }
    })

    return NextResponse.json(recurringExpenses)
  } catch (error) {
    console.error('Error fetching recurring expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount, description, frequency, startDate, endDate, accountId, categoryId } = await request.json()

    if (!amount || !frequency || !startDate || !accountId || !categoryId) {
      return NextResponse.json(
        { error: 'Amount, frequency, start date, account, and category are required' },
        { status: 400 }
      )
    }

    // Validate frequency
    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: `Invalid frequency: "${frequency}". Valid values are: ${validFrequencies.join(', ')}` },
        { status: 400 }
      )
    }

    // Calculate next due date based on frequency
    const nextDueDate = calculateNextDueDate(new Date(startDate), frequency)

    const recurringExpense = await prisma.recurringExpense.create({
      data: {
        amount: parseFloat(amount),
        description,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextDueDate,
        userId: session.user.id,
        accountId,
        categoryId
      },
      include: {
        category: true,
        account: true
      }
    })

    return NextResponse.json(recurringExpense)
  } catch (error) {
    console.error('Error creating recurring expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateNextDueDate(startDate: Date, frequency: string): Date {
  const nextDate = new Date(startDate)
  
  console.log(`Calculating next due date for frequency: "${frequency}" (type: ${typeof frequency})`)
  
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
      console.error(`Invalid frequency received: "${frequency}" (type: ${typeof frequency})`)
      throw new Error(`Invalid frequency: "${frequency}". Valid values are: DAILY, WEEKLY, MONTHLY, YEARLY`)
  }
  
  return nextDate
}