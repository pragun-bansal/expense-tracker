import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lendings = await prisma.lending.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        account: true,
        category: true,
        groupExpense: {
          include: {
            group: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json({ lendings })
  } catch (error) {
    console.error('Error fetching lendings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Lending ID is required' },
        { status: 400 }
      )
    }

    // Get the lending to check ownership and get account info for balance update
    const lending = await prisma.lending.findUnique({
      where: { 
        id,
        userId: session.user.id // Ensure user owns this lending
      }
    })

    if (!lending) {
      return NextResponse.json({ error: 'Lending not found' }, { status: 404 })
    }

    // Check if it's a group transaction (cannot delete)
    if (lending.groupExpenseId) {
      return NextResponse.json(
        { error: 'Cannot delete group transactions. Please delete from the group page.' },
        { status: 400 }
      )
    }

    // Delete the lending
    await prisma.lending.delete({
      where: { id }
    })

    // Reduce account balance (subtract back the lending amount)
    await prisma.account.update({
      where: { id: lending.accountId },
      data: {
        balance: {
          decrement: lending.amount
        }
      }
    })

    return NextResponse.json({ message: 'Lending deleted successfully' })
  } catch (error) {
    console.error('Error deleting lending:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}