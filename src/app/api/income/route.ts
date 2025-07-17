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

    const [incomes, total] = await Promise.all([
      prisma.income.findMany({
        where,
        include: {
          category: true,
          account: true
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.income.count({ where })
    ])

    return NextResponse.json({
      incomes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching incomes:', error)
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

    const { amount, description, categoryId, accountId, date, source } = await request.json()

    if (!amount || !categoryId || !accountId) {
      return NextResponse.json(
        { error: 'Amount, category, and account are required' },
        { status: 400 }
      )
    }

    const income = await prisma.income.create({
      data: {
        amount: parseFloat(amount),
        description,
        categoryId,
        accountId,
        date: date ? new Date(date) : new Date(),
        source,
        userId: session.user.id
      },
      include: {
        category: true,
        account: true
      }
    })

    // Update account balance
    await prisma.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: parseFloat(amount)
        }
      }
    })

    return NextResponse.json(income)
  } catch (error) {
    console.error('Error creating income:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}