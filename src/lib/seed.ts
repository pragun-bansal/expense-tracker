import { prisma } from './prisma'

export async function seedUserData(userId: string) {
  // Create default expense categories
  const expenseCategories = [
    { name: 'Food & Dining', color: '#EF4444', icon: '🍕' },
    { name: 'Transportation', color: '#3B82F6', icon: '🚗' },
    { name: 'Shopping', color: '#8B5CF6', icon: '🛒' },
    { name: 'Entertainment', color: '#06B6D4', icon: '🎬' },
    { name: 'Bills & Utilities', color: '#F59E0B', icon: '💡' },
    { name: 'Healthcare', color: '#EF4444', icon: '🏥' },
    { name: 'Education', color: '#10B981', icon: '📚' },
    { name: 'Travel', color: '#F59E0B', icon: '✈️' },
    { name: 'Other', color: '#6B7280', icon: '📝' }
  ]

  // Create default income categories
  const incomeCategories = [
    { name: 'Salary', color: '#10B981', icon: '💼' },
    { name: 'Freelance', color: '#3B82F6', icon: '💻' },
    { name: 'Business', color: '#8B5CF6', icon: '🏢' },
    { name: 'Investment', color: '#06B6D4', icon: '📈' },
    { name: 'Gift', color: '#F59E0B', icon: '🎁' },
    { name: 'Other', color: '#6B7280', icon: '💰' }
  ]

  // Create expense categories
  await Promise.all(
    expenseCategories.map(category =>
      prisma.category.create({
        data: {
          ...category,
          type: 'EXPENSE',
          userId
        }
      })
    )
  )

  // Create income categories
  await Promise.all(
    incomeCategories.map(category =>
      prisma.category.create({
        data: {
          ...category,
          type: 'INCOME',
          userId
        }
      })
    )
  )

  // Create default accounts
  const defaultAccounts = [
    { name: 'Cash', type: 'CASH', balance: 0, color: '#10B981' },
    { name: 'Checking Account', type: 'BANK', balance: 0, color: '#3B82F6' },
    { name: 'Savings Account', type: 'BANK', balance: 0, color: '#8B5CF6' },
    { name: 'Credit Card', type: 'CREDIT_CARD', balance: 0, color: '#EF4444' }
  ]

  await Promise.all(
    defaultAccounts.map(account =>
      prisma.account.create({
        data: {
          ...account,
          userId
        }
      })
    )
  )
}