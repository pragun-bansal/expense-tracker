import { prisma } from './prisma'

export type ActivityAction = 
  | 'EXPENSE_ADDED'
  | 'EXPENSE_EDITED' 
  | 'EXPENSE_DELETED'
  | 'SETTLEMENT_ADDED'
  | 'SETTLEMENT_DELETED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'GROUP_NAME_CHANGED'
  | 'GROUP_DESCRIPTION_CHANGED'
  | 'GROUP_CREATED'
  | 'GROUP_DELETED'

interface LogActivityParams {
  action: ActivityAction
  description: string
  userId: string
  groupId?: string
  entityType?: string
  entityId?: string
  metadata?: any
}

export async function logActivity({
  action,
  description,
  userId,
  groupId,
  entityType,
  entityId,
  metadata
}: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        description,
        userId,
        groupId,
        entityType,
        entityId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
      }
    })
  } catch (error) {
    console.error('Error logging activity:', error)
    // Don't throw error to avoid breaking the main operation
  }
}

export async function getGroupActivities(groupId: string, limit: number = 50) {
  try {
    const activities = await prisma.activityLog.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    
    return activities
  } catch (error) {
    console.error('Error fetching group activities:', error)
    return []
  }
}

export function formatActivityDescription(activity: any): string {
  const userName = activity.user.name || activity.user.email
  
  switch (activity.action) {
    case 'EXPENSE_ADDED':
      return `${userName} added a new expense "${activity.metadata?.expenseName || 'Unknown'}" for $${activity.metadata?.amount || '0'}`
    
    case 'EXPENSE_EDITED':
      const changes = activity.metadata?.changes || []
      if (changes.length > 0) {
        return `${userName} updated ${changes.join(' and ')} for expense "${activity.metadata?.expenseName || 'Unknown'}"`
      }
      return `${userName} edited expense "${activity.metadata?.expenseName || 'Unknown'}"`
    
    case 'EXPENSE_DELETED':
      return `${userName} deleted expense "${activity.metadata?.expenseName || 'Unknown'}"`
    
    case 'SETTLEMENT_ADDED':
      return `${userName} recorded a settlement of $${activity.metadata?.amount || '0'} from ${activity.metadata?.fromUser || 'Unknown'} to ${activity.metadata?.toUser || 'Unknown'}`
    
    case 'SETTLEMENT_DELETED':
      return `${userName} deleted a settlement of $${activity.metadata?.amount || '0'} from ${activity.metadata?.fromUser || 'Unknown'} to ${activity.metadata?.toUser || 'Unknown'}`
    
    case 'MEMBER_ADDED':
      return `${userName} added ${activity.metadata?.memberName || 'someone'} to the group`
    
    case 'MEMBER_REMOVED':
      return `${userName} removed ${activity.metadata?.memberName || 'someone'} from the group`
    
    case 'GROUP_NAME_CHANGED':
      return `${userName} changed the group name from "${activity.metadata?.oldName || 'Unknown'}" to "${activity.metadata?.newName || 'Unknown'}"`
    
    case 'GROUP_DESCRIPTION_CHANGED':
      return `${userName} updated the group description`
    
    case 'GROUP_CREATED':
      return `${userName} created the group`
    
    case 'GROUP_DELETED':
      return `${userName} deleted the group`
    
    default:
      return activity.description
  }
}