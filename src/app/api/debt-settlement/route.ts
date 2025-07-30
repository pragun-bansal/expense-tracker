import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface DebtSummary {
  userId: string
  userName: string
  totalOwed: number
  totalOwes: number
  netBalance: number
}

interface Settlement {
  from: string
  to: string
  amount: number
  fromName: string
  toName: string
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    // Verify user is member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: session.user.id,
        groupId: groupId
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })
    }

    // Get all unsettled expense splits in the group
    const expenseSplits = await prisma.expenseSplit.findMany({
      where: {
        settled: false,
        groupExpense: {
          groupId: groupId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        groupExpense: {
          select: {
            id: true,
            amount: true,
            description: true,
            paidBy: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    // Calculate debt summary for each user
    const userDebts = new Map<string, DebtSummary>()
    
    // Initialize user debts
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    for (const member of groupMembers) {
      userDebts.set(member.userId, {
        userId: member.userId,
        userName: member.user.name || 'Unknown',
        totalOwed: 0,
        totalOwes: 0,
        netBalance: 0
      })
    }

    // Calculate debts from expense splits
    for (const split of expenseSplits) {
      const paidById = split.groupExpense.paidBy.id
      const owedById = split.userId
      const amount = split.amount

      if (paidById !== owedById) {
        // Person who paid is owed money
        const paidByUser = userDebts.get(paidById)
        if (paidByUser) {
          paidByUser.totalOwed += amount
        }

        // Person who owes money
        const owedByUser = userDebts.get(owedById)
        if (owedByUser) {
          owedByUser.totalOwes += amount
        }
      }
    }

    // Calculate net balances
    for (const [userId, debt] of userDebts.entries()) {
      debt.netBalance = debt.totalOwed - debt.totalOwes
    }

    // Optimize debt settlement using a greedy algorithm
    const settlements = optimizeDebtSettlement(Array.from(userDebts.values()))

    return NextResponse.json({
      userDebts: Array.from(userDebts.values()),
      settlements,
      totalTransactions: settlements.length,
      originalTransactions: expenseSplits.length
    })
  } catch (error) {
    console.error('Error calculating debt settlement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function optimizeDebtSettlement(debts: DebtSummary[]): Settlement[] {
  const settlements: Settlement[] = []
  
  // Create copies to avoid modifying original data
  const creditors = debts.filter(debt => debt.netBalance > 0).map(debt => ({
    ...debt,
    remaining: debt.netBalance
  }))
  
  const debtors = debts.filter(debt => debt.netBalance < 0).map(debt => ({
    ...debt,
    remaining: Math.abs(debt.netBalance)
  }))

  // Sort creditors by amount owed (descending) and debtors by amount owed (descending)
  creditors.sort((a, b) => b.remaining - a.remaining)
  debtors.sort((a, b) => b.remaining - a.remaining)

  let creditorIndex = 0
  let debtorIndex = 0

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex]
    const debtor = debtors[debtorIndex]

    // Calculate settlement amount
    const settlementAmount = Math.min(creditor.remaining, debtor.remaining)

    if (settlementAmount > 0.01) { // Avoid tiny settlements
      settlements.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: settlementAmount,
        fromName: debtor.userName,
        toName: creditor.userName
      })

      creditor.remaining -= settlementAmount
      debtor.remaining -= settlementAmount
    }

    // Move to next creditor or debtor
    if (creditor.remaining <= 0.01) {
      creditorIndex++
    }
    if (debtor.remaining <= 0.01) {
      debtorIndex++
    }
  }

  return settlements
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { groupId, settlements } = await request.json()

    if (!groupId || !settlements || !Array.isArray(settlements)) {
      return NextResponse.json({ error: 'Group ID and settlements are required' }, { status: 400 })
    }

    // Verify user is admin of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: session.user.id,
        groupId: groupId,
        role: 'ADMIN'
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Only group admins can settle debts' }, { status: 403 })
    }

    // Create payment records with personal transactions and mark splits as settled
    const paymentPromises = settlements.map(async (settlement: Settlement) => {
      // Get helper accounts and category
      const defaultGroupCategory = await getOrCreateGroupCategory()
      const payerOthersAccount = await getOrCreateOthersAccount(settlement.from)
      const payeeOthersAccount = await getOrCreateOthersAccount(settlement.to)
      const payerGroupLendingAccount = await getOrCreateGroupLendingAccount(settlement.from)
      const payeeGroupLendingAccount = await getOrCreateGroupLendingAccount(settlement.to)
      
      // Get user names for transaction descriptions
      const payerName = await getUserName(settlement.from)
      const payeeName = await getUserName(settlement.to)

      // Create expense for payer (money going out)
      const payerExpense = await prisma.expense.create({
        data: {
          amount: settlement.amount,
          description: `[Debt Settlement] Payment to ${payeeName}`,
          date: new Date(),
          userId: settlement.from,
          accountId: payerOthersAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_PAID'
        }
      })
      await updateAccountBalance(payerOthersAccount.id, -settlement.amount)

      // Reduce payer's debt in Group Lending/Borrowing account (add lending to offset the debt)
      const payerLending = await prisma.lending.create({
        data: {
          amount: settlement.amount,
          description: `[Debt Settlement] Debt reduction to ${payeeName}`,
          date: new Date(),
          userId: settlement.from,
          accountId: payerGroupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_PAID'
        }
      })
      await updateAccountBalance(payerGroupLendingAccount.id, settlement.amount)

      // Create income for payee (money coming in)
      const payeeIncome = await prisma.income.create({
        data: {
          amount: settlement.amount,
          description: `[Debt Settlement] Payment from ${payerName}`,
          date: new Date(),
          userId: settlement.to,
          accountId: payeeOthersAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })
      await updateAccountBalance(payeeOthersAccount.id, settlement.amount)

      // Reduce payee's credit in Group Lending/Borrowing account (add borrowing to offset the credit)
      const payeeBorrowing = await prisma.borrowing.create({
        data: {
          amount: settlement.amount,
          description: `[Debt Settlement] Credit reduction from ${payerName}`,
          date: new Date(),
          userId: settlement.to,
          accountId: payeeGroupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })
      await updateAccountBalance(payeeGroupLendingAccount.id, -settlement.amount)

      // Create payment record with transaction IDs
      const payment = await prisma.payment.create({
        data: {
          amount: settlement.amount,
          fromId: settlement.from,
          toId: settlement.to,
          date: new Date(),
          // Store transaction IDs as metadata in a future update
          // For now, we have the comprehensive transactions created above
        }
      })

      // Mark related expense splits as settled
      await prisma.expenseSplit.updateMany({
        where: {
          userId: settlement.from,
          groupExpense: {
            groupId: groupId,
            paidById: settlement.to
          },
          settled: false
        },
        data: {
          settled: true,
          settledAt: new Date()
        }
      })

      return {
        payment,
        transactions: {
          payerExpenseId: payerExpense.id,
          payerLendingId: payerLending.id,
          payeeIncomeId: payeeIncome.id,
          payeeBorrowingId: payeeBorrowing.id
        }
      }
    })

    const payments = await Promise.all(paymentPromises)

    return NextResponse.json({
      message: `Created ${payments.length} payment records and settled debts`,
      payments: payments.map(p => p.payment),
      transactionsSummary: {
        totalTransactionsCreated: payments.length * 4, // 4 transactions per settlement
        details: payments.map(p => p.transactions)
      }
    })
  } catch (error) {
    console.error('Error settling debts:', error)
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