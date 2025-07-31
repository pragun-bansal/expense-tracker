import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createGroupMemberNotification } from '@/lib/notifications'

// Groups change moderately, cache for 3 minutes
export const revalidate = 180

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        expenses: {
          include: {
            paidBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            splits: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Error fetching groups:', error)
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

    const { name, description, memberEmails } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    // Create the group
    const group = await prisma.group.create({
      data: {
        name,
        description: description || null
      }
    })

    // Add the creator as an admin
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: session.user.id,
        role: 'ADMIN'
      }
    })

    // Add other members if provided
    if (memberEmails && memberEmails.length > 0) {
      for (const email of memberEmails) {
        if (email.trim()) {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: email.trim() }
          })
          
          if (user && user.id !== session.user.id) {
            // Add as member if user exists and is not the creator
            await prisma.groupMember.create({
              data: {
                groupId: group.id,
                userId: user.id,
                role: 'MEMBER'
              }
            })
            
            // Create notification for the added member
            await createGroupMemberNotification(
              user.id,
              group.id,
              group.name,
              session.user.name || session.user.email || 'Someone',
              true
            )
          }
        }
      }
    }

    // Fetch the complete group with members
    const completeGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        expenses: {
          include: {
            paidBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            splits: true
          }
        }
      }
    })

    return NextResponse.json(completeGroup)
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}