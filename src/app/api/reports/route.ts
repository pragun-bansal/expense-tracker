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

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'summary'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const format = searchParams.get('format') || 'json'

    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate && { lte: new Date(endDate) })
    }

    let reportData: any = {}

    switch (reportType) {
      case 'summary':
        reportData = await generateSummaryReport(session.user.id, dateFilter)
        break
      case 'detailed':
        reportData = await generateDetailedReport(session.user.id, dateFilter)
        break
      case 'category':
        reportData = await generateCategoryReport(session.user.id, dateFilter)
        break
      case 'budget':
        reportData = await generateBudgetReport(session.user.id, dateFilter)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    if (format === 'csv') {
      const csv = generateCSV(reportData, reportType)
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateSummaryReport(userId: string, dateFilter: any) {
  const [expenses, income, accounts, budgets] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      include: {
        category: true,
        account: true
      }
    }),
    prisma.income.findMany({
      where: {
        userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      include: {
        category: true,
        account: true
      }
    }),
    prisma.userAccount.findMany({
      where: { userId }
    }),
    prisma.budget.findMany({
      where: { userId },
      include: { category: true }
    })
  ])

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0)
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  const expensesByCategory = expenses.reduce((acc, expense) => {
    const categoryName = expense.category.name
    acc[categoryName] = (acc[categoryName] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const incomeByCategory = income.reduce((acc, inc) => {
    const categoryName = inc.category.name
    acc[categoryName] = (acc[categoryName] || 0) + inc.amount
    return acc
  }, {} as Record<string, number>)

  // Calculate actual spending for each budget based on current period dates
  const budgetStatus = await Promise.all(budgets.map(async (budget) => {
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

    const budgetExpenses = await prisma.expense.aggregate({
      where: {
        userId: budget.userId,
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

    const actualSpent = budgetExpenses._sum.amount || 0
    const remaining = budget.amount - actualSpent
    const percentageUsed = budget.amount > 0 ? (actualSpent / budget.amount) * 100 : 0

    return {
      category: budget.category.name,
      budgetAmount: budget.amount,
      spent: actualSpent,
      remaining: remaining,
      percentageUsed: percentageUsed.toFixed(1)
    }
  }))

  return {
    summary: {
      totalExpenses,
      totalIncome,
      netAmount: totalIncome - totalExpenses,
      totalBalance,
      transactionCount: expenses.length + income.length
    },
    expensesByCategory,
    incomeByCategory,
    budgetStatus
  }
}

async function generateDetailedReport(userId: string, dateFilter: any) {
  const [expenses, income] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      include: {
        category: true,
        account: true
      },
      orderBy: { date: 'desc' }
    }),
    prisma.income.findMany({
      where: {
        userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      include: {
        category: true,
        account: true
      },
      orderBy: { date: 'desc' }
    })
  ])

  const transactions = [
    ...expenses.map(expense => ({
      ...expense,
      type: 'expense' as const,
      amount: -expense.amount // Negative for expenses
    })),
    ...income.map(inc => ({
      ...inc,
      type: 'income' as const
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    transactions,
    totals: {
      totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      totalIncome: income.reduce((sum, inc) => sum + inc.amount, 0),
      transactionCount: transactions.length
    }
  }
}

async function generateCategoryReport(userId: string, dateFilter: any) {
  const [expenses, income, categories] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      include: { category: true }
    }),
    prisma.income.findMany({
      where: {
        userId,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      include: { category: true }
    }),
    prisma.category.findMany({
      where: { userId }
    })
  ])

  const categoryData = categories.map(category => {
    const categoryExpenses = expenses.filter(expense => expense.categoryId === category.id)
    const categoryIncome = income.filter(inc => inc.categoryId === category.id)
    
    const totalExpenses = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalIncome = categoryIncome.reduce((sum, inc) => sum + inc.amount, 0)
    const transactionCount = categoryExpenses.length + categoryIncome.length

    return {
      category: category.name,
      type: category.type,
      totalExpenses,
      totalIncome,
      netAmount: totalIncome - totalExpenses,
      transactionCount,
      averageTransaction: transactionCount > 0 ? ((totalExpenses + totalIncome) / transactionCount) : 0
    }
  })

  return {
    categoryBreakdown: categoryData,
    summary: {
      totalCategories: categories.length,
      mostExpensiveCategory: categoryData.reduce((max, cat) => cat.totalExpenses > max.totalExpenses ? cat : max, categoryData[0]),
      mostProfitableCategory: categoryData.reduce((max, cat) => cat.totalIncome > max.totalIncome ? cat : max, categoryData[0])
    }
  }
}

async function generateBudgetReport(userId: string, dateFilter: any) {
  const budgets = await prisma.budget.findMany({
    where: { userId },
    include: { category: true }
  })

  const budgetAnalysis = await Promise.all(budgets.map(async (budget) => {
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

    // Calculate actual spending for this budget based on current period dates
    const budgetExpenses = await prisma.expense.aggregate({
      where: {
        userId: budget.userId,
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

    const actualSpent = budgetExpenses._sum.amount || 0
    const percentageUsed = budget.amount > 0 ? (actualSpent / budget.amount) * 100 : 0
    const remaining = budget.amount - actualSpent
    const daysInPeriod = budget.period === 'MONTHLY' ? 30 : budget.period === 'WEEKLY' ? 7 : 365
    const dailyBudget = budget.amount / daysInPeriod
    const dailySpent = actualSpent / daysInPeriod

    return {
      category: budget.category.name,
      budgetAmount: budget.amount,
      spent: actualSpent,
      remaining,
      percentageUsed: percentageUsed.toFixed(1),
      status: percentageUsed >= 100 ? 'over' : percentageUsed >= 80 ? 'warning' : 'good',
      period: budget.period,
      dailyBudget,
      dailySpent,
      startDate: currentStartDate,
      endDate: currentEndDate
    }
  }))

  const totalActualSpent = budgetAnalysis.reduce((sum, budget) => sum + budget.spent, 0)

  return {
    budgets: budgetAnalysis,
    summary: {
      totalBudgets: budgets.length,
      totalBudgetAmount: budgets.reduce((sum, budget) => sum + budget.amount, 0),
      totalSpent: totalActualSpent,
      overBudgetCount: budgetAnalysis.filter(budget => budget.status === 'over').length,
      warningCount: budgetAnalysis.filter(budget => budget.status === 'warning').length
    }
  }
}

function generateCSV(data: any, reportType: string): string {
  let csvContent = ''

  switch (reportType) {
    case 'summary':
      csvContent = [
        ['Metric', 'Value'],
        ['Total Expenses', data.summary.totalExpenses],
        ['Total Income', data.summary.totalIncome],
        ['Net Amount', data.summary.netAmount],
        ['Total Balance', data.summary.totalBalance],
        ['Transaction Count', data.summary.transactionCount],
        [''],
        ['Expenses by Category'],
        ['Category', 'Amount'],
        ...Object.entries(data.expensesByCategory).map(([category, amount]) => [category, amount]),
        [''],
        ['Income by Category'],
        ['Category', 'Amount'],
        ...Object.entries(data.incomeByCategory).map(([category, amount]) => [category, amount])
      ].map(row => row.join(',')).join('\n')
      break

    case 'detailed':
      csvContent = [
        ['Date', 'Type', 'Description', 'Category', 'Account', 'Amount'],
        ...data.transactions.map((transaction: any) => [
          new Date(transaction.date).toLocaleDateString(),
          transaction.type,
          transaction.description || '',
          transaction.category.name,
          transaction.account.name,
          transaction.amount
        ])
      ].map(row => row.join(',')).join('\n')
      break

    case 'category':
      csvContent = [
        ['Category', 'Type', 'Total Expenses', 'Total Income', 'Net Amount', 'Transaction Count', 'Average Transaction'],
        ...data.categoryBreakdown.map((category: any) => [
          category.category,
          category.type,
          category.totalExpenses,
          category.totalIncome,
          category.netAmount,
          category.transactionCount,
          category.averageTransaction.toFixed(2)
        ])
      ].map(row => row.join(',')).join('\n')
      break

    case 'budget':
      csvContent = [
        ['Category', 'Budget Amount', 'Spent', 'Remaining', 'Percentage Used', 'Status', 'Period'],
        ...data.budgets.map((budget: any) => [
          budget.category,
          budget.budgetAmount,
          budget.spent,
          budget.remaining,
          budget.percentageUsed + '%',
          budget.status,
          budget.period
        ])
      ].map(row => row.join(',')).join('\n')
      break

    default:
      csvContent = 'No data available'
  }

  return csvContent
}