const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function forceClearDatabase() {
  try {
    console.log('🗑️  Force clearing MongoDB database...')
    
    // Use raw MongoDB commands to drop all collections
    const collections = [
      'users', 'user_accounts', 'categories', 'expenses', 'incomes', 
      'budgets', 'groups', 'group_members', 'group_expenses', 'group_lenders',
      'expense_splits', 'payments', 'comments', 'transfers', 'recurring_expenses',
      'notifications', 'budget_notifications', 'settlements', 'activity_logs',
      'lendings', 'borrowings', 'nextauth_accounts', 'sessions', 'verificationtokens'
    ]
    
    for (const collection of collections) {
      try {
        console.log(`Dropping collection: ${collection}`)
        await prisma.$runCommandRaw({
          drop: collection
        })
        console.log(`✅ Dropped ${collection}`)
      } catch (error) {
        console.log(`⚠️  Collection ${collection} might not exist or already dropped`)
      }
    }
    
    console.log('🎉 Database force cleared!')
    
  } catch (error) {
    console.error('❌ Error force clearing database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
forceClearDatabase()
  .then(() => {
    console.log('✅ Force clear completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Force clear failed:', error)
    process.exit(1)
  })