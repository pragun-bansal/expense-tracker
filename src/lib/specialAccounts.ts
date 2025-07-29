import { prisma } from './prisma'

export async function getOrCreateOthersAccount(userId: string) {
  // Try to find existing Others account
  let account = await prisma.userAccount.findFirst({
    where: {
      userId,
      type: 'OTHERS_FIXED'
    }
  })

  if (!account) {
    // Create the Others account
    account = await prisma.userAccount.create({
      data: {
        name: 'Others',
        type: 'OTHERS_FIXED',
        balance: 0,
        color: '#6B7280',
        userId
      }
    })
  }

  return account
}

export async function getOrCreateGroupLendingAccount(userId: string) {
  // Try to find existing Group Lending/Borrowing account
  let account = await prisma.userAccount.findFirst({
    where: {
      userId,
      type: 'GROUP_LENDING'
    }
  })

  if (!account) {
    // Create the Group Lending/Borrowing account
    account = await prisma.userAccount.create({
      data: {
        name: 'Group Lending/Borrowing',
        type: 'GROUP_LENDING',
        balance: 0,
        color: '#8B5CF6',
        userId
      }
    })
  }

  return account
}

export async function isSpecialAccount(accountId: string): Promise<boolean> {
  const account = await prisma.userAccount.findUnique({
    where: { id: accountId }
  })
  
  return account?.type === 'OTHERS_FIXED' || account?.type === 'GROUP_LENDING'
}

export async function ensureSpecialAccountsExist(userId: string) {
  // Ensure both special accounts exist for the user
  await Promise.all([
    getOrCreateOthersAccount(userId),
    getOrCreateGroupLendingAccount(userId)
  ])
}