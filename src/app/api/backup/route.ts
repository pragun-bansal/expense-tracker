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

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    // Get all user data
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: true,
        categories: true,
        expenses: {
          include: {
            category: { select: { name: true } },
            account: { select: { name: true } }
          }
        },
        incomes: {
          include: {
            category: { select: { name: true } },
            account: { select: { name: true } }
          }
        },
        budgets: {
          include: {
            category: { select: { name: true } }
          }
        },
        recurringExpenses: {
          include: {
            category: { select: { name: true } },
            account: { select: { name: true } }
          }
        },
        groupMembers: {
          include: {
            group: {
              include: {
                expenses: {
                  include: {
                    paidBy: { select: { name: true } },
                    splits: {
                      include: {
                        user: { select: { name: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create backup object
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email
      },
      accounts: userData.accounts.map(account => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        color: account.color
      })),
      categories: userData.categories.map(category => ({
        id: category.id,
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon
      })),
      expenses: userData.expenses.map(expense => ({
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        receiptUrl: expense.receiptUrl,
        isRecurring: expense.isRecurring,
        category: expense.category.name,
        account: expense.account.name,
        createdAt: expense.createdAt
      })),
      incomes: userData.incomes.map(income => ({
        id: income.id,
        amount: income.amount,
        description: income.description,
        date: income.date,
        source: income.source,
        category: income.category.name,
        account: income.account.name,
        createdAt: income.createdAt
      })),
      budgets: userData.budgets.map(budget => ({
        id: budget.id,
        amount: budget.amount,
        spent: budget.spent,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        category: budget.category.name,
        createdAt: budget.createdAt
      })),
      recurringExpenses: userData.recurringExpenses.map(recurring => ({
        id: recurring.id,
        amount: recurring.amount,
        description: recurring.description,
        frequency: recurring.frequency,
        startDate: recurring.startDate,
        endDate: recurring.endDate,
        nextDueDate: recurring.nextDueDate,
        isActive: recurring.isActive,
        category: recurring.category.name,
        account: recurring.account.name,
        createdAt: recurring.createdAt
      })),
      groups: userData.groupMembers.map(member => ({
        id: member.group.id,
        name: member.group.name,
        description: member.group.description,
        role: member.role,
        expenses: member.group.expenses.map(expense => ({
          id: expense.id,
          amount: expense.amount,
          description: expense.description,
          date: expense.date,
          splitType: expense.splitType,
          paidBy: expense.paidBy.name,
          splits: expense.splits.map(split => ({
            user: split.user.name,
            amount: split.amount,
            settled: split.settled,
            settledAt: split.settledAt
          }))
        }))
      }))
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(backup, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="expense-tracker-backup-${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    }

    // CSV format for simplified data
    if (format === 'csv') {
      const csvData = [
        // Expenses CSV
        'Type,Date,Description,Amount,Category,Account',
        ...userData.expenses.map(expense => 
          `Expense,${expense.date.toISOString().split('T')[0]},${expense.description || ''},${expense.amount},${expense.category.name},${expense.account.name}`
        ),
        ...userData.incomes.map(income =>
          `Income,${income.date.toISOString().split('T')[0]},${income.description || ''},${income.amount},${income.category.name},${income.account.name}`
        )
      ].join('\n')

      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="expense-tracker-backup-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const backupData = await request.json()

    // Validate backup data structure
    if (!backupData.version || !backupData.user) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 })
    }

    // Check if the backup belongs to the current user
    if (backupData.user.id !== session.user.id) {
      return NextResponse.json({ error: 'Backup does not belong to current user' }, { status: 403 })
    }

    const results = {
      accounts: 0,
      categories: 0,
      expenses: 0,
      incomes: 0,
      budgets: 0,
      recurringExpenses: 0,
      errors: []
    }

    // Restore accounts
    if (backupData.accounts) {
      for (const account of backupData.accounts) {
        try {
          await prisma.account.upsert({
            where: { id: account.id },
            create: {
              id: account.id,
              name: account.name,
              type: account.type,
              balance: account.balance,
              color: account.color,
              userId: session.user.id
            },
            update: {
              name: account.name,
              type: account.type,
              balance: account.balance,
              color: account.color
            }
          })
          results.accounts++
        } catch (error) {
          results.errors.push(`Account ${account.name}: ${error}`)
        }
      }
    }

    // Restore categories
    if (backupData.categories) {
      for (const category of backupData.categories) {
        try {
          await prisma.category.upsert({
            where: { id: category.id },
            create: {
              id: category.id,
              name: category.name,
              type: category.type,
              color: category.color,
              icon: category.icon,
              userId: session.user.id
            },
            update: {
              name: category.name,
              type: category.type,
              color: category.color,
              icon: category.icon
            }
          })
          results.categories++
        } catch (error) {
          results.errors.push(`Category ${category.name}: ${error}`)
        }
      }
    }

    // Restore expenses
    if (backupData.expenses) {
      for (const expense of backupData.expenses) {
        try {
          // Find category and account IDs by name
          const category = await prisma.category.findFirst({
            where: { name: expense.category, userId: session.user.id, type: 'EXPENSE' }
          })
          const account = await prisma.account.findFirst({
            where: { name: expense.account, userId: session.user.id }
          })

          if (!category || !account) {
            results.errors.push(`Expense ${expense.description}: Category or Account not found`)
            continue
          }

          await prisma.expense.upsert({
            where: { id: expense.id },
            create: {
              id: expense.id,
              amount: expense.amount,
              description: expense.description,
              date: new Date(expense.date),
              receiptUrl: expense.receiptUrl,
              isRecurring: expense.isRecurring,
              userId: session.user.id,
              categoryId: category.id,
              accountId: account.id
            },
            update: {
              amount: expense.amount,
              description: expense.description,
              date: new Date(expense.date),
              receiptUrl: expense.receiptUrl,
              isRecurring: expense.isRecurring,
              categoryId: category.id,
              accountId: account.id
            }
          })
          results.expenses++
        } catch (error) {
          results.errors.push(`Expense ${expense.description}: ${error}`)
        }
      }
    }

    // Restore incomes
    if (backupData.incomes) {
      for (const income of backupData.incomes) {
        try {
          const category = await prisma.category.findFirst({
            where: { name: income.category, userId: session.user.id, type: 'INCOME' }
          })
          const account = await prisma.account.findFirst({
            where: { name: income.account, userId: session.user.id }
          })

          if (!category || !account) {
            results.errors.push(`Income ${income.description}: Category or Account not found`)
            continue
          }

          await prisma.income.upsert({
            where: { id: income.id },
            create: {
              id: income.id,
              amount: income.amount,
              description: income.description,
              date: new Date(income.date),
              source: income.source,
              userId: session.user.id,
              categoryId: category.id,
              accountId: account.id
            },
            update: {
              amount: income.amount,
              description: income.description,
              date: new Date(income.date),
              source: income.source,
              categoryId: category.id,
              accountId: account.id
            }
          })
          results.incomes++
        } catch (error) {
          results.errors.push(`Income ${income.description}: ${error}`)
        }
      }
    }

    return NextResponse.json({
      message: 'Backup restored successfully',
      results,
      totalRestored: results.accounts + results.categories + results.expenses + results.incomes + results.budgets + results.recurringExpenses
    })
  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}