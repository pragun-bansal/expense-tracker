import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const income = await prisma.income.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        category: true,
        account: true
      }
    })

    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    }

    return NextResponse.json(income)
  } catch (error) {
    console.error('Error fetching income:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get the original income to calculate balance adjustment
    const originalIncome = await prisma.income.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!originalIncome) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    }

    const newAmount = parseFloat(amount)
    const amountDifference = newAmount - originalIncome.amount

    // Update the income
    const updatedIncome = await prisma.income.update({
      where: { id: params.id },
      data: {
        amount: newAmount,
        description,
        categoryId,
        accountId,
        date: date ? new Date(date) : originalIncome.date,
        source
      },
      include: {
        category: true,
        account: true
      }
    })

    // Adjust account balances if needed
    if (amountDifference !== 0) {
      // If account changed, adjust both accounts
      if (originalIncome.accountId !== accountId) {
        // Subtract from original account
        await prisma.userAccount.update({
          where: { id: originalIncome.accountId },
          data: { balance: { decrement: originalIncome.amount } }
        })
        
        // Add to new account
        await prisma.userAccount.update({
          where: { id: accountId },
          data: { balance: { increment: newAmount } }
        })
      } else {
        // Same account, just adjust the difference
        await prisma.userAccount.update({
          where: { id: accountId },
          data: { balance: { increment: amountDifference } }
        })
      }
    } else if (originalIncome.accountId !== accountId) {
      // Amount same but account changed
      await prisma.userAccount.update({
        where: { id: originalIncome.accountId },
        data: { balance: { decrement: originalIncome.amount } }
      })
      
      await prisma.userAccount.update({
        where: { id: accountId },
        data: { balance: { increment: newAmount } }
      })
    }

    return NextResponse.json(updatedIncome)
  } catch (error) {
    console.error('Error updating income:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the income to adjust account balance
    const income = await prisma.income.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 })
    }

    // Delete the income
    await prisma.income.delete({
      where: { id: params.id }
    })

    // Adjust account balance
    await prisma.userAccount.update({
      where: { id: income.accountId },
      data: {
        balance: { decrement: income.amount }
      }
    })

    return NextResponse.json({ message: 'Income deleted successfully' })
  } catch (error) {
    console.error('Error deleting income:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}