import { prisma } from './prisma'
import { getOrCreateOthersAccount, getOrCreateGroupLendingAccount } from './specialAccounts'

export async function createPersonalTransactionsForGroupExpense(
  groupExpenseId: string,
  groupExpense: {
    description: string
    amount: number
    date: Date
    groupId: string
  },
  lenders: Array<{
    userId: string
    amount: number
    accountId?: string
  }>,
  splits: Array<{
    userId: string
    amount: number
  }>
) {
  // Get or create default categories
  const defaultGroupCategory = await getOrCreateGroupCategory()

  // Process each user only once, handling both their lending and borrowing
  const processedUsers = new Set<string>()
  
  // First, process all lenders
  for (const lender of lenders) {
    if (processedUsers.has(lender.userId)) continue
    processedUsers.add(lender.userId)
    
    // Create expense in the selected account (or Others if not specified)
    const accountId = lender.accountId || (await getOrCreateOthersAccount(lender.userId)).id
    
    // Find if this user is also a borrower
    const userSplit = splits.find(split => split.userId === lender.userId)
    const userBorrowAmount = userSplit ? userSplit.amount : 0
    
    // Calculate net amount (lent - borrowed)
    const netAmount = lender.amount - userBorrowAmount
    
    if (netAmount > 0) {
      // User is a net lender
      await prisma.expense.create({
        data: {
          amount: lender.amount,
          description: `[Group] ${groupExpense.description}`,
          date: groupExpense.date,
          userId: lender.userId,
          accountId: accountId,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'LENDER'
        }
      })
      await updateAccountBalance(accountId, -lender.amount)
      
      // Track net lending in Group Lending/Borrowing account
      const groupLendingAccount = await getOrCreateGroupLendingAccount(lender.userId)
      await prisma.income.create({
        data: {
          amount: netAmount,
          description: `[Group Net] ${groupExpense.description}`,
          date: groupExpense.date,
          userId: lender.userId,
          accountId: groupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'LENDER'
        }
      })
      await updateAccountBalance(groupLendingAccount.id, netAmount)
    } else if (netAmount < 0) {
      // User is a net borrower (borrowed more than they lent)
      const othersAccount = await getOrCreateOthersAccount(lender.userId)
      
      // Create expense for amount they lent
      await prisma.expense.create({
        data: {
          amount: lender.amount,
          description: `[Group] ${groupExpense.description}`,
          date: groupExpense.date,
          userId: lender.userId,
          accountId: accountId,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'LENDER'
        }
      })
      await updateAccountBalance(accountId, -lender.amount)
      
      // Track net borrowing in Group Lending/Borrowing account
      const groupLendingAccount = await getOrCreateGroupLendingAccount(lender.userId)
      await prisma.expense.create({
        data: {
          amount: Math.abs(netAmount),
          description: `[Group Net] ${groupExpense.description}`,
          date: groupExpense.date,
          userId: lender.userId,
          accountId: groupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'BORROWER'
        }
      })
      await updateAccountBalance(groupLendingAccount.id, netAmount)
    } else {
      // Net amount is 0 (lent exactly what they borrowed)
      await prisma.expense.create({
        data: {
          amount: lender.amount,
          description: `[Group] ${groupExpense.description}`,
          date: groupExpense.date,
          userId: lender.userId,
          accountId: accountId,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'LENDER'
        }
      })
      await updateAccountBalance(accountId, -lender.amount)
      // No entry in Group Lending/Borrowing account since it's net zero
    }
  }
  
  // Process borrowers who are not lenders
  for (const split of splits) {
    if (processedUsers.has(split.userId)) continue
    
    const othersAccount = await getOrCreateOthersAccount(split.userId)
    
    // Create expense in Others account representing the borrowed amount
    await prisma.expense.create({
      data: {
        amount: split.amount,
        description: `[Group] ${groupExpense.description}`,
        date: groupExpense.date,
        userId: split.userId,
        accountId: othersAccount.id,
        categoryId: defaultGroupCategory.id,
        groupExpenseId,
        groupType: 'BORROWER'
      }
    })

    // Track borrowing in Group Lending/Borrowing account (negative = money borrowed)
    const groupLendingAccount = await getOrCreateGroupLendingAccount(split.userId)
    await prisma.expense.create({
      data: {
        amount: split.amount,
        description: `[Group Net] ${groupExpense.description}`,
        date: groupExpense.date,
        userId: split.userId,
        accountId: groupLendingAccount.id,
        categoryId: defaultGroupCategory.id,
        groupExpenseId,
        groupType: 'BORROWER'
      }
    })
    await updateAccountBalance(groupLendingAccount.id, -split.amount)
  }
}

export async function createPersonalTransactionsForSettlement(
  groupExpenseId: string,
  settlementAmount: number,
  borrowerUserId: string,
  lenderUserId: string,
  settlementAccountId?: string,
  settlerUserId?: string
) {
  const defaultGroupCategory = await getOrCreateGroupCategory()
  const miscAccount = await getOrCreateMiscellaneousAccount(borrowerUserId)

  if (settlerUserId === borrowerUserId) {
    // Borrower is settling - money going out
    if (settlementAccountId) {
      await prisma.expense.create({
        data: {
          amount: settlementAmount,
          description: `[Group Settlement] Payment to ${await getUserName(lenderUserId)}`,
          date: new Date(),
          userId: borrowerUserId,
          accountId: settlementAccountId,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'SETTLEMENT_PAID'
        }
      })

      // Update account balance (subtract money going out)
      await updateAccountBalance(settlementAccountId, -settlementAmount)
    } else {
      // Settlement from Others account
      await prisma.expense.create({
        data: {
          amount: settlementAmount,
          description: `[Group Settlement] Payment to ${await getUserName(lenderUserId)}`,
          date: new Date(),
          userId: borrowerUserId,
          accountId: miscAccount.id,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'SETTLEMENT_PAID'
        }
      })
    }

    // Lender receives money (income)
    if (settlementAccountId) {
      await prisma.income.create({
        data: {
          amount: settlementAmount,
          description: `[Group Settlement] Payment from ${await getUserName(borrowerUserId)}`,
          date: new Date(),
          userId: lenderUserId,
          accountId: settlementAccountId,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })

      // Update account balance (add money coming in)
      await updateAccountBalance(settlementAccountId, settlementAmount)
    }
  } else {
    // Lender is settling (marking as received)
    if (settlementAccountId) {
      await prisma.income.create({
        data: {
          amount: settlementAmount,
          description: `[Group Settlement] Payment from ${await getUserName(borrowerUserId)}`,
          date: new Date(),
          userId: lenderUserId,
          accountId: settlementAccountId,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })

      // Update account balance (add money coming in)
      await updateAccountBalance(settlementAccountId, settlementAmount)
    }
  }
}

async function getOrCreateGroupCategory() {
  // Try to find existing group category for any user
  let category = await prisma.category.findFirst({
    where: {
      name: 'Group Expenses',
      type: 'EXPENSE'
    }
  })

  if (!category) {
    // Create a default group category for the first user (system category)
    const firstUser = await prisma.user.findFirst()
    if (firstUser) {
      category = await prisma.category.create({
        data: {
          name: 'Group Expenses',
          type: 'EXPENSE',
          color: '#8B5CF6',
          icon: '👥',
          userId: firstUser.id
        }
      })
    } else {
      // If no users exist, something is very wrong
      throw new Error('No users found in database')
    }
  }

  return category
}

async function getOrCreateMiscellaneousAccount(userId: string) {
  // Use the new Others account
  return await getOrCreateOthersAccount(userId)
}

async function updateAccountBalance(accountId: string, amount: number) {
  await prisma.account.update({
    where: { id: accountId },
    data: {
      balance: {
        increment: amount
      }
    }
  })
}

async function getUserName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  return user?.name || user?.email || 'Unknown User'
}