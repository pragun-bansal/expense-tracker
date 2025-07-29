import { prisma } from './prisma'
import { ensureSpecialAccountsExist } from './specialAccounts'

export async function createDefaultAccounts(userId: string) {
  // Create default categories
  const expenseCategories = [
    { name: 'Food & Drinks', type: 'EXPENSE', color: '#FF6B6B', icon: '🍕' },
    { name: 'Shopping', type: 'EXPENSE', color: '#4ECDC4', icon: '🛒' },
    { name: 'Housing', type: 'EXPENSE', color: '#45B7D1', icon: '🏠' },
    { name: 'Transportation', type: 'EXPENSE', color: '#96CEB4', icon: '🚗' },
    { name: 'Vehicle', type: 'EXPENSE', color: '#FECA57', icon: '⛽' },
    { name: 'Life & Entertainment', type: 'EXPENSE', color: '#FF9FF3', icon: '🎭' },
    { name: 'Communication & PC', type: 'EXPENSE', color: '#54A0FF', icon: '📱' },
    { name: 'Financial expenses', type: 'EXPENSE', color: '#5F27CD', icon: '💳' },
    { name: 'Investments', type: 'EXPENSE', color: '#00D2D3', icon: '📈' },
    { name: 'Income', type: 'EXPENSE', color: '#FF6348', icon: '💼' },
    { name: 'Others', type: 'EXPENSE', color: '#C4C4C4', icon: '📦' }
  ];

  const incomeCategories = [
    { name: 'Salary', type: 'INCOME', color: '#00D2D3', icon: '💰' },
    { name: 'Business', type: 'INCOME', color: '#FF6348', icon: '💼' },
    { name: 'Investments', type: 'INCOME', color: '#5F27CD', icon: '📈' },
    { name: 'Extra income', type: 'INCOME', color: '#FFA502', icon: '💸' },
    { name: 'Loans', type: 'INCOME', color: '#FF6B6B', icon: '🏦' },
    { name: 'Others', type: 'INCOME', color: '#C4C4C4', icon: '📦' }
  ];

  const allCategories = [...expenseCategories, ...incomeCategories];

  for (const category of allCategories) {
    await prisma.category.create({
      data: {
        ...category,
        userId
      }
    });
  }

  // Create accounts
  const accounts = [
    { name: 'Checking Account', type: 'BANK', balance: 0.00, color: '#4ECDC4', userId },
    { name: 'Savings Account', type: 'BANK', balance: 0.00, color: '#45B7D1', userId },
    { name: 'Credit Card', type: 'CREDIT_CARD', balance: 0.00, color: '#FF6B6B', userId },
    { name: 'Cash', type: 'CASH', balance: 0.00, color: '#96CEB4', userId }
  ];

  for (const account of accounts) {
    await prisma.userAccount.create({
      data: account
    });
  }

  // Create special accounts
  await ensureSpecialAccountsExist(userId)
}