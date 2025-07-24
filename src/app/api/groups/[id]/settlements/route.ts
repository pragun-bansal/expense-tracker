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

    // Fetch settlements for this group
    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        borrower: {
          select: { id: true, name: true, email: true }
        },
        lender: {
          select: { id: true, name: true, email: true }
        },
        borrowerAccount: {
          select: { id: true, name: true, type: true }
        },
        lenderAccount: {
          select: { id: true, name: true, type: true }
        }
      },
      orderBy: { settledAt: 'desc' }
    })

    return NextResponse.json({ settlements })
  } catch (error) {
    console.error('Error fetching settlements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}