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

      // Debug logging
      console.log(`Budget Debug - ${budget.category.name}:`, {
        budgetAmount: budget.amount,
        currentSpending: spending,
        percentUsed: percentUsed.toFixed(1),
        userEmail: budget.user.email,
        dateRange: { start: budget.startDate, end: budget.endDate }
      })

      // Check if notification should be sent (80% threshold or exceeded)
      const shouldNotify = percentUsed >= 80

      if (shouldNotify && budget.user.email) {
        console.log(`Budget ${budget.category.name} needs notification - ${percentUsed.toFixed(1)}% used`)
        
        // Check if we've already sent a notification for this budget recently
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const recentNotification = await prisma.budgetNotification.findFirst({
          where: {
            budgetId: budget.id,
            userId: budget.userId,
            createdAt: {
              gte: oneDayAgo
            }
          }
        })

        console.log(`Recent notification check:`, recentNotification ? 'Found recent notification' : 'No recent notification')

        if (!recentNotification) {
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

          console.log(`Attempting to send email to: ${budget.user.email}`)
          const emailSent = await sendEmail(emailTemplate)
          console.log(`Email send result: ${emailSent}`)

          if (emailSent) {
            // Record the notification
            await prisma.budgetNotification.create({
              data: {
                budgetId: budget.id,
                userId: budget.userId,
                sentAt: new Date()
              }
            })

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