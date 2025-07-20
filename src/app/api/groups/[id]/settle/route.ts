import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPersonalTransactionsForSettlement } from '@/lib/groupTransactionSync'

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

    const { splitIds, settlementAccountId, settlerType } = await request.json()

    if (!splitIds || splitIds.length === 0) {
      return NextResponse.json(
        { error: 'Split IDs are required' },
        { status: 400 }
      )
    }

    // Get the splits to validate permissions
    const splits = await prisma.expenseSplit.findMany({
      where: {
        id: { in: splitIds },
        settled: false
      },
      include: {
        groupExpense: {
          include: {
            lenders: true
          }
        }
      }
    })

    if (splits.length === 0) {
      return NextResponse.json(
        { error: 'No valid unsettled splits found' },
        { status: 400 }
      )
    }

    // Check if user has permission to settle these splits
    const canSettle = splits.every(split => {
      // User can settle their own splits (borrower)
      if (split.userId === session.user.id) return true
      
      // User can settle if they are a lender for this expense
      const isLender = split.groupExpense.lenders.some(lender => lender.userId === session.user.id)
      return isLender
    })

    if (!canSettle) {
      return NextResponse.json(
        { error: 'You can only settle your own splits or splits for expenses you lent money for' },
        { status: 403 }
      )
    }

    // Update the splits to settled
    await prisma.expenseSplit.updateMany({
      where: {
        id: { in: splitIds },
        settled: false
      },
      data: {
        settled: true,
        settledAt: new Date(),
        settlementAccountId: settlementAccountId || null
      }
    })

    // Create personal transactions for settlements
    for (const split of splits) {
      const lenderUserId = split.groupExpense.lenders[0]?.userId // Get first lender (simplified)
      
      if (lenderUserId) {
        try {
          await createPersonalTransactionsForSettlement(
            split.groupExpense.id,
            split.amount,
            split.userId,
            lenderUserId,
            settlementAccountId || undefined,
            session.user.id
          )
        } catch (error) {
          console.error('Error creating settlement transactions:', error)
          // Continue without failing the main operation
        }
      }
    }

    // Create notifications for affected parties
    for (const split of splits) {
      const isUserBorrower = split.userId === session.user.id
      const notificationUserId = isUserBorrower 
        ? split.groupExpense.lenders[0]?.userId // Notify lender if borrower settled
        : split.userId // Notify borrower if lender settled

      if (notificationUserId && notificationUserId !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: notificationUserId,
            title: 'Expense Settled',
            message: `${session.user.name || session.user.email} marked an expense split as settled`,
            type: 'GROUP_EXPENSE_SETTLED',
            relatedId: split.groupExpense.id
          }
        })
      }
    }

    return NextResponse.json({ message: 'Splits settled successfully' })
  } catch (error) {
    console.error('Error settling splits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}