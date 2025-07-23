import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const recurringExpense = await prisma.recurringExpense.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        category: true,
        account: true,
        expenses: {
          orderBy: { date: 'desc' }
        }
      }
    })

    if (!recurringExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    return NextResponse.json(recurringExpense)
  } catch (error) {
    console.error('Error fetching recurring expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { amount, description, frequency, startDate, endDate, accountId, categoryId, isActive } = await request.json()

    // Validate frequency
    const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
    if (frequency && !validFrequencies.includes(frequency)) {
      console.error(`Invalid frequency in request: "${frequency}"`)
      return NextResponse.json(
        { error: `Invalid frequency: "${frequency}". Valid values are: ${validFrequencies.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingExpense = await prisma.recurringExpense.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    // Calculate next due date if frequency or start date changed
    let nextDueDate = existingExpense.nextDueDate
    if (frequency && (frequency !== existingExpense.frequency || (startDate && startDate !== existingExpense.startDate.toISOString().split('T')[0]))) {
      nextDueDate = calculateNextDueDate(new Date(startDate || existingExpense.startDate), frequency)
    }

    const updatedExpense = await prisma.recurringExpense.update({
      where: { id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        description,
        frequency,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        nextDueDate,
        accountId,
        categoryId,
        isActive
      },
      include: {
        category: true,
        account: true
      }
    })

    return NextResponse.json(updatedExpense)
  } catch (error) {
    console.error('Error updating recurring expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const existingExpense = await prisma.recurringExpense.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    await prisma.recurringExpense.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Recurring expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting recurring expense:', error)
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