import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch group expenses with splits
    const expenses = await prisma.groupExpense.findMany({
      where: {
        groupId
      },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching group expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params

    // Check if user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { 
      description, 
      amount, 
      date, 
      splitType, 
      splits,
      receiptUrl 
    } = await request.json()

    if (!description || !amount || !splits || splits.length === 0) {
      return NextResponse.json(
        { error: 'Description, amount, and splits are required' },
        { status: 400 }
      )
    }

    // Validate split amounts
    const totalSplitAmount = splits.reduce((sum: number, split: any) => sum + split.amount, 0)
    if (Math.abs(totalSplitAmount - amount) > 0.01) {
      return NextResponse.json(
        { error: 'Split amounts must equal the total expense amount' },
        { status: 400 }
      )
    }

    // Create the group expense
    const groupExpense = await prisma.groupExpense.create({
      data: {
        groupId,
        paidById: session.user.id,
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        splitType: splitType || 'EQUAL',
        receiptUrl: receiptUrl || null
      }
    })

    // Create expense splits
    for (const split of splits) {
      await prisma.expenseSplit.create({
        data: {
          expenseId: groupExpense.id,
          userId: split.userId,
          amount: parseFloat(split.amount),
          settled: false
        }
      })
    }

    // Fetch the complete expense with splits
    const completeExpense = await prisma.groupExpense.findUnique({
      where: { id: groupExpense.id },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(completeExpense)
  } catch (error) {
    console.error('Error creating group expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}