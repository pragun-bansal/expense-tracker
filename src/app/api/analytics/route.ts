import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // month, quarter, year

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate = now

    switch (period) {
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    // Get expense data by category
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    })

    // Get category details
    const categories = await prisma.category.findMany({
      where: {
        userId,
        type: 'EXPENSE'
      }
    })

    // Format expense data with category names
    const expenseCategoryData = expensesByCategory.map(item => {
      const category = categories.find(cat => cat.id === item.categoryId)
      return {
        name: category?.name || 'Unknown',
        value: item._sum.amount || 0,
        color: category?.color || '#6B7280'
      }
    })

    // Get income data by category
    const incomesByCategory = await prisma.income.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        amount: true
      }
    })

    // Get income category details
    const incomeCategories = await prisma.category.findMany({
      where: {
        userId,
        type: 'INCOME'
      }
    })

    // Format income data with category names
    const incomeCategoryData = incomesByCategory.map(item => {
      const category = incomeCategories.find(cat => cat.id === item.categoryId)
      return {
        name: category?.name || 'Unknown',
        value: item._sum.amount || 0,
        color: category?.color || '#10B981'
      }
    })

    // Get monthly trends (last 12 months)
    const monthlyTrends = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      
      const [expenses, income] = await Promise.all([
        prisma.expense.aggregate({
          where: {
            userId,
            date: {
              gte: date,
              lt: nextMonth
            }
          },
          _sum: { amount: true }
        }),
        prisma.income.aggregate({
          where: {
            userId,
            date: {
              gte: date,
              lt: nextMonth
            }
          },
          _sum: { amount: true }
        })
      ])

      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        expenses: expenses._sum.amount || 0,
        income: income._sum.amount || 0,
        net: (income._sum.amount || 0) - (expenses._sum.amount || 0)
      })
    }

    // Get account balances
    const accountBalances = await prisma.userAccount.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        balance: true,
        type: true,
        color: true
      }
    })

    // Calculate totals
    const totalExpenses = expenseCategoryData.reduce((sum, item) => sum + item.value, 0)
    const totalIncome = incomeCategoryData.reduce((sum, item) => sum + item.value, 0)
    const netWorth = accountBalances.reduce((sum, account) => sum + account.balance, 0)

    return NextResponse.json({
      period,
      summary: {
        totalExpenses,
        totalIncome,
        netIncome: totalIncome - totalExpenses,
        netWorth
      },
      expensesByCategory: expenseCategoryData,
      incomesByCategory: incomeCategoryData,
      monthlyTrends,
      accountBalances: accountBalances.map(account => ({
        name: account.name,
        balance: account.balance,
        type: account.type,
        color: account.color
      }))
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}