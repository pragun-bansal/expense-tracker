import { prisma } from './prisma'

export async function cleanupDuplicateGroupTransactions() {
  try {
    // Find all group expenses that might have duplicate transactions
    const groupExpenses = await prisma.groupExpense.findMany({
      include: {
        lenders: true,
        splits: true
      }
    })

    for (const groupExpense of groupExpenses) {
      // For each group expense, find all related personal transactions
      const relatedExpenses = await prisma.expense.findMany({
        where: { groupExpenseId: groupExpense.id }
      })

      const relatedIncomes = await prisma.income.findMany({
        where: { groupExpenseId: groupExpense.id }
      })

      // Group transactions by user
      const userTransactions: { [userId: string]: { expenses: any[], incomes: any[] } } = {}

      for (const expense of relatedExpenses) {
        if (!userTransactions[expense.userId]) {
          userTransactions[expense.userId] = { expenses: [], incomes: [] }
        }
        userTransactions[expense.userId].expenses.push(expense)
      }

      for (const income of relatedIncomes) {
        if (!userTransactions[income.userId]) {
          userTransactions[income.userId] = { expenses: [], incomes: [] }
        }
        userTransactions[income.userId].incomes.push(income)
      }

      // For each user, check if they have duplicates
      for (const [userId, transactions] of Object.entries(userTransactions)) {
        const expenses = transactions.expenses
        const incomes = transactions.incomes

        // Check for duplicate expense patterns
        const duplicateGroups: { [description: string]: any[] } = {}
        
        for (const expense of expenses) {
          const key = `${expense.description}-${expense.amount}`
          if (!duplicateGroups[key]) {
            duplicateGroups[key] = []
          }
          duplicateGroups[key].push(expense)
        }

        // Remove duplicates, keeping only one of each type
        for (const [key, duplicates] of Object.entries(duplicateGroups)) {
          if (duplicates.length > 1) {
            // Sort by creation date and keep the first one
            duplicates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            
            // Delete all but the first one
            for (let i = 1; i < duplicates.length; i++) {
              await prisma.expense.delete({
                where: { id: duplicates[i].id }
              })
              console.log(`Deleted duplicate expense: ${duplicates[i].description} for user ${userId}`)
            }
          }
        }

        // Do the same for incomes
        const incomeDuplicateGroups: { [description: string]: any[] } = {}
        
        for (const income of incomes) {
          const key = `${income.description}-${income.amount}`
          if (!incomeDuplicateGroups[key]) {
            incomeDuplicateGroups[key] = []
          }
          incomeDuplicateGroups[key].push(income)
        }

        for (const [key, duplicates] of Object.entries(incomeDuplicateGroups)) {
          if (duplicates.length > 1) {
            duplicates.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            
            for (let i = 1; i < duplicates.length; i++) {
              await prisma.income.delete({
                where: { id: duplicates[i].id }
              })
              console.log(`Deleted duplicate income: ${duplicates[i].description} for user ${userId}`)
            }
          }
        }
      }
    }

    console.log('Cleanup of duplicate group transactions completed')
  } catch (error) {
    console.error('Error during cleanup:', error)
    throw error
  }
}