import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all budgets with wrong dates (future dates)
    const now = new Date()
    const wrongBudgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        startDate: {
          gt: now // Budget start date is in the future
        }
      }
    })

    console.log(`Found ${wrongBudgets.length} budgets with wrong dates`)

    // Fix each budget's dates
    const fixedBudgets = []
    for (const budget of wrongBudgets) {
      let startDate: Date
      let endDate: Date

      switch (budget.period) {
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
          continue // Skip unknown periods
      }

      console.log(`Fixing budget ${budget.id} from ${budget.startDate} to ${startDate}`)

      const updatedBudget = await prisma.budget.update({
        where: { id: budget.id },
        data: {
          startDate,
          endDate
        }
      })

      fixedBudgets.push(updatedBudget)
    }

    return NextResponse.json({
      message: `Fixed ${fixedBudgets.length} budgets with wrong dates`,
      fixedBudgets: fixedBudgets.map(b => ({
        id: b.id,
        period: b.period,
        oldStartDate: wrongBudgets.find(wb => wb.id === b.id)?.startDate,
        newStartDate: b.startDate,
        newEndDate: b.endDate
      }))
    })
  } catch (error) {
    console.error('Error fixing budget dates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}