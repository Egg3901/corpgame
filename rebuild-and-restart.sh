#!/bin/bash

# Rebuild and restart script for Corporate Sim
# This script rebuilds both backend and frontend, then restarts PM2

set -e

echo "🔨 Rebuilding Corporate Sim Application..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Rebuild Backend
echo -e "${YELLOW}Step 1: Building backend...${NC}"
cd backend
if npm run build; then
    echo -e "${GREEN}✓ Backend build successful${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi
cd ..

# Step 2: Rebuild Frontend
echo ""
echo -e "${YELLOW}Step 2: Building frontend...${NC}"
cd frontend
if npm run build; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi
cd ..

# Step 3: Stop PM2 processes
echo ""
echo -e "${YELLOW}Step 3: Stopping PM2 processes...${NC}"
pm2 stop all || true

# Step 4: Delete old processes
echo ""
echo -e "${YELLOW}Step 4: Cleaning up PM2 processes...${NC}"
pm2 delete all || true

# Step 5: Start with PM2
echo ""
echo -e "${YELLOW}Step 5: Starting with PM2...${NC}"
if [ "$NODE_ENV" = "production" ]; then
    NODE_ENV=production pm2 start ecosystem.config.js
else
    pm2 start ecosystem.config.js
fi

# Step 6: Save PM2 configuration
echo ""
echo -e "${YELLOW}Step 6: Saving PM2 configuration...${NC}"
pm2 save

echo ""
echo -e "${GREEN}✅ Rebuild and restart complete!${NC}"
echo ""
echo "View status: pm2 status"
echo "View logs: pm2 logs"
echo ""






