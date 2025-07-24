#!/bin/bash

echo "🚀 Deploying Expense Tracker to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Deploy to Vercel
    echo "🚀 Deploying to Vercel..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deployment successful!"
        echo "Your expense tracker is now live!"
    else
        echo "❌ Deployment failed. Please check your Vercel configuration."
    fi
else
    echo "❌ Build failed. Please fix the errors and try again."
fi