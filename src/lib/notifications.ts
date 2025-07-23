import { prisma } from './prisma'
import { NotificationType } from '@prisma/client'

export interface CreateNotificationData {
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedId?: string
  actionUrl?: string
}

export interface NotificationWithMetadata {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: Date
  relatedId?: string
  actionUrl?: string
  icon: string
  color: string
  priority: 'low' | 'medium' | 'high'
}

// Create a notification in the database
export async function createNotification(data: CreateNotificationData): Promise<void> {
  try {
    const notificationData: any = {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      read: false
    }

    // Only add relatedId if it's a valid ObjectId format (24 hex characters)
    if (data.relatedId && /^[0-9a-fA-F]{24}$/.test(data.relatedId)) {
      notificationData.relatedId = data.relatedId
    }

    await prisma.notification.create({
      data: notificationData
    })
    
    console.log(`📢 Notification created: ${data.type} for user ${data.userId}`)
  } catch (error) {
    console.error('Error creating notification:', error)
  }
}

// Get notifications for a user with metadata
export async function getUserNotifications(userId: string, limit: number = 20): Promise<NotificationWithMetadata[]> {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return notifications.map(notification => ({
      ...notification,
      ...getNotificationMetadata(notification.type),
      actionUrl: getActionUrl(notification.type, notification.relatedId)
    }))
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true }
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
  }
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

// Delete a single notification
export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  try {
    await prisma.notification.delete({
      where: { 
        id: notificationId,
        userId: userId // Ensure user owns this notification
      }
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
  }
}

// Delete all notifications for a user
export async function deleteAllNotifications(userId: string): Promise<void> {
  try {
    await prisma.notification.deleteMany({
      where: { userId }
    })
  } catch (error) {
    console.error('Error deleting all notifications:', error)
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({
      where: { userId, read: false }
    })
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

// Helper function to get notification metadata
function getNotificationMetadata(type: NotificationType): { icon: string; color: string; priority: 'low' | 'medium' | 'high' } {
  switch (type) {
    case 'BUDGET_ALERT':
      return { icon: '🚨', color: 'red', priority: 'high' }
    case 'BUDGET_WARNING':
      return { icon: '⚠️', color: 'yellow', priority: 'medium' }
    case 'GROUP_EXPENSE_ADDED':
      return { icon: '💰', color: 'blue', priority: 'medium' }
    case 'GROUP_EXPENSE_SETTLED':
      return { icon: '✅', color: 'green', priority: 'low' }
    case 'GROUP_PAYMENT_RECEIVED':
      return { icon: '💳', color: 'green', priority: 'medium' }
    case 'GROUP_MEMBER_ADDED':
      return { icon: '👥', color: 'blue', priority: 'low' }
    case 'GROUP_MEMBER_REMOVED':
      return { icon: '👋', color: 'gray', priority: 'low' }
    case 'EXPENSE_REMINDER':
      return { icon: '📝', color: 'orange', priority: 'medium' }
    case 'PAYMENT_REMINDER':
      return { icon: '💸', color: 'red', priority: 'high' }
    case 'ACCOUNT_LOW_BALANCE':
      return { icon: '💔', color: 'red', priority: 'high' }
    default:
      return { icon: '📢', color: 'blue', priority: 'medium' }
  }
}

// Helper function to generate action URLs
function getActionUrl(type: NotificationType, relatedId?: string): string {
  switch (type) {
    case 'BUDGET_ALERT':
    case 'BUDGET_WARNING':
      return '/budgets'
    case 'GROUP_EXPENSE_ADDED':
    case 'GROUP_EXPENSE_SETTLED':
    case 'GROUP_PAYMENT_RECEIVED':
      return relatedId ? `/groups/${relatedId}` : '/groups'
    case 'GROUP_MEMBER_ADDED':
    case 'GROUP_MEMBER_REMOVED':
      return relatedId ? `/groups/${relatedId}` : '/groups'
    case 'EXPENSE_REMINDER':
      return '/expenses'
    case 'PAYMENT_REMINDER':
      return '/groups'
    case 'ACCOUNT_LOW_BALANCE':
      return '/accounts'
    default:
      return '/dashboard'
  }
}

// Specialized notification creators
export async function createBudgetAlert(userId: string, categoryId: string, categoryName: string, percentUsed: number, isExceeded: boolean): Promise<void> {
  const type: NotificationType = isExceeded ? 'BUDGET_ALERT' : 'BUDGET_WARNING'
  const title = isExceeded ? 'Budget Exceeded!' : 'Budget Warning'
  const message = `Your ${categoryName} budget is at ${percentUsed.toFixed(1)}% usage${isExceeded ? ' and has been exceeded' : ''}.`
  
  await createNotification({
    userId,
    type,
    title,
    message,
    relatedId: categoryId
  })
}

export async function createGroupExpenseNotification(memberUserId: string, groupId: string, expenseDescription: string, amount: number, addedBy: string): Promise<void> {
  await createNotification({
    userId: memberUserId,
    type: 'GROUP_EXPENSE_ADDED',
    title: 'New Group Expense',
    message: `${addedBy} added "${expenseDescription}" for $${amount.toFixed(2)} to your group.`,
    relatedId: groupId
  })
}

export async function createGroupMemberNotification(memberUserId: string, groupId: string, groupName: string, addedBy: string, isAdded: boolean): Promise<void> {
  const type: NotificationType = isAdded ? 'GROUP_MEMBER_ADDED' : 'GROUP_MEMBER_REMOVED'
  const title = isAdded ? 'Added to Group' : 'Removed from Group'
  const message = isAdded 
    ? `${addedBy} added you to the group "${groupName}".`
    : `You were removed from the group "${groupName}".`
  
  await createNotification({
    userId: memberUserId,
    type,
    title,
    message,
    relatedId: groupId
  })
}

export async function createPaymentNotification(userId: string, groupId: string, amount: number, fromUser: string): Promise<void> {
  await createNotification({
    userId,
    type: 'GROUP_PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: `You received $${amount.toFixed(2)} from ${fromUser} for a group expense.`,
    relatedId: groupId
  })
}

export async function createLowBalanceNotification(userId: string, accountId: string, accountName: string, balance: number): Promise<void> {
  await createNotification({
    userId,
    type: 'ACCOUNT_LOW_BALANCE',
    title: 'Low Account Balance',
    message: `Your ${accountName} account balance is low: $${balance.toFixed(2)}.`,
    relatedId: accountId
  })
}