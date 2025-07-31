const { MongoClient } = require('mongodb')
require('dotenv').config()

async function clearMongoDB() {
  const client = new MongoClient(process.env.DATABASE_URL)
  
  try {
    console.log('🔌 Connecting to MongoDB...')
    await client.connect()
    
    const db = client.db('fina')
    console.log('✅ Connected to MongoDB database: fina')
    
    // Get all collections
    const collections = await db.listCollections().toArray()
    console.log(`📊 Found ${collections.length} collections`)
    
    // Drop all collections
    for (const collection of collections) {
      console.log(`🗑️  Dropping collection: ${collection.name}`)
      await db.collection(collection.name).drop()
    }
    
    console.log('✅ All collections dropped successfully!')
    console.log('🎉 MongoDB database completely cleared!')
    
  } catch (error) {
    console.error('❌ Error clearing MongoDB:', error)
    throw error
  } finally {
    await client.close()
    console.log('🔌 MongoDB connection closed')
  }
}

// Run the script
clearMongoDB()
  .then(() => {
    console.log('🏁 Database clearing completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Database clearing failed:', error)
    process.exit(1)
  })