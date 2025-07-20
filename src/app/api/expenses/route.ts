import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrCreateOthersAccount } from '@/lib/specialAccounts'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const account = searchParams.get('account')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    const where: any = { userId: session.user.id }

    if (category) where.categoryId = category
    if (account) where.accountId = account
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: true,
          account: true,
          groupExpense: {
            include: {
              group: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.expense.count({ where })
    ])

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
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

    const { amount, description, categoryId, accountId, date, receiptUrl, isRecurring } = await request.json()

    if (!amount || !categoryId) {
      return NextResponse.json(
        { error: 'Amount and category are required' },
        { status: 400 }
      )
    }

    // Use Others account if no accountId provided
    const finalAccountId = accountId || (await getOrCreateOthersAccount(session.user.id)).id

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        description,
        categoryId,
        accountId: finalAccountId,
        date: date ? new Date(date) : new Date(),
        receiptUrl,
        isRecurring: isRecurring || false,
        userId: session.user.id
      },
      include: {
        category: true,
        account: true
      }
    })

    // Update account balance
    await prisma.account.update({
      where: { id: finalAccountId },
      data: {
        balance: {
          decrement: parseFloat(amount)
        }
      }
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      id,
      amount, 
      description, 
      categoryId, 
      accountId, 
      date, 
      receiptUrl 
    } = await request.json()

    if (!id || !amount || !categoryId || !accountId) {
      return NextResponse.json(
        { error: 'ID, amount, category, and account are required' },
        { status: 400 }
      )
    }

    // Get the current expense to calculate balance difference
    const currentExpense = await prisma.expense.findUnique({
      where: { 
        id,
        userId: session.user.id // Ensure user owns this expense
      }
    })

    if (!currentExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Check if it's a group transaction (cannot edit)
    if (currentExpense.groupExpenseId) {
      return NextResponse.json(
        { error: 'Cannot edit group transactions. Please edit from the group page.' },
        { status: 400 }
      )
    }

    const oldAmount = currentExpense.amount
    const oldAccountId = currentExpense.accountId
    const newAmount = parseFloat(amount)

    // Update the expense
    const expense = await prisma.expense.update({
      where: { id },
      data: {
        amount: newAmount,
        description,
        categoryId,
        accountId,
        date: date ? new Date(date) : currentExpense.date,
        receiptUrl,
        updatedAt: new Date()
      },
      include: {
        category: true,
        account: true
      }
    })

    // Update account balances
    if (oldAccountId === accountId) {
      // Same account - adjust balance by difference
      const difference = newAmount - oldAmount
      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: difference
          }
        }
      })
    } else {
      // Different accounts - revert old account and deduct from new account
      await prisma.account.update({
        where: { id: oldAccountId },
        data: {
          balance: {
            increment: oldAmount // Add back old amount
          }
        }
      })

      await prisma.account.update({
        where: { id: accountId },
        data: {
          balance: {
            decrement: newAmount // Deduct new amount
          }
        }
      })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}