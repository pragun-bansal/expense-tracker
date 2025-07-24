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
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const account = searchParams.get('account')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Base where clause
    const baseWhere = { userId: session.user.id }
    
    // Add date filter if provided
    const dateFilter: any = {}
    if (startDate && endDate) {
      dateFilter.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    // Add category filter
    const categoryFilter = category ? { categoryId: category } : {}
    
    // Add account filter
    const accountFilter = account ? { accountId: account } : {}

    // Combine filters
    const whereClause = {
      ...baseWhere,
      ...dateFilter,
      ...categoryFilter,
      ...accountFilter
    }

    let transactions: any[] = []

    if (!type || type === 'income') {
      // Fetch income transactions
      const incomes = await prisma.income.findMany({
        where: whereClause,
        include: {
          category: true,
          account: true
        },
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
        ...(type === 'income' ? { skip, take: limit } : {})
      })

      transactions.push(...incomes.map(income => ({
        ...income,
        type: 'income' as const
      })))
    }

    if (!type || type === 'expense') {
      // Fetch expense transactions
      const expenses = await prisma.expense.findMany({
        where: whereClause,
        include: {
          category: true,
          account: true,
          groupExpense: {
            include: {
              group: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
        ...(type === 'expense' ? { skip, take: limit } : {})
      })

      transactions.push(...expenses.map(expense => ({
        ...expense,
        type: 'expense' as const
      })))
    }

    // If no type filter, we need to sort and paginate the combined results
    if (!type) {
      transactions.sort((a, b) => {
        const aValue = a[sortBy]
        const bValue = b[sortBy]
        
        if (sortBy === 'date') {
          const aDate = new Date(aValue)
          const bDate = new Date(bValue)
          return sortOrder === 'desc' ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime()
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue)
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
        }
        
        return 0
      })

      const total = transactions.length
      transactions = transactions.slice(skip, skip + limit)

      return NextResponse.json({
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    }

    // For type-specific requests, count total for pagination
    let total = 0
    if (type === 'income') {
      total = await prisma.income.count({ where: whereClause })
    } else if (type === 'expense') {
      total = await prisma.expense.count({ where: whereClause })
    }

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}