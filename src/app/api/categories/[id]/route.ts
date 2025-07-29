import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { name, color, icon } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category exists and belongs to user
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if another category with the same name exists
    const duplicateCategory = await prisma.category.findFirst({
      where: {
        name,
        type: existingCategory.type,
        userId: session.user.id,
        id: { not: id }
      }
    })

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      )
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        color: color || '#4ECDC4',
        icon: icon || '📦'
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if category is being used by any transactions
    const [expenseCount, incomeCount, budgetCount] = await Promise.all([
      prisma.expense.count({
        where: { categoryId: id }
      }),
      prisma.income.count({
        where: { categoryId: id }
      }),
      prisma.budget.count({
        where: { categoryId: id }
      })
    ])

    if (expenseCount > 0 || incomeCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category that is being used by transactions' },
        { status: 400 }
      )
    }

    // Delete associated budgets first
    if (budgetCount > 0) {
      await prisma.budget.deleteMany({
        where: { categoryId: id }
      })
    }

    // Delete the category
    await prisma.category.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}