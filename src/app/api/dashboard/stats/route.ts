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

    // Get current month start and end
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Fetch stats
    const [totalExpenses, monthlyExpenses, totalAccounts, activeGroups] = await Promise.all([
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
      prisma.userAccount.count({
        where: { userId }
      }),
      prisma.groupMember.count({
        where: { userId }
      })
    ])

    return NextResponse.json({
      totalExpenses: totalExpenses._sum.amount || 0,
      monthlyExpenses: monthlyExpenses._sum.amount || 0,
      totalAccounts,
      activeGroups
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}