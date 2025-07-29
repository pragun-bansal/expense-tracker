import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { createDefaultAccounts } from '@/lib/userSetup'

async function seedDefaultData(userId: string) {
  // Create expense categories
  const expenseCategories = [
    { name: 'Food & Dining', color: '#FF6B6B', icon: '🍕', type: 'EXPENSE' },
    { name: 'Transportation', color: '#4ECDC4', icon: '🚗', type: 'EXPENSE' },
    { name: 'Shopping', color: '#45B7D1', icon: '🛒', type: 'EXPENSE' },
    { name: 'Entertainment', color: '#96CEB4', icon: '🎬', type: 'EXPENSE' },
    { name: 'Bills & Utilities', color: '#FFEAA7', icon: '💡', type: 'EXPENSE' },
    { name: 'Healthcare', color: '#DDA0DD', icon: '🏥', type: 'EXPENSE' },
    { name: 'Travel', color: '#98D8C8', icon: '✈️', type: 'EXPENSE' },
    { name: 'Education', color: '#A29BFE', icon: '📚', type: 'EXPENSE' },
    { name: 'Personal Care', color: '#FD79A8', icon: '💄', type: 'EXPENSE' },
    { name: 'Other', color: '#B2BEC3', icon: '📋', type: 'EXPENSE' }
  ];

  // Create income categories
  const incomeCategories = [
    { name: 'Salary', color: '#00B894', icon: '💼', type: 'INCOME' },
    { name: 'Freelance', color: '#0984E3', icon: '💻', type: 'INCOME' },
    { name: 'Investment', color: '#6C5CE7', icon: '📈', type: 'INCOME' },
    { name: 'Gift', color: '#FD79A8', icon: '🎁', type: 'INCOME' },
    { name: 'Other', color: '#B2BEC3', icon: '📋', type: 'INCOME' }
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

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    })

    // Seed default categories and accounts for new user
    await createDefaultAccounts(user.id)

    return NextResponse.json({
      message: 'User created successfully',
      user: { id: user.id, email: user.email, name: user.name }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}