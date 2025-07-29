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

    const borrowings = await prisma.borrowing.findMany({
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

    return NextResponse.json({ borrowings })
  } catch (error) {
    console.error('Error fetching borrowings:', error)
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
        { error: 'Borrowing ID is required' },
        { status: 400 }
      )
    }

    // Get the borrowing to check ownership and get account info for balance update
    const borrowing = await prisma.borrowing.findUnique({
      where: { 
        id,
        userId: session.user.id // Ensure user owns this borrowing
      }
    })

    if (!borrowing) {
      return NextResponse.json({ error: 'Borrowing not found' }, { status: 404 })
    }

    // Check if it's a group transaction (cannot delete)
    if (borrowing.groupExpenseId) {
      return NextResponse.json(
        { error: 'Cannot delete group transactions. Please delete from the group page.' },
        { status: 400 }
      )
    }

    // Delete the borrowing
    await prisma.borrowing.delete({
      where: { id }
    })

    // Increase account balance (add back the borrowing amount)
    await prisma.userAccount.update({
      where: { id: borrowing.accountId },
      data: {
        balance: {
          increment: borrowing.amount
        }
      }
    })

    return NextResponse.json({ message: 'Borrowing deleted successfully' })
  } catch (error) {
    console.error('Error deleting borrowing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}