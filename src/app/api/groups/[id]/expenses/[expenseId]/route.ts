import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId, expenseId } = await params

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

    // Check if the expense exists and belongs to the group
    const expense = await prisma.groupExpense.findFirst({
      where: {
        id: expenseId,
        groupId
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Check if user is admin or the one who paid for the expense
    const isAdmin = membership.role === 'ADMIN'
    const isPayer = expense.paidById === session.user.id

    if (!isAdmin && !isPayer) {
      return NextResponse.json({ 
        error: 'Only group admins or the person who paid can delete this expense' 
      }, { status: 403 })
    }

    // Delete the expense (splits will be cascade deleted)
    await prisma.groupExpense.delete({
      where: { id: expenseId }
    })

    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId, expenseId } = await params

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

    // Check if the expense exists and belongs to the group
    const expense = await prisma.groupExpense.findFirst({
      where: {
        id: expenseId,
        groupId
      }
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Check if user is admin or the one who paid for the expense
    const isAdmin = membership.role === 'ADMIN'
    const isPayer = expense.paidById === session.user.id

    if (!isAdmin && !isPayer) {
      return NextResponse.json({ 
        error: 'Only group admins or the person who paid can edit this expense' 
      }, { status: 403 })
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

    // Update the expense
    const updatedExpense = await prisma.groupExpense.update({
      where: { id: expenseId },
      data: {
        description,
        amount: parseFloat(amount),
        date: date ? new Date(date) : undefined,
        splitType: splitType || 'EQUAL',
        receiptUrl: receiptUrl || null
      }
    })

    // Delete existing splits
    await prisma.expenseSplit.deleteMany({
      where: { expenseId: expenseId }
    })

    // Create new splits
    for (const split of splits) {
      await prisma.expenseSplit.create({
        data: {
          expenseId: updatedExpense.id,
          userId: split.userId,
          amount: parseFloat(split.amount),
          settled: false
        }
      })
    }

    // Fetch the complete updated expense
    const completeExpense = await prisma.groupExpense.findUnique({
      where: { id: expenseId },
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
    console.error('Error updating expense:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}