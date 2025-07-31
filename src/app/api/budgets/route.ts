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

    const budgets = await prisma.budget.findMany({
      where: { userId: session.user.id },
      include: {
        category: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate current spending for each budget
    const budgetsWithSpending = await Promise.all(
      budgets.map(async (budget) => {
        // Calculate current period dates based on budget period and current date
        const now = new Date()
        let currentStartDate: Date
        let currentEndDate: Date

        switch (budget.period) {
          case 'WEEKLY':
            currentStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay()))
            currentEndDate = new Date(currentStartDate.getTime() + 6 * 24 * 60 * 60 * 1000)
            break
          case 'MONTHLY':
            currentStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
            currentEndDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
            break
          case 'YEARLY':
            currentStartDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
            currentEndDate = new Date(Date.UTC(now.getUTCFullYear(), 11, 31))
            break
          default:
            // Fallback to stored dates if period is unknown
            currentStartDate = budget.startDate
            currentEndDate = budget.endDate
        }

        console.log(`Calculating spending for budget ${budget.id} (${budget.category?.name}):`, {
          categoryId: budget.categoryId,
          storedStartDate: budget.startDate,
          storedEndDate: budget.endDate,
          currentStartDate: currentStartDate,
          currentEndDate: currentEndDate,
          period: budget.period
        })

        // Get all expenses for debugging
        const allExpenses = await prisma.expense.findMany({
          where: {
            userId: session.user.id,
            categoryId: budget.categoryId
          },
          select: {
            id: true,
            amount: true,
            date: true,
            description: true
          },
          orderBy: { date: 'desc' }
        })

        console.log(`All expenses for category ${budget.categoryId}:`, allExpenses)

        // Get expenses in current period for debugging
        const currentPeriodExpenses = await prisma.expense.findMany({
          where: {
            userId: session.user.id,
            categoryId: budget.categoryId,
            date: {
              gte: currentStartDate,
              lte: currentEndDate
            }
          },
          select: {
            id: true,
            amount: true,
            date: true,
            description: true
          },
          orderBy: { date: 'desc' }
        })

        console.log(`Expenses in current period (${currentStartDate.toISOString()} to ${currentEndDate.toISOString()}):`, currentPeriodExpenses)

        const currentSpending = await prisma.expense.aggregate({
          where: {
            userId: session.user.id,
            categoryId: budget.categoryId,
            date: {
              gte: currentStartDate,
              lte: currentEndDate
            }
          },
          _sum: {
            amount: true
          }
        })

        const spending = currentSpending._sum.amount || 0
        const budgetAmount = budget.amount || 0

        console.log(`Budget calculation result:`, {
          budgetAmount,
          currentSpending: spending,
          percentUsed: budgetAmount > 0 ? (spending / budgetAmount) * 100 : 0
        })
        
        return {
          ...budget,
          currentSpending: spending,
          remainingAmount: budgetAmount - spending,
          percentUsed: budgetAmount > 0 ? (spending / budgetAmount) * 100 : 0
        }
      })
    )

    return NextResponse.json(budgetsWithSpending)
  } catch (error) {
    console.error('Error fetching budgets:', error)
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

    const { amount, period, categoryId } = await request.json()

    if (!amount || !period || !categoryId) {
      return NextResponse.json(
        { error: 'Amount, period, and category are required' },
        { status: 400 }
      )
    }

    // Calculate start and end dates based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date

    console.log('Creating budget with current date:', now)

    switch (period) {
      case 'WEEKLY':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
        endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
        break
      case 'MONTHLY':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'YEARLY':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid period' },
          { status: 400 }
        )
    }

    console.log('Calculated budget dates:', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })

    // Check if budget already exists for this category and period
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId: session.user.id,
        categoryId,
        period,
        startDate: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    if (existingBudget) {
      return NextResponse.json(
        { error: 'Budget already exists for this category and period' },
        { status: 400 }
      )
    }

    const budget = await prisma.budget.create({
      data: {
        amount: parseFloat(amount),
        period,
        startDate,
        endDate,
        categoryId,
        userId: session.user.id
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}