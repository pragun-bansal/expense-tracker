import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Enable revalidation every 5 minutes for dashboard stats
export const revalidate = 300

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get current month start and end
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Fetch stats with optimized queries
    const [
      totalExpenses, 
      monthlyExpenses, 
      totalIncome,
      monthlyIncome,
      totalAccounts, 
      activeGroups,
      expenseCount,
      incomeCount,
      recentExpenses
    ] = await Promise.all([
      prisma.expense.aggregate({
        where: { userId },
        _sum: { amount: true }
      }),
      prisma.expense.aggregate({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _sum: { amount: true }
      }),
      prisma.income.aggregate({
        where: { userId },
        _sum: { amount: true }
      }),
      prisma.income.aggregate({
        where: {
          userId,
          date: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _sum: { amount: true }
      }),
      prisma.userAccount.count({
        where: { userId }
      }),
      prisma.groupMember.count({
        where: { userId }
      }),
      prisma.expense.count({
        where: { userId }
      }),
      prisma.income.count({
        where: { userId }
      }),
      prisma.expense.findMany({
        where: { userId },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 5
      })
    ])

    const transactionCount = expenseCount + incomeCount

    const netWorth = await prisma.userAccount.aggregate({
      where: { userId },
      _sum: { balance: true }
    })

    const response = NextResponse.json({
      totalExpenses: totalExpenses._sum.amount || 0,
      monthlyExpenses: monthlyExpenses._sum.amount || 0,
      totalIncome: totalIncome._sum.amount || 0,
      monthlyIncome: monthlyIncome._sum.amount || 0,
      netWorth: netWorth._sum.balance || 0,
      totalAccounts,
      activeGroups,
      transactionCount,
      recentExpenses: recentExpenses.map(expense => ({
        id: expense.id,
        description: expense.description || 'Expense',
        amount: expense.amount,
        date: expense.date.toISOString(),
        category: { name: expense.category.name }
      })),
      recentIncome: [] // Add if needed
    })

    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=300')
    response.headers.set('CDN-Cache-Control', 'public, max-age=600')
    
    return response
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}