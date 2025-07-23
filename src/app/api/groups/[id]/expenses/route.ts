import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPersonalTransactionsForGroupExpense } from '@/lib/groupTransactionSync'
import { createGroupExpenseNotification } from '@/lib/notifications'

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

    // Fetch group expenses with splits and lenders
    const expenses = await prisma.groupExpense.findMany({
      where: {
        groupId
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        lenders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            account: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
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
            },
            settlementAccount: {
              select: {
                id: true,
                name: true,
                type: true
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
      lenders,
      accountId,
      receiptUrl 
    } = await request.json()

    if (!description || !amount || !splits || splits.length === 0) {
      return NextResponse.json(
        { error: 'Description, amount, and splits are required' },
        { status: 400 }
      )
    }

    if (!lenders || lenders.length === 0) {
      return NextResponse.json(
        { error: 'At least one lender is required' },
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

    // Validate lender amounts
    const totalLenderAmount = lenders.reduce((sum: number, lender: any) => sum + lender.amount, 0)
    if (Math.abs(totalLenderAmount - amount) > 0.01) {
      return NextResponse.json(
        { error: 'Lender amounts must equal the total expense amount' },
        { status: 400 }
      )
    }

    // Create the group expense
    const groupExpense = await prisma.groupExpense.create({
      data: {
        groupId,
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        splitType: splitType || 'EQUAL',
        receiptUrl: receiptUrl || null,
        accountId: accountId || null
      }
    })

    // Create lenders
    for (const lender of lenders) {
      await prisma.groupLender.create({
        data: {
          expenseId: groupExpense.id,
          userId: lender.userId,
          amount: parseFloat(lender.amount),
          accountId: lender.accountId || null
        }
      })
    }

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

    // Create personal transactions for account balances and transaction history
    try {
      await createPersonalTransactionsForGroupExpense(
        groupExpense.id,
        {
          description,
          amount: parseFloat(amount),
          date: date ? new Date(date) : new Date(),
          groupId
        },
        lenders,
        splits
      )
    } catch (error) {
      console.error('Error creating personal transactions:', error)
      // Continue without failing the main operation
    }

    // Create notifications for group members (except the person adding the expense)
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { not: session.user.id }
      },
      include: {
        user: true
      }
    })

    const addedByName = session.user.name || session.user.email || 'Someone'
    
    for (const member of groupMembers) {
      await createGroupExpenseNotification(
        member.userId,
        groupId,
        description,
        parseFloat(amount),
        addedByName
      )
    }

    // Fetch the complete expense with splits and lenders
    const completeExpense = await prisma.groupExpense.findUnique({
      where: { id: groupExpense.id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        lenders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            account: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
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
            },
            settlementAccount: {
              select: {
                id: true,
                name: true,
                type: true
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