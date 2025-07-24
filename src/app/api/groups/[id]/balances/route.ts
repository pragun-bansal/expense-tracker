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

    // Get all group expenses with lenders and splits (same as stats API)
    const expenses = await prisma.groupExpense.findMany({
      where: {
        groupId
      },
      include: {
        lenders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
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
            }
          }
        }
      }
    })

    // Get all group members
    const groupMembers = await prisma.groupMember.findMany({
      where: {
        groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Calculate net balances (same logic as stats API)
    const userBalances: { [userId: string]: number } = {}
    const userInfo: { [userId: string]: { name: string; email: string } } = {}

    // Initialize all group members
    for (const member of groupMembers) {
      const userId = member.user.id
      userBalances[userId] = 0
      userInfo[userId] = {
        name: member.user.name || '',
        email: member.user.email || ''
      }
    }

    // Calculate from expenses - same as stats API
    for (const expense of expenses) {
      // Lenders get positive balance (money they lent out)
      for (const lender of expense.lenders) {
        const lenderId = lender.userId
        if (userBalances[lenderId] !== undefined) {
          userBalances[lenderId] += lender.amount
        }
      }

      // Borrowers get negative balance (money they owe) - only count unsettled splits
      for (const split of expense.splits) {
        if (!split.settled) {
          const userId = split.userId
          if (userBalances[userId] !== undefined) {
            userBalances[userId] -= split.amount
          }
        }
      }
    }

    // Convert to array format with user details
    const balances = Object.entries(userBalances).map(([userId, balance]) => ({
      userId,
      user: userInfo[userId],
      balance: Math.round(Number(balance) * 100) / 100 // Round to 2 decimal places
    }))

    // Calculate simplified settlements (who owes whom)
    const settlements: Array<{
      from: { id: string; name: string; email: string }
      to: { id: string; name: string; email: string }
      amount: number
    }> = []

    // Create copies for settlement calculation to avoid mutating original balances
    const debtors = balances
      .filter(b => b.balance < 0)
      .map(b => ({ ...b })) // Create shallow copy
      .sort((a, b) => a.balance - b.balance)
    
    const creditors = balances
      .filter(b => b.balance > 0)
      .map(b => ({ ...b })) // Create shallow copy  
      .sort((a, b) => b.balance - a.balance)

    let debtorIndex = 0
    let creditorIndex = 0

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex]
      const creditor = creditors[creditorIndex]

      const debtAmount = Math.abs(debtor.balance)
      const creditAmount = creditor.balance

      const settlementAmount = Math.min(debtAmount, creditAmount)

      if (settlementAmount > 0.01) { // Avoid tiny settlements
        settlements.push({
          from: {
            id: debtor.userId,
            name: debtor.user.name,
            email: debtor.user.email
          },
          to: {
            id: creditor.userId,
            name: creditor.user.name,
            email: creditor.user.email
          },
          amount: Number(settlementAmount.toFixed(2))
        })
      }

      // Update balances
      debtor.balance += settlementAmount
      creditor.balance -= settlementAmount

      // Move to next if current is settled
      if (Math.abs(debtor.balance) < 0.01) {
        debtorIndex++
      }
      if (Math.abs(creditor.balance) < 0.01) {
        creditorIndex++
      }
    }

    return NextResponse.json({
      balances,
      settlements
    })
  } catch (error) {
    console.error('Error calculating balances:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}