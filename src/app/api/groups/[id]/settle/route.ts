import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { splitIds } = await request.json()

    if (!splitIds || splitIds.length === 0) {
      return NextResponse.json(
        { error: 'Split IDs are required' },
        { status: 400 }
      )
    }

    // Update the splits to settled
    await prisma.expenseSplit.updateMany({
      where: {
        id: {
          in: splitIds
        },
        userId: session.user.id, // Only allow settling own splits
        settled: false
      },
      data: {
        settled: true,
        settledAt: new Date()
      }
    })

    return NextResponse.json({ message: 'Splits settled successfully' })
  } catch (error) {
    console.error('Error settling splits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}