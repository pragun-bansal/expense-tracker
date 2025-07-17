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

    // Create payment records and mark splits as settled
    const paymentPromises = settlements.map(async (settlement: Settlement) => {
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          amount: settlement.amount,
          fromId: settlement.from,
          toId: settlement.to,
          date: new Date()
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

      return payment
    })

    const payments = await Promise.all(paymentPromises)

    return NextResponse.json({
      message: `Created ${payments.length} payment records and settled debts`,
      payments
    })
  } catch (error) {
    console.error('Error settling debts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}