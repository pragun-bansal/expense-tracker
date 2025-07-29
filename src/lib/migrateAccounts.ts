import { prisma } from './prisma'

export async function migrateOldOthersAccounts() {
  try {
    // Find all old "Others" accounts with type "OTHER"
    const oldOthersAccounts = await prisma.userAccount.findMany({
      where: {
        name: 'Others',
        type: 'OTHER'
      }
    })

    for (const oldAccount of oldOthersAccounts) {
      // Check if user already has a new OTHERS_FIXED account
      const newOthersAccount = await prisma.userAccount.findFirst({
        where: {
          userId: oldAccount.userId,
          type: 'OTHERS_FIXED'
        }
      })

      if (newOthersAccount) {
        // Migrate transactions from old account to new account
        await prisma.expense.updateMany({
          where: { accountId: oldAccount.id },
          data: { accountId: newOthersAccount.id }
        })

        await prisma.income.updateMany({
          where: { accountId: oldAccount.id },
          data: { accountId: newOthersAccount.id }
        })

        // Update new account balance to include old account balance
        await prisma.userAccount.update({
          where: { id: newOthersAccount.id },
          data: {
            balance: {
              increment: oldAccount.balance
            }
          }
        })

        // Delete the old account
        await prisma.userAccount.delete({
          where: { id: oldAccount.id }
        })

        console.log(`Migrated and removed old Others account for user ${oldAccount.userId}`)
      } else {
        // Convert old account to new type
        await prisma.userAccount.update({
          where: { id: oldAccount.id },
          data: { type: 'OTHERS_FIXED' }
        })

        console.log(`Converted old Others account to OTHERS_FIXED for user ${oldAccount.userId}`)
      }
    }

    console.log('Account migration completed successfully')
  } catch (error) {
    console.error('Error during account migration:', error)
    throw error
  }
}