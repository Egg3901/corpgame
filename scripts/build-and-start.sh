#!/bin/bash

# Build and Start Script for PM2
# This script builds both frontend and backend, then PM2 will start them

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Corporate Sim Application...${NC}"

# Build backend
echo -e "${YELLOW}Building backend...${NC}"
cd backend
npm install
npm run build
cd ..

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd frontend
npm install
npm run build
cd ..

echo -e "${GREEN}Build complete!${NC}"
echo -e "${GREEN}Now run: pm2 start ecosystem.config.js${NC}"





