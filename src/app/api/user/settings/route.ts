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

    // Get user settings from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        preferredCurrency: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      preferredCurrency: user.preferredCurrency
    })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { preferredCurrency } = await request.json()

    if (!preferredCurrency) {
      return NextResponse.json(
        { error: 'Preferred currency is required' },
        { status: 400 }
      )
    }

    // Update user settings in database
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        preferredCurrency
      },
      select: {
        preferredCurrency: true
      }
    })

    return NextResponse.json({
      preferredCurrency: updatedUser.preferredCurrency,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}