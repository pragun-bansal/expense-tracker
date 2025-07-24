import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params
    const { fromUserId, toUserId, amount, settlementAccountId } = await request.json()

    if (!fromUserId || !toUserId || !amount) {
      return NextResponse.json(
        { error: 'From user, to user, and amount are required' },
        { status: 400 }
      )
    }

    // Check if user is authorized to make this settlement
    if (session.user.id !== fromUserId && session.user.id !== toUserId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

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

    // Find all unsettled splits between these two users
    const unsettledSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: fromUserId,
        settled: false,
        groupExpense: {
          groupId,
          lenders: {
            some: {
              userId: toUserId
            }
          }
        }
      },
      include: {
        groupExpense: {
          include: {
            lenders: {
              where: {
                userId: toUserId
              }
            }
          }
        }
      }
    })

    // Calculate how much the fromUser owes the toUser
    let totalOwed = 0
    const splitsToSettle: string[] = []

    for (const split of unsettledSplits) {
      const lenderShare = split.groupExpense.lenders[0]?.amount || 0
      const lenderPortion = lenderShare / split.groupExpense.amount
      const amountOwedForThisSplit = split.amount * lenderPortion
      
      if (totalOwed + amountOwedForThisSplit <= amount + 0.01) { // Small tolerance for floating point
        totalOwed += amountOwedForThisSplit
        splitsToSettle.push(split.id)
      }
    }

    if (splitsToSettle.length === 0) {
      return NextResponse.json(
        { error: 'No debts found between these users' },
        { status: 400 }
      )
    }

    // Mark the splits as settled
    await prisma.expenseSplit.updateMany({
      where: {
        id: { in: splitsToSettle }
      },
      data: {
        settled: true,
        settlementAccountId: settlementAccountId || null
      }
    })

    // Create personal transactions for the settlement
    const defaultGroupCategory = await getOrCreateGroupCategory()

    // For the person paying (fromUser) - create expense
    if (settlementAccountId) {
      await prisma.expense.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Payment to ${await getUserName(toUserId)}`,
          date: new Date(),
          userId: fromUserId,
          accountId: settlementAccountId,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_PAID'
        }
      })

      // Update account balance (subtract money going out)
      await prisma.account.update({
        where: { id: settlementAccountId },
        data: {
          balance: {
            decrement: totalOwed
          }
        }
      })
    } else {
      // Settlement from "Others" account - create expense in miscellaneous account
      const miscAccount = await getOrCreateMiscellaneousAccount(fromUserId)
      await prisma.expense.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Payment to ${await getUserName(toUserId)}`,
          date: new Date(),
          userId: fromUserId,
          accountId: miscAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_PAID'
        }
      })
    }

    // For the person receiving (toUser) - create income if they're the one marking as received
    if (session.user.id === toUserId && settlementAccountId) {
      await prisma.income.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Payment from ${await getUserName(fromUserId)}`,
          date: new Date(),
          userId: toUserId,
          accountId: settlementAccountId,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })

      // Update account balance (add money coming in)
      await prisma.account.update({
        where: { id: settlementAccountId },
        data: {
          balance: {
            increment: totalOwed
          }
        }
      })
    }

    // Create notifications for all group members except the one who recorded the settlement
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId,
        userId: { not: session.user.id }
      },
      include: {
        user: true,
        group: true
      }
    })

    const fromUserName = await getUserName(fromUserId)
    const toUserName = await getUserName(toUserId)
    const settlerName = session.user.name || session.user.email || 'Someone'

    for (const member of groupMembers) {
      await createNotification({
        userId: member.userId,
        title: 'Group Balance Settled',
        message: `${settlerName} recorded a settlement of $${totalOwed.toFixed(2)} from ${fromUserName} to ${toUserName} in group "${member.group.name}".`,
        type: 'GROUP_PAYMENT_RECEIVED',
        relatedId: groupId
      })
    }

    return NextResponse.json({ 
      message: 'Settlement recorded successfully',
      settledAmount: totalOwed,
      settledSplits: splitsToSettle.length 
    })
  } catch (error) {
    console.error('Error settling balance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getOrCreateGroupCategory() {
  let category = await prisma.category.findFirst({
    where: {
      name: 'Group Expenses',
      type: 'EXPENSE'
    }
  })

  if (!category) {
    const firstUser = await prisma.user.findFirst()
    if (firstUser) {
      category = await prisma.category.create({
        data: {
          name: 'Group Expenses',
          type: 'EXPENSE',
          color: '#8B5CF6',
          icon: '👥',
          userId: firstUser.id
        }
      })
    } else {
      throw new Error('No users found in database')
    }
  }

  return category
}

async function getOrCreateMiscellaneousAccount(userId: string) {
  let account = await prisma.account.findFirst({
    where: {
      userId,
      name: 'Others',
      type: 'OTHER'
    }
  })

  if (!account) {
    account = await prisma.account.create({
      data: {
        name: 'Others',
        type: 'OTHER',
        balance: 0,
        color: '#6B7280',
        userId
      }
    })
  }

  return account
}

async function getUserName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  return user?.name || user?.email || 'Unknown User'
}