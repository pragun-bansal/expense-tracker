import nodemailer from 'nodemailer'

// Email configuration
const transporter = nodemailer.createTransporter({
  // For production, use your email service provider
  // For development, you can use a service like Ethereal Email or Gmail
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
    pass: process.env.SMTP_PASS || 'ethereal.pass'
  }
})

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'ExpenseTracker <noreply@expensetracker.com>',
      to: template.to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })

    console.log('Email sent:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

export function generateBudgetAlertEmail(
  userName: string,
  budgetData: {
    categoryName: string
    amount: number
    currentSpending: number
    percentUsed: number
    period: string
  }
): EmailTemplate {
  const isExceeded = budgetData.percentUsed >= 100
  const isWarning = budgetData.percentUsed >= 80

  const subject = isExceeded
    ? `Budget Exceeded: ${budgetData.categoryName}`
    : `Budget Alert: ${budgetData.categoryName} (${budgetData.percentUsed.toFixed(1)}% used)`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${isExceeded ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .progress-bar { background-color: #e5e7eb; border-radius: 4px; overflow: hidden; height: 20px; margin: 10px 0; }
        .progress-fill { height: 100%; background-color: ${isExceeded ? '#dc2626' : isWarning ? '#f59e0b' : '#10b981'}; width: ${Math.min(budgetData.percentUsed, 100)}%; }
        .stats { display: flex; justify-content: space-between; margin: 20px 0; }
        .stat { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: ${isExceeded ? '#dc2626' : '#333'}; }
        .stat-label { font-size: 14px; color: #6b7280; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isExceeded ? '⚠️ Budget Exceeded!' : '📊 Budget Alert'}</h1>
          <p>Hello ${userName},</p>
          <p>Your ${budgetData.period.toLowerCase()} budget for <strong>${budgetData.categoryName}</strong> ${isExceeded ? 'has been exceeded' : 'is approaching its limit'}.</p>
        </div>
        
        <div class="content">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">$${budgetData.currentSpending.toFixed(2)}</div>
              <div class="stat-label">Current Spending</div>
            </div>
            <div class="stat">
              <div class="stat-value">$${budgetData.amount.toFixed(2)}</div>
              <div class="stat-label">Budget Limit</div>
            </div>
            <div class="stat">
              <div class="stat-value">${budgetData.percentUsed.toFixed(1)}%</div>
              <div class="stat-label">Used</div>
            </div>
          </div>
          
          <p><strong>Category:</strong> ${budgetData.categoryName}</p>
          <p><strong>Budget Period:</strong> ${budgetData.period}</p>
          <p><strong>Amount Remaining:</strong> $${Math.max(0, budgetData.amount - budgetData.currentSpending).toFixed(2)}</p>
          
          ${isExceeded 
            ? `<p style="color: #dc2626;"><strong>You have exceeded your budget by $${(budgetData.currentSpending - budgetData.amount).toFixed(2)}.</strong></p>`
            : `<p style="color: #f59e0b;"><strong>You have $${(budgetData.amount - budgetData.currentSpending).toFixed(2)} remaining in this budget.</strong></p>`
          }
          
          <p>Consider reviewing your spending in this category to stay within your budget goals.</p>
          
          <p style="margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budgets" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Budget Details
            </a>
          </p>
        </div>
        
        <div class="footer">
          <p>This is an automated message from your ExpenseTracker app. You can manage your notification preferences in your account settings.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
    Budget Alert: ${budgetData.categoryName}
    
    Hello ${userName},
    
    Your ${budgetData.period.toLowerCase()} budget for ${budgetData.categoryName} ${isExceeded ? 'has been exceeded' : 'is approaching its limit'}.
    
    Current Spending: $${budgetData.currentSpending.toFixed(2)}
    Budget Limit: $${budgetData.amount.toFixed(2)}
    Percentage Used: ${budgetData.percentUsed.toFixed(1)}%
    Amount Remaining: $${Math.max(0, budgetData.amount - budgetData.currentSpending).toFixed(2)}
    
    ${isExceeded 
      ? `You have exceeded your budget by $${(budgetData.currentSpending - budgetData.amount).toFixed(2)}.`
      : `You have $${(budgetData.amount - budgetData.currentSpending).toFixed(2)} remaining in this budget.`
    }
    
    Consider reviewing your spending in this category to stay within your budget goals.
    
    View your budget details at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budgets
  `

  return {
    to: '', // Will be set by the caller
    subject,
    html,
    text
  }
}