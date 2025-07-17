import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateBudgetAlertEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active budgets for all users
    const budgets = await prisma.budget.findMany({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const notifications = []

    for (const budget of budgets) {
      // Calculate current spending for this budget
      const currentSpending = await prisma.expense.aggregate({
        where: {
          userId: budget.userId,
          categoryId: budget.categoryId,
          date: {
            gte: budget.startDate,
            lte: budget.endDate
          }
        },
        _sum: {
          amount: true
        }
      })

      const spending = currentSpending._sum.amount || 0
      const percentUsed = budget.amount > 0 ? (spending / budget.amount) * 100 : 0

      // Check if notification should be sent (80% threshold or exceeded)
      const shouldNotify = percentUsed >= 80

      if (shouldNotify && budget.user.email) {
        // Check if we've already sent a notification for this budget recently
        const recentNotification = await prisma.$queryRaw<any[]>`
          SELECT * FROM budget_notifications 
          WHERE budget_id = ${budget.id} 
          AND created_at > datetime('now', '-1 day')
        `

        if (recentNotification.length === 0) {
          // Generate and send email
          const emailTemplate = generateBudgetAlertEmail(
            budget.user.name || 'User',
            {
              categoryName: budget.category.name,
              amount: budget.amount,
              currentSpending: spending,
              percentUsed: percentUsed,
              period: budget.period
            }
          )

          emailTemplate.to = budget.user.email

          const emailSent = await sendEmail(emailTemplate)

          if (emailSent) {
            // Record the notification (create table if it doesn't exist)
            await prisma.$executeRaw`
              CREATE TABLE IF NOT EXISTS budget_notifications (
                id TEXT PRIMARY KEY,
                budget_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `

            await prisma.$executeRaw`
              INSERT INTO budget_notifications (id, budget_id, user_id, sent_at)
              VALUES (${crypto.randomUUID()}, ${budget.id}, ${budget.userId}, ${new Date().toISOString()})
            `

            notifications.push({
              budgetId: budget.id,
              userId: budget.userId,
              categoryName: budget.category.name,
              percentUsed: percentUsed.toFixed(1),
              emailSent: true
            })
          }
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${budgets.length} budgets`,
      notificationsSent: notifications.length,
      notifications
    })
  } catch (error) {
    console.error('Error processing budget alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get budget alert status for current user
    const budgets = await prisma.budget.findMany({
      where: {
        userId: session.user.id,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    const budgetAlerts = await Promise.all(
      budgets.map(async (budget) => {
        const currentSpending = await prisma.expense.aggregate({
          where: {
            userId: budget.userId,
            categoryId: budget.categoryId,
            date: {
              gte: budget.startDate,
              lte: budget.endDate
            }
          },
          _sum: {
            amount: true
          }
        })

        const spending = currentSpending._sum.amount || 0
        const percentUsed = budget.amount > 0 ? (spending / budget.amount) * 100 : 0

        return {
          budgetId: budget.id,
          categoryName: budget.category.name,
          amount: budget.amount,
          currentSpending: spending,
          percentUsed: percentUsed,
          period: budget.period,
          alertLevel: percentUsed >= 100 ? 'exceeded' : percentUsed >= 80 ? 'warning' : 'normal'
        }
      })
    )

    return NextResponse.json({
      budgetAlerts,
      totalBudgets: budgets.length,
      alertsCount: budgetAlerts.filter(b => b.alertLevel !== 'normal').length
    })
  } catch (error) {
    console.error('Error fetching budget alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}