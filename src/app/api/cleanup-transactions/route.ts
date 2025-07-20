import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cleanupDuplicateGroupTransactions } from '@/lib/cleanupGroupTransactions'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await cleanupDuplicateGroupTransactions()

    return NextResponse.json({ message: 'Cleanup completed successfully' })
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}