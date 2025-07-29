import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureSpecialAccountsExist } from '@/lib/specialAccounts'
import { migrateOldOthersAccounts } from '@/lib/migrateAccounts'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Run migration for old accounts first
    await migrateOldOthersAccounts()
    
    // Ensure special accounts exist
    await ensureSpecialAccountsExist(session.user.id)

    const accounts = await prisma.userAccount.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { type: 'asc' }, // Special accounts first
        { name: 'asc' }
      ]
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      console.error('User not found in database:', session.user.id)
      return NextResponse.json({ error: 'User not found. Please log out and log in again.' }, { status: 401 })
    }

    const { name, type, balance, color } = await request.json()

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const account = await prisma.userAccount.create({
      data: {
        name,
        type,
        balance: balance || 0,
        color,
        userId: session.user.id
      }
    })

    return NextResponse.json(account)
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}