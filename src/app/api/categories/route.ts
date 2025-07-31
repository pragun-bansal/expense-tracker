import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Categories rarely change, cache for 10 minutes
export const revalidate = 600

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'EXPENSE' | 'INCOME' | null

    const where: any = { userId: session.user.id }
    if (type) where.type = type

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' }
    })

    const response = NextResponse.json(categories)
    
    // Add caching headers - categories change infrequently
    response.headers.set('Cache-Control', 'public, max-age=600, s-maxage=1200, stale-while-revalidate=600')
    response.headers.set('CDN-Cache-Control', 'public, max-age=1200')
    
    return response
  } catch (error) {
    console.error('Error fetching categories:', error)
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

    const { name, type, color, icon } = await request.json()

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        type,
        color,
        icon,
        userId: session.user.id
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}