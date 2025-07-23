import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateBudgetAlertEmail } from '@/lib/email'

export async function GET() {
  try {
    console.log('=== Budget Alert Test Started ===')
    
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

    console.log(`Found ${budgets.length} active budgets`)

    const results = []

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

      const budgetInfo = {
        categoryName: budget.category.name,
        userName: budget.user.name,
        userEmail: budget.user.email,
        budgetAmount: budget.amount,
        currentSpending: spending,
        percentUsed: percentUsed.toFixed(1),
        dateRange: { start: budget.startDate, end: budget.endDate },
        shouldNotify: percentUsed >= 80,
        hasEmail: !!budget.user.email
      }

      console.log(`Budget: ${budgetInfo.categoryName}`, budgetInfo)
      results.push(budgetInfo)
    }

    return NextResponse.json({
      message: `Tested ${budgets.length} budgets`,
      results,
      debugInfo: {
        currentDate: new Date(),
        emailConfig: {
          smtpHost: process.env.SMTP_HOST,
          smtpUser: process.env.SMTP_USER,
          fromEmail: process.env.FROM_EMAIL,
          hasSmtpPass: !!process.env.SMTP_PASS
        }
      }
    })
  } catch (error) {
    console.error('Error in budget alert test:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    console.log('=== Sending Test Email ===')
    
    // Send a test email
    const testEmail = {
      to: process.env.SMTP_USER || 'test@example.com',
      subject: 'Test Email from ExpenseTracker',
      html: '<h1>Test Email</h1><p>This is a test email to verify email configuration.</p>',
      text: 'Test Email - This is a test email to verify email configuration.'
    }

    const emailSent = await sendEmail(testEmail)
    
    return NextResponse.json({
      message: 'Test email sent',
      success: emailSent,
      emailConfig: {
        to: testEmail.to,
        smtpHost: process.env.SMTP_HOST,
        smtpUser: process.env.SMTP_USER,
        fromEmail: process.env.FROM_EMAIL,
        hasSmtpPass: !!process.env.SMTP_PASS
      }
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Failed to send test email', details: error.message },
      { status: 500 }
    )
  }
}