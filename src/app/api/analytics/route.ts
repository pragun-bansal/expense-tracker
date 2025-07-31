import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Enable revalidation every 5 minutes for analytics data
export const revalidate = 300

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month' // week, month, quarter, year

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date
    const endDate = now

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
        break
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
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

    // Get monthly trends (last 12 months) - Optimized with single query
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    
    const [monthlyExpenses, monthlyIncomes] = await Promise.all([
      prisma.expense.groupBy({
        by: ['date'],
        where: {
          userId,
          date: {
            gte: twelveMonthsAgo,
            lte: endDate
          }
        },
        _sum: { amount: true }
      }),
      prisma.income.groupBy({
        by: ['date'],
        where: {
          userId,
          date: {
            gte: twelveMonthsAgo,
            lte: endDate
          }
        },
        _sum: { amount: true }
      })
    ])

    // Process monthly data into trends
    const monthlyTrends = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      
      const expenseSum = monthlyExpenses
        .filter(e => e.date >= date && e.date < nextMonth)
        .reduce((sum, e) => sum + (e._sum.amount || 0), 0)
      
      const incomeSum = monthlyIncomes
        .filter(i => i.date >= date && i.date < nextMonth)
        .reduce((sum, i) => sum + (i._sum.amount || 0), 0)

      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        expenses: expenseSum,
        income: incomeSum,
        net: incomeSum - expenseSum
      })
    }

    // Get weekly trends (last 8 weeks) - Optimized with single query
    const eightWeeksAgo = new Date(now.getTime() - 7 * 7 * 24 * 60 * 60 * 1000)
    
    const [weeklyExpenses, weeklyIncomes] = await Promise.all([
      prisma.expense.groupBy({
        by: ['date'],
        where: {
          userId,
          date: {
            gte: eightWeeksAgo,
            lte: endDate
          }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),
      prisma.income.groupBy({
        by: ['date'],
        where: {
          userId,
          date: {
            gte: eightWeeksAgo,
            lte: endDate
          }
        },
        _sum: { amount: true },
        _count: { id: true }
      })
    ])

    // Process weekly data into trends
    const weeklyTrends = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const expenseSum = weeklyExpenses
        .filter(e => e.date >= weekStart && e.date < weekEnd)
        .reduce((sum, e) => sum + (e._sum.amount || 0), 0)
      
      const incomeSum = weeklyIncomes
        .filter(i => i.date >= weekStart && i.date < weekEnd)
        .reduce((sum, i) => sum + (i._sum.amount || 0), 0)

      const expenseCount = weeklyExpenses
        .filter(e => e.date >= weekStart && e.date < weekEnd)
        .reduce((sum, e) => sum + (e._count.id || 0), 0)

      const incomeCount = weeklyIncomes
        .filter(i => i.date >= weekStart && i.date < weekEnd)
        .reduce((sum, i) => sum + (i._count.id || 0), 0)

      weeklyTrends.push({
        week: `Week ${8 - i}`,
        expenses: expenseSum,
        income: incomeSum,
        transactions: expenseCount + incomeCount
      })
    }

    // Get account balances - Optimized field selection
    const accountBalances = await prisma.userAccount.findMany({
      where: { userId },
      select: {
        name: true,
        balance: true,
        type: true,
        color: true
      }
    })

    // Get top expenses
    const topExpenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        category: true
      },
      orderBy: {
        amount: 'desc'
      },
      take: 10
    })

    // Get budget utilization - Optimized with single query
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      },
      include: {
        category: true
      }
    })

    // Get all spending data for budget categories in one query
    const budgetCategoryIds = budgets.map(b => b.categoryId)
    const budgetSpending = budgetCategoryIds.length > 0 ? await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        categoryId: { in: budgetCategoryIds },
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: { amount: true }
    }) : []

    const budgetUtilization = budgets.map((budget) => {
      const spending = budgetSpending.find(s => s.categoryId === budget.categoryId)
      const spent = spending?._sum.amount || 0

      return {
        category: budget.category.name,
        spent,
        budget: budget.amount,
        percentage: budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      }
    })

    // Get recurring expenses
    const recurringExpenses = await prisma.recurringExpense.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        description: true,
        amount: true,
        frequency: true,
        nextDueDate: true
      },
      orderBy: {
        nextDueDate: 'asc'
      },
      take: 10
    })

    // Calculate totals and growth
    const totalExpenses = expenseCategoryData.reduce((sum, item) => sum + item.value, 0)
    const totalIncome = incomeCategoryData.reduce((sum, item) => sum + item.value, 0)
    const netWorth = accountBalances.reduce((sum, account) => sum + account.balance, 0)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    // Calculate growth rates (compared to previous period)
    const [previousExpenses, previousIncome] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          userId,
          date: {
            gte: previousStartDate,
            lt: startDate
          }
        },
        _sum: { amount: true }
      }),
      prisma.income.aggregate({
        where: {
          userId,
          date: {
            gte: previousStartDate,
            lt: startDate
          }
        },
        _sum: { amount: true }
      })
    ])

    const previousExpenseTotal = previousExpenses._sum.amount || 0
    const previousIncomeTotal = previousIncome._sum.amount || 0

    const expenseGrowth = previousExpenseTotal > 0 
      ? ((totalExpenses - previousExpenseTotal) / previousExpenseTotal) * 100 
      : 0

    const incomeGrowth = previousIncomeTotal > 0 
      ? ((totalIncome - previousIncomeTotal) / previousIncomeTotal) * 100 
      : 0

    // Get transaction count - Optimized with single query
    const [expenseCount, incomeCount] = await Promise.all([
      prisma.expense.count({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }),
      prisma.income.count({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    ])

    const transactionCount = expenseCount + incomeCount

    const response = NextResponse.json({
      period,
      summary: {
        totalExpenses,
        totalIncome,
        netIncome: totalIncome - totalExpenses,
        netWorth,
        expenseGrowth,
        incomeGrowth,
        savingsRate,
        transactionCount
      },
      expensesByCategory: expenseCategoryData,
      incomesByCategory: incomeCategoryData,
      monthlyTrends,
      weeklyTrends,
      accountBalances,
      topExpenses: topExpenses.map(expense => ({
        description: expense.description || 'Expense',
        amount: expense.amount,
        category: expense.category.name,
        date: expense.date.toISOString()
      })),
      budgetUtilization,
      recurringExpenses: recurringExpenses.map(expense => ({
        name: expense.description || 'Recurring Expense',
        amount: expense.amount,
        frequency: expense.frequency,
        nextDue: expense.nextDueDate.toISOString()
      }))
    })

    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=300')
    response.headers.set('CDN-Cache-Control', 'public, max-age=600')
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=600')
    
    return response
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}