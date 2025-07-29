const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearDatabase() {
  try {
    console.log('🗑️  Starting database cleanup...')
    
    // Delete all data in the correct order to handle foreign key constraints
    console.log('Deleting activity logs...')
    await prisma.activityLog.deleteMany({})
    
    console.log('Deleting budget notifications...')
    await prisma.budgetNotification.deleteMany({})
    
    console.log('Deleting notifications...')
    await prisma.notification.deleteMany({})
    
    console.log('Deleting comments...')
    await prisma.comment.deleteMany({})
    
    console.log('Deleting transfers...')
    await prisma.transfer.deleteMany({})
    
    console.log('Deleting expense splits...')
    await prisma.expenseSplit.deleteMany({})
    
    console.log('Deleting group lenders...')
    await prisma.groupLender.deleteMany({})
    
    console.log('Deleting group expenses...')
    await prisma.groupExpense.deleteMany({})
    
    console.log('Deleting settlements...')
    await prisma.settlement.deleteMany({})
    
    console.log('Deleting group members...')
    await prisma.groupMember.deleteMany({})
    
    console.log('Deleting groups...')
    await prisma.group.deleteMany({})
    
    console.log('Deleting recurring expenses...')
    await prisma.recurringExpense.deleteMany({})
    
    console.log('Deleting budgets...')
    await prisma.budget.deleteMany({})
    
    console.log('Deleting lending transactions...')
    await prisma.lending.deleteMany({})
    
    console.log('Deleting borrowing transactions...')
    await prisma.borrowing.deleteMany({})
    
    console.log('Deleting expenses...')
    await prisma.expense.deleteMany({})
    
    console.log('Deleting incomes...')
    await prisma.income.deleteMany({})
    
    console.log('Deleting payments...')
    await prisma.payment.deleteMany({})
    
    console.log('Deleting categories...')
    await prisma.category.deleteMany({})
    
    console.log('Deleting user accounts...')
    await prisma.userAccount.deleteMany({})
    
    console.log('Deleting NextAuth sessions...')
    await prisma.session.deleteMany({})
    
    console.log('Deleting NextAuth accounts...')
    await prisma.account.deleteMany({})
    
    console.log('Deleting verification tokens...')
    await prisma.verificationToken.deleteMany({})
    
    console.log('Deleting users...')
    await prisma.user.deleteMany({})
    
    console.log('✅ Database cleared successfully!')
    console.log('All tables have been emptied.')
    
  } catch (error) {
    console.error('❌ Error clearing database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
clearDatabase()
  .then(() => {
    console.log('🎉 Database cleanup completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Database cleanup failed:', error)
    process.exit(1)
  })