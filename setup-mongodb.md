# MongoDB Setup for Expense Tracker

## Option 1: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user with username/password
4. Get your connection string
5. Update the `DATABASE_URL` in `.env` with your connection string:
   ```
   DATABASE_URL="mongodb+srv://your-username:your-password@cluster.mongodb.net/expense-tracker?retryWrites=true&w=majority"
   ```

## Option 2: Local MongoDB

1. Install MongoDB locally:
   ```bash
   # macOS with Homebrew
   brew tap mongodb/brew
   brew install mongodb-community
   
   # Start MongoDB
   brew services start mongodb/brew/mongodb-community
   ```

2. Update the `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL="mongodb://localhost:27017/expense-tracker"
   ```

## After Setting Up MongoDB

1. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

2. Push the schema to create collections:
   ```bash
   npx prisma db push
   ```

3. (Optional) Open Prisma Studio to view your data:
   ```bash
   npx prisma studio
   ```

## Key Changes Made

- ✅ Updated Prisma schema from SQLite to MongoDB
- ✅ Converted all model IDs to use MongoDB ObjectId format (`@db.ObjectId`)
- ✅ Added proper `@map("_id")` for primary keys
- ✅ Updated all foreign key references to use ObjectId
- ✅ Updated environment variables for MongoDB connection

The schema is now fully compatible with MongoDB and maintains all the existing functionality of your expense tracker application.