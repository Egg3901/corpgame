#!/bin/bash

# Corporate Sim - Unified Startup Script
# This script starts both backend and frontend services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Corporate Sim Application...${NC}"

# Check if we're in production mode
MODE=${1:-dev}

if [ "$MODE" = "prod" ]; then
    echo -e "${YELLOW}Production mode detected${NC}"
    
    # Build backend
    echo -e "${GREEN}Building backend...${NC}"
    cd backend
    npm run build
    cd ..
    
    # Build frontend
    echo -e "${GREEN}Building frontend...${NC}"
    cd frontend
    npm run build
    cd ..
    
    # Start production servers
    echo -e "${GREEN}Starting production servers...${NC}"
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    echo -e "${GREEN}Backend PID: $BACKEND_PID${NC}"
    echo -e "${GREEN}Frontend PID: $FRONTEND_PID${NC}"
    echo -e "${GREEN}Application started in production mode${NC}"
    
    # Wait for processes
    wait $BACKEND_PID $FRONTEND_PID
else
    echo -e "${YELLOW}Development mode detected${NC}"
    
    # Start development servers
    echo -e "${GREEN}Starting development servers...${NC}"
    npm run dev
fi
