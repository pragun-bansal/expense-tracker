import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { amount, period, categoryId } = await request.json()

    if (!amount || !period || !categoryId) {
      return NextResponse.json(
        { error: 'Amount, period, and category are required' },
        { status: 400 }
      )
    }

    // Check if budget exists and belongs to user
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    // Calculate start and end dates based on period (only if period changed)
    let startDate = existingBudget.startDate
    let endDate = existingBudget.endDate

    if (period !== existingBudget.period) {
      const now = new Date()
      
      switch (period) {
        case 'WEEKLY':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
          endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)
          break
        case 'MONTHLY':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          break
        case 'YEARLY':
          startDate = new Date(now.getFullYear(), 0, 1)
          endDate = new Date(now.getFullYear(), 11, 31)
          break
        default:
          return NextResponse.json(
            { error: 'Invalid period' },
            { status: 400 }
          )
      }

      // Check if budget already exists for this category and new period (excluding current budget)
      const conflictingBudget = await prisma.budget.findFirst({
        where: {
          userId: session.user.id,
          categoryId,
          period,
          id: { not: id },
          startDate: {
            gte: startDate,
            lte: endDate
          }
        }
      })

      if (conflictingBudget) {
        return NextResponse.json(
          { error: 'Budget already exists for this category and period' },
          { status: 400 }
        )
      }
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
        period,
        startDate,
        endDate,
        categoryId
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(budget)
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if budget exists and belongs to user
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    await prisma.budget.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Budget deleted successfully' })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}