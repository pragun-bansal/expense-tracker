import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { logActivity } from '@/lib/activityLogger'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params
    const { fromUserId, toUserId, amount, settlementAccountId, lenderAccountId } = await request.json()

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

    // Determine who is settling (borrower or lender)
    const isLenderSettling = session.user.id === toUserId
    const isBorrowerSettling = session.user.id === fromUserId

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

    // We'll create the settlement record after creating transactions to store their IDs
    let borrowerExpenseId: string | null = null
    let lenderIncomeId: string | null = null
    let borrowerLendingId: string | null = null
    let lenderBorrowingId: string | null = null

    // Mark the splits as settled
    await prisma.expenseSplit.updateMany({
      where: {
        id: { in: splitsToSettle }
      },
      data: {
        settled: true,
        settledAt: new Date()
      }
    })

    // Create personal transactions for the settlement
    const defaultGroupCategory = await getOrCreateGroupCategory()
    const othersAccountBorrower = await getOrCreateOthersAccount(fromUserId)
    const othersAccountLender = await getOrCreateOthersAccount(toUserId)
    const borrowerGroupLendingAccount = await getOrCreateGroupLendingAccount(fromUserId)
    const lenderGroupLendingAccount = await getOrCreateGroupLendingAccount(toUserId)

    if (isBorrowerSettling) {
      // Borrower is recording the payment
      const paymentAccountId = settlementAccountId || othersAccountBorrower.id
      
      // Create expense for borrower (money going out)
      const borrowerExpense = await prisma.expense.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Payment to ${await getUserName(toUserId)}`,
          date: new Date(),
          userId: fromUserId,
          accountId: paymentAccountId,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_PAID'
        }
      })
      borrowerExpenseId = borrowerExpense.id
      await updateAccountBalance(paymentAccountId, -totalOwed)

      // Reduce borrower's debt in Group Lending/Borrowing account (add lending to offset the debt)
      const borrowerLending = await prisma.lending.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Debt reduction to ${await getUserName(toUserId)}`,
          date: new Date(),
          userId: fromUserId,
          accountId: borrowerGroupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_PAID'
        }
      })
      borrowerLendingId = borrowerLending.id
      await updateAccountBalance(borrowerGroupLendingAccount.id, totalOwed)

      // Create income for lender in Others account (default)
      const lenderIncome = await prisma.income.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Payment from ${await getUserName(fromUserId)}`,
          date: new Date(),
          userId: toUserId,
          accountId: othersAccountLender.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })
      lenderIncomeId = lenderIncome.id
      await updateAccountBalance(othersAccountLender.id, totalOwed)

      // Reduce lender's credit in Group Lending/Borrowing account (add borrowing to offset the credit)
      const lenderBorrowing = await prisma.borrowing.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Credit reduction from ${await getUserName(fromUserId)}`,
          date: new Date(),
          userId: toUserId,
          accountId: lenderGroupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })
      lenderBorrowingId = lenderBorrowing.id
      await updateAccountBalance(lenderGroupLendingAccount.id, -totalOwed)

    } else if (isLenderSettling) {
      // Lender is recording receipt of payment
      const receiptAccountId = lenderAccountId || settlementAccountId || othersAccountLender.id
      
      // Create income for lender (money coming in)
      const lenderIncome = await prisma.income.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Payment from ${await getUserName(fromUserId)}`,
          date: new Date(),
          userId: toUserId,
          accountId: receiptAccountId,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })
      lenderIncomeId = lenderIncome.id
      await updateAccountBalance(receiptAccountId, totalOwed)

      // Reduce lender's credit in Group Lending/Borrowing account
      const lenderBorrowing = await prisma.borrowing.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Credit reduction from ${await getUserName(fromUserId)}`,
          date: new Date(),
          userId: toUserId,
          accountId: lenderGroupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })
      lenderBorrowingId = lenderBorrowing.id
      await updateAccountBalance(lenderGroupLendingAccount.id, -totalOwed)

      // Create expense for borrower in Others account (default)
      const borrowerExpense = await prisma.expense.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Payment to ${await getUserName(toUserId)}`,
          date: new Date(),
          userId: fromUserId,
          accountId: othersAccountBorrower.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_PAID'
        }
      })
      borrowerExpenseId = borrowerExpense.id
      await updateAccountBalance(othersAccountBorrower.id, -totalOwed)

      // Reduce borrower's debt in Group Lending/Borrowing account
      const borrowerLending = await prisma.lending.create({
        data: {
          amount: totalOwed,
          description: `[Group Settlement] Debt reduction to ${await getUserName(toUserId)}`,
          date: new Date(),
          userId: fromUserId,
          accountId: borrowerGroupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_PAID'
        }
      })
      borrowerLendingId = borrowerLending.id
      await updateAccountBalance(borrowerGroupLendingAccount.id, totalOwed)
    }

    // Create settlement record with transaction IDs
    const settlement = await prisma.settlement.create({
      data: {
        amount: totalOwed,
        groupId,
        borrowerUserId: fromUserId,
        lenderUserId: toUserId,
        borrowerAccountId: isBorrowerSettling ? settlementAccountId : null,
        lenderAccountId: isLenderSettling ? lenderAccountId || settlementAccountId : null,
        settledByUserId: session.user.id,
        borrowerExpenseId,
        lenderIncomeId,
        borrowerLendingId,
        lenderBorrowingId
      }
    })

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

    // Log activity
    await logActivity({
      action: 'SETTLEMENT_ADDED',
      description: `Recorded settlement of $${totalOwed.toFixed(2)} from ${fromUserName} to ${toUserName}`,
      userId: session.user.id,
      groupId,
      entityType: 'settlement',
      entityId: settlement.id,
      metadata: {
        amount: totalOwed,
        fromUser: fromUserName,
        toUser: toUserName,
        settledBy: settlerName,
        splitsSettled: splitsToSettle.length
      }
    })

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

async function getOrCreateOthersAccount(userId: string) {
  let account = await prisma.userAccount.findFirst({
    where: {
      userId,
      type: 'OTHERS_FIXED'
    }
  })

  if (!account) {
    account = await prisma.userAccount.create({
      data: {
        name: 'Others',
        type: 'OTHERS_FIXED',
        balance: 0,
        color: '#6B7280',
        userId
      }
    })
  }

  return account
}

async function getOrCreateGroupLendingAccount(userId: string) {
  let account = await prisma.userAccount.findFirst({
    where: {
      userId,
      type: 'GROUP_LENDING'
    }
  })

  if (!account) {
    account = await prisma.userAccount.create({
      data: {
        name: 'Group Lending/Borrowing',
        type: 'GROUP_LENDING',
        balance: 0,
        color: '#10B981',
        userId
      }
    })
  }

  return account
}

async function updateAccountBalance(accountId: string, amount: number) {
  await prisma.userAccount.update({
    where: { id: accountId },
    data: {
      balance: {
        increment: amount
      }
    }
  })
}

async function getUserName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  return user?.name || user?.email || 'Unknown User'
}