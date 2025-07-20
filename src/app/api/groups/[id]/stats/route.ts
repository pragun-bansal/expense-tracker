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

    const { id: groupId } = await params

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all group expenses with lenders and splits
    const expenses = await prisma.groupExpense.findMany({
      where: {
        groupId
      },
      include: {
        lenders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Get all group members
    const members = await prisma.groupMember.findMany({
      where: {
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Calculate group totals
    const totalGroupExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const totalExpenses = expenses.length

    // Calculate per-person statistics
    const memberStats: { [userId: string]: {
      user: { id: string; name: string; email: string }
      totalLent: number
      totalBorrowed: number
      totalExpenses: number
      netBalance: number
    }} = {}

    // Initialize member stats
    for (const member of members) {
      memberStats[member.user.id] = {
        user: member.user,
        totalLent: 0,
        totalBorrowed: 0,
        totalExpenses: 0,
        netBalance: 0
      }
    }

    // Calculate statistics from expenses
    for (const expense of expenses) {
      // Add lending amounts
      for (const lender of expense.lenders) {
        if (memberStats[lender.userId]) {
          memberStats[lender.userId].totalLent += lender.amount
          memberStats[lender.userId].totalExpenses++
        }
      }

      // Add borrowing amounts
      for (const split of expense.splits) {
        if (memberStats[split.userId]) {
          memberStats[split.userId].totalBorrowed += split.amount
        }
      }
    }

    // Calculate net balances (positive = owed money, negative = owes money)
    for (const userId in memberStats) {
      const stats = memberStats[userId]
      stats.netBalance = stats.totalLent - stats.totalBorrowed
    }

    // Convert to array format
    const memberStatsArray = Object.values(memberStats).sort((a, b) => 
      b.netBalance - a.netBalance // Sort by net balance descending
    )

    // Calculate group-wide statistics
    const groupStats = {
      totalAmount: totalGroupExpenses,
      totalExpenses: totalExpenses,
      averageExpense: totalExpenses > 0 ? totalGroupExpenses / totalExpenses : 0,
      totalMembers: members.length,
      memberStats: memberStatsArray,
      topLender: memberStatsArray.find(m => m.totalLent > 0),
      topBorrower: memberStatsArray.find(m => m.totalBorrowed > 0)
    }

    return NextResponse.json(groupStats)
  } catch (error) {
    console.error('Error fetching group stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}