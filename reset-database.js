const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resetDatabase() {
  try {
    console.log('🗑️  Starting database reset...')
    
    // Delete all data in the correct order (respecting foreign key constraints)
    console.log('Deleting budget notifications...')
    await prisma.budgetNotification.deleteMany()
    
    console.log('Deleting notifications...')
    await prisma.notification.deleteMany()
    
    console.log('Deleting comments...')
    await prisma.comment.deleteMany()
    
    console.log('Deleting payments...')
    await prisma.payment.deleteMany()
    
    console.log('Deleting expense splits...')
    await prisma.expenseSplit.deleteMany()
    
    console.log('Deleting group lenders...')
    await prisma.groupLender.deleteMany()
    
    console.log('Deleting group expenses...')
    await prisma.groupExpense.deleteMany()
    
    console.log('Deleting group members...')
    await prisma.groupMember.deleteMany()
    
    console.log('Deleting groups...')
    await prisma.group.deleteMany()
    
    console.log('Deleting transfers...')
    await prisma.transfer.deleteMany()
    
    console.log('Deleting recurring expenses...')
    await prisma.recurringExpense.deleteMany()
    
    console.log('Deleting budgets...')
    await prisma.budget.deleteMany()
    
    console.log('Deleting expenses...')
    await prisma.expense.deleteMany()
    
    console.log('Deleting income...')
    await prisma.income.deleteMany()
    
    console.log('Deleting accounts...')
    await prisma.account.deleteMany()
    
    console.log('Deleting categories...')
    await prisma.category.deleteMany()
    
    console.log('Deleting users...')
    await prisma.user.deleteMany()
    
    console.log('✅ Database reset completed successfully!')
    console.log('📝 All users, transactions, groups, and related data have been deleted.')
    
  } catch (error) {
    console.error('❌ Error resetting database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetDatabase()