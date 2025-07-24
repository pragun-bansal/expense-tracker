import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createGroupMemberNotification } from '@/lib/notifications'

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

    // Fetch the group with members and expenses
    const group = await prisma.group.findUnique({
      where: { id: groupId },
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
            splits: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    return NextResponse.json(group)
  } catch (error) {
    console.error('Error fetching group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params

    // Check if user is an admin of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
        role: 'ADMIN'
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { name, description, memberEmails } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    // Update the group basic info
    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        name,
        description: description || null
      }
    })

    // Add new members if provided
    if (memberEmails && memberEmails.length > 0) {
      for (const email of memberEmails) {
        if (email.trim()) {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: email.trim() }
          })
          
          if (user) {
            // Check if user is already a member
            const existingMember = await prisma.groupMember.findFirst({
              where: {
                groupId,
                userId: user.id
              }
            })
            
            if (!existingMember) {
              // Add as member if user exists and is not already a member
              await prisma.groupMember.create({
                data: {
                  groupId,
                  userId: user.id,
                  role: 'MEMBER'
                }
              })
              
              // Create notification for the added member
              await createGroupMemberNotification(
                user.id,
                groupId,
                group.name,
                session.user.name || session.user.email || 'Someone',
                true
              )
            }
          }
        }
      }
    }

    // Fetch the updated group with members
    const finalGroup = await prisma.group.findUnique({
      where: { id: groupId },
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
            splits: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return NextResponse.json(finalGroup)
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId } = await params

    // Check if user is an admin of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId,
        userId: session.user.id,
        role: 'ADMIN'
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    await prisma.group.delete({
      where: { id: groupId }
    })

    return NextResponse.json({ message: 'Group deleted successfully' })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}