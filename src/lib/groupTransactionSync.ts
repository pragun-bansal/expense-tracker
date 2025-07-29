import { prisma } from './prisma'
import { getOrCreateOthersAccount, getOrCreateGroupLendingAccount } from './specialAccounts'
import { checkBudgetAlert } from './budgetAlerts'

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
): Promise<{
  paidByExpenseId?: string
  paidByLendingId?: string
  memberIncomeIds: string[]
  memberExpenseIds: string[]
  memberLendingIds: string[]
  memberBorrowingIds: string[]
}> {
  console.log(`\n=== CREATING GROUP TRANSACTIONS ===`)
  console.log(`Group Expense: ${groupExpense.description}`)
  console.log(`Lenders:`, lenders)
  console.log(`Splits:`, splits)
  
  // Get or create default categories
  const defaultGroupCategory = await getOrCreateGroupCategory()

  // Track all transaction IDs for reliable deletion/updates
  const transactionIds = {
    paidByExpenseId: undefined as string | undefined,
    paidByLendingId: undefined as string | undefined,
    memberIncomeIds: [] as string[],
    memberExpenseIds: [] as string[],
    memberLendingIds: [] as string[],
    memberBorrowingIds: [] as string[]
  }

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
      const expense = await prisma.expense.create({
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
      
      // Store expense ID - if this is the primary payer, mark as paidByExpenseId
      if (lender.amount === Math.max(...lenders.map(l => l.amount))) {
        transactionIds.paidByExpenseId = expense.id
      } else {
        transactionIds.memberExpenseIds.push(expense.id)
      }
      
      await updateAccountBalance(accountId, -lender.amount)
      
      // Check for budget alerts after creating group expense
      try {
        await checkBudgetAlert(lender.userId, defaultGroupCategory.id)
      } catch (error) {
        console.error('Error checking budget alert for group expense:', error)
      }
      
      // Track net lending in Group Lending/Borrowing account
      const groupLendingAccount = await getOrCreateGroupLendingAccount(lender.userId)
      console.log(`  Creating net lending for ${lender.userId}: $${netAmount}`)
      const lending = await prisma.lending.create({
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
      
      // Store lending ID - if this is the primary payer, mark as paidByLendingId
      if (lender.amount === Math.max(...lenders.map(l => l.amount))) {
        transactionIds.paidByLendingId = lending.id
      } else {
        transactionIds.memberLendingIds.push(lending.id)
      }
      
      await updateAccountBalance(groupLendingAccount.id, netAmount)
      console.log(`  Updated Group Lending account balance: ${groupLendingAccount.id} by +${netAmount}`)
    } else if (netAmount < 0) {
      // User is a net borrower (borrowed more than they lent)
      
      // Create expense for amount they lent in their selected account
      const expense = await prisma.expense.create({
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
      
      // Store expense ID
      transactionIds.memberExpenseIds.push(expense.id)
      await updateAccountBalance(accountId, -lender.amount)
      
      // Check for budget alerts after creating group expense
      try {
        await checkBudgetAlert(lender.userId, defaultGroupCategory.id)
      } catch (error) {
        console.error('Error checking budget alert for group expense:', error)
      }
      
      // Track net borrowing in Group Lending/Borrowing account only
      const groupLendingAccount = await getOrCreateGroupLendingAccount(lender.userId)
      const borrowing = await prisma.borrowing.create({
        data: {
          amount: Math.abs(netAmount),
          description: `[Group] ${groupExpense.description}`,
          date: groupExpense.date,
          userId: lender.userId,
          accountId: groupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'BORROWER'
        }
      })
      
      // Store borrowing ID
      transactionIds.memberBorrowingIds.push(borrowing.id)
      await updateAccountBalance(groupLendingAccount.id, netAmount)
    } else {
      // Net amount is 0 (lent exactly what they borrowed)
      const expense = await prisma.expense.create({
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
      
      // Store expense ID
      transactionIds.memberExpenseIds.push(expense.id)
      await updateAccountBalance(accountId, -lender.amount)
      
      // Check for budget alerts after creating group expense
      try {
        await checkBudgetAlert(lender.userId, defaultGroupCategory.id)
      } catch (error) {
        console.error('Error checking budget alert for group expense:', error)
      }
      // No entry in Group Lending/Borrowing account since it's net zero
    }
  }
  
  // Process borrowers who are not lenders
  for (const split of splits) {
    if (processedUsers.has(split.userId)) continue
    
    // Check for budget alerts (using default category for group expenses)
    try {
      await checkBudgetAlert(split.userId, defaultGroupCategory.id)
    } catch (error) {
      console.error('Error checking budget alert for group expense borrower:', error)
    }

    // Track borrowing in Group Lending/Borrowing account only (negative = money borrowed)
    const groupLendingAccount = await getOrCreateGroupLendingAccount(split.userId)
    const borrowing = await prisma.borrowing.create({
      data: {
        amount: split.amount,
        description: `[Group] ${groupExpense.description}`,
        date: groupExpense.date,
        userId: split.userId,
        accountId: groupLendingAccount.id,
        categoryId: defaultGroupCategory.id,
        groupExpenseId,
        groupType: 'BORROWER'
      }
    })
    
    // Store borrowing ID
    transactionIds.memberBorrowingIds.push(borrowing.id)
    await updateAccountBalance(groupLendingAccount.id, -split.amount)
  }
  
  return transactionIds
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
  const borrowerGroupLendingAccount = await getOrCreateGroupLendingAccount(borrowerUserId)
  const lenderGroupLendingAccount = await getOrCreateGroupLendingAccount(lenderUserId)

  if (settlerUserId === borrowerUserId) {
    // Borrower is settling - money going out
    if (settlementAccountId) {
      // Create expense in the selected account for the payment
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
      await updateAccountBalance(settlementAccountId, -settlementAmount)
    } else {
      // Settlement from Others account as fallback
      const othersAccount = await getOrCreateOthersAccount(borrowerUserId)
      await prisma.expense.create({
        data: {
          amount: settlementAmount,
          description: `[Group Settlement] Payment to ${await getUserName(lenderUserId)}`,
          date: new Date(),
          userId: borrowerUserId,
          accountId: othersAccount.id,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'SETTLEMENT_PAID'
        }
      })
      await updateAccountBalance(othersAccount.id, -settlementAmount)
    }

    // Reduce borrower's debt in Group Lending/Borrowing account (create offsetting lending)
    await prisma.lending.create({
      data: {
        amount: settlementAmount,
        description: `[Group Settlement] Debt reduction to ${await getUserName(lenderUserId)}`,
        date: new Date(),
        userId: borrowerUserId,
        accountId: borrowerGroupLendingAccount.id,
        categoryId: defaultGroupCategory.id,
        groupExpenseId,
        groupType: 'SETTLEMENT_PAID'
      }
    })
    await updateAccountBalance(borrowerGroupLendingAccount.id, settlementAmount)

    // Lender receives money (income) if account specified
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
      await updateAccountBalance(settlementAccountId, settlementAmount)
    }

    // Reduce lender's credit in Group Lending/Borrowing account (create offsetting borrowing)
    await prisma.borrowing.create({
      data: {
        amount: settlementAmount,
        description: `[Group Settlement] Credit reduction from ${await getUserName(borrowerUserId)}`,
        date: new Date(),
        userId: lenderUserId,
        accountId: lenderGroupLendingAccount.id,
        categoryId: defaultGroupCategory.id,
        groupExpenseId,
        groupType: 'SETTLEMENT_RECEIVED'
      }
    })
    await updateAccountBalance(lenderGroupLendingAccount.id, -settlementAmount)

  } else {
    // Lender is settling (marking as received)
    if (settlementAccountId) {
      // Lender receives money in specified account
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
      await updateAccountBalance(settlementAccountId, settlementAmount)

      // Reduce lender's credit in Group Lending/Borrowing account
      await prisma.borrowing.create({
        data: {
          amount: settlementAmount,
          description: `[Group Settlement] Credit reduction from ${await getUserName(borrowerUserId)}`,
          date: new Date(),
          userId: lenderUserId,
          accountId: lenderGroupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'SETTLEMENT_RECEIVED'
        }
      })
      await updateAccountBalance(lenderGroupLendingAccount.id, -settlementAmount)

      // Reduce borrower's debt in Group Lending/Borrowing account
      await prisma.lending.create({
        data: {
          amount: settlementAmount,
          description: `[Group Settlement] Debt reduction to ${await getUserName(lenderUserId)}`,
          date: new Date(),
          userId: borrowerUserId,
          accountId: borrowerGroupLendingAccount.id,
          categoryId: defaultGroupCategory.id,
          groupExpenseId,
          groupType: 'SETTLEMENT_PAID'
        }
      })
      await updateAccountBalance(borrowerGroupLendingAccount.id, settlementAmount)
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
  await prisma.userAccount.update({
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