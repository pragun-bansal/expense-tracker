import { prisma } from './prisma'
import { sendEmail, generateBudgetAlertEmail } from './email'
import { createBudgetAlert } from './notifications'

export interface BudgetCheckResult {
  budgetId: string
  categoryName: string
  percentUsed: number
  alertSent: boolean
  reason?: string
}

export async function checkBudgetAlert(userId: string, categoryId: string): Promise<BudgetCheckResult | null> {
  try {
    // Find active budget for this user and category
    const budget = await prisma.budget.findFirst({
      where: {
        userId,
        categoryId,
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

    if (!budget) {
      return null // No active budget for this category
    }

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

    console.log(`Budget check for ${budget.category.name}: ${percentUsed.toFixed(1)}% used (${spending}/${budget.amount})`)

    const result: BudgetCheckResult = {
      budgetId: budget.id,
      categoryName: budget.category.name,
      percentUsed,
      alertSent: false
    }

    // Check if notification should be sent (80% threshold or exceeded)
    if (percentUsed >= 80 && budget.user.email) {
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

      if (recentNotification) {
        result.reason = 'Notification already sent within 24 hours'
        return result
      }

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

      console.log(`🚨 Budget Alert: ${budget.category.name} at ${percentUsed.toFixed(1)}% - sending notifications`)
      
      // Create in-app notification
      await createBudgetAlert(budget.userId, budget.categoryId, budget.category.name, percentUsed, percentUsed >= 100)
      
      // Send email notification
      const emailSent = await sendEmail(emailTemplate)

      if (emailSent || true) { // Always record notification even if email fails
        // Record the notification
        await prisma.budgetNotification.create({
          data: {
            budgetId: budget.id,
            userId: budget.userId,
            sentAt: new Date()
          }
        })

        result.alertSent = true
        result.reason = emailSent 
          ? 'Email and in-app notifications sent successfully'
          : 'In-app notification sent successfully (email failed)'
        
        console.log(`✅ Budget alert notifications sent for ${budget.category.name}`)
      } else {
        result.reason = 'Failed to send notifications'
        console.log(`❌ Failed to send budget alert notifications for ${budget.category.name}`)
      }
    } else if (percentUsed < 80) {
      result.reason = 'Budget usage below 80% threshold'
    } else if (!budget.user.email) {
      result.reason = 'User has no email address'
    }

    return result
  } catch (error) {
    console.error('Error checking budget alert:', error)
    return null
  }
}

export async function checkAllBudgetAlerts(userId: string): Promise<BudgetCheckResult[]> {
  try {
    // Get all active budgets for the user
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
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

    const results: BudgetCheckResult[] = []

    for (const budget of budgets) {
      const result = await checkBudgetAlert(userId, budget.categoryId)
      if (result) {
        results.push(result)
      }
    }

    return results
  } catch (error) {
    console.error('Error checking all budget alerts:', error)
    return []
  }
}