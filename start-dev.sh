#!/bin/bash

# Simple script to start both frontend and backend in development mode
# Usage: bash start-dev.sh

echo "🚀 Starting Corporate Sim in development mode..."
echo ""

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "📦 Using PM2 to manage processes..."
    echo ""
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Start with PM2
    pm2 start ecosystem.config.js
    
    echo ""
    echo "✅ Started! View logs with: pm2 logs"
    echo "🛑 Stop with: pm2 stop ecosystem.config.js"
    echo "🔄 Restart with: pm2 restart ecosystem.config.js"
else
    echo "📦 PM2 not found. Using npm concurrently..."
    echo "💡 Install PM2 for better process management: npm install -g pm2"
    echo ""
    
    # Fallback to npm dev script
    npm run dev
fi
