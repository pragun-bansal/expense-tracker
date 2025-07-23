import nodemailer from 'nodemailer'

// Email configuration
const transporter = nodemailer.createTransport({
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
          line-height: 1.6; 
          color: #374151; 
          margin: 0; 
          padding: 0; 
          background-color: #f9fafb; 
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          background-color: white; 
          border-radius: 12px; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
          overflow: hidden; 
        }
        .header { 
          background: linear-gradient(135deg, ${isExceeded ? '#dc2626' : '#f59e0b'}, ${isExceeded ? '#b91c1c' : '#d97706'}); 
          color: white; 
          padding: 40px 30px; 
          text-align: center; 
        }
        .header h1 { 
          margin: 0 0 16px 0; 
          font-size: 28px; 
          font-weight: 700; 
        }
        .header p { 
          margin: 8px 0; 
          font-size: 16px; 
          opacity: 0.95; 
        }
        .content { 
          padding: 40px 30px; 
        }
        .progress-container {
          margin: 30px 0;
          text-align: center;
        }
        .progress-bar { 
          background-color: #f3f4f6; 
          border-radius: 12px; 
          overflow: hidden; 
          height: 12px; 
          margin: 16px 0; 
          position: relative;
        }
        .progress-fill { 
          height: 100%; 
          background: linear-gradient(90deg, ${isExceeded ? '#dc2626' : isWarning ? '#f59e0b' : '#10b981'}, ${isExceeded ? '#b91c1c' : isWarning ? '#d97706' : '#059669'}); 
          width: ${Math.min(budgetData.percentUsed, 100)}%; 
          transition: width 0.3s ease;
        }
        .percentage {
          font-size: 24px;
          font-weight: 700;
          color: ${isExceeded ? '#dc2626' : '#374151'};
          margin-top: 12px;
        }
        .stats { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 30px; 
          margin: 40px 0; 
          padding: 30px; 
          background-color: #f9fafb; 
          border-radius: 12px; 
        }
        .stat { 
          text-align: center; 
        }
        .stat-value { 
          font-size: 20px; 
          font-weight: 700; 
          color: #111827; 
          margin-bottom: 4px;
        }
        .stat-label { 
          font-size: 14px; 
          color: #6b7280; 
          font-weight: 500;
        }
        .summary {
          padding: 24px;
          background-color: ${isExceeded ? '#fef2f2' : '#fffbeb'};
          border-left: 4px solid ${isExceeded ? '#dc2626' : '#f59e0b'};
          border-radius: 8px;
          margin: 30px 0;
        }
        .summary-text {
          font-size: 16px;
          font-weight: 600;
          color: ${isExceeded ? '#dc2626' : '#d97706'};
          margin: 0;
        }
        .cta {
          text-align: center;
          margin: 40px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          padding: 14px 32px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          transition: transform 0.2s ease;
        }
        .cta-button:hover {
          transform: translateY(-1px);
        }
        .footer { 
          margin-top: 40px; 
          padding-top: 30px; 
          border-top: 1px solid #e5e7eb; 
          font-size: 14px; 
          color: #6b7280; 
          text-align: center;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isExceeded ? '⚠️ Budget Exceeded' : '📊 Budget Alert'}</h1>
          <p>Hello ${userName}!</p>
          <p>Your <strong>${budgetData.categoryName}</strong> budget ${isExceeded ? 'has been exceeded' : 'needs attention'}</p>
        </div>
        
        <div class="content">
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill"></div>
            </div>
            <div class="percentage">${budgetData.percentUsed.toFixed(1)}% used</div>
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
          </div>
          
          <div class="summary">
            <p class="summary-text">
              ${isExceeded 
                ? `You've exceeded your budget by $${(budgetData.currentSpending - budgetData.amount).toFixed(2)}`
                : `You have $${(budgetData.amount - budgetData.currentSpending).toFixed(2)} remaining in this budget`
              }
            </p>
          </div>
          
          <div class="cta">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/budgets" class="cta-button">
              View Budget Details
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p>ExpenseTracker • Budget Monitoring</p>
          <p>You can manage your notification preferences in your account settings</p>
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