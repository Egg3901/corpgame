#!/bin/bash

# CORS Fix Script for Corpgame Backend
# Run this on your EC2 server to fix CORS issues

set -e

echo "========================================="
echo "Corpgame CORS Fix Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Navigate to project
echo -e "${YELLOW}Step 1: Navigating to project directory...${NC}"
cd ~/corpgame 2>/dev/null || cd ~/corporate-sim 2>/dev/null || {
    echo -e "${RED}Error: Project directory not found. Are you in the right location?${NC}"
    exit 1
}
echo -e "${GREEN}✓ Found project directory${NC}"
echo ""

# Step 2: Pull latest code
echo -e "${YELLOW}Step 2: Pulling latest code...${NC}"
git pull || echo -e "${YELLOW}Warning: git pull failed (may not be a git repo or no changes)${NC}"
echo ""

# Step 3: Check FRONTEND_URL environment variable
echo -e "${YELLOW}Step 3: Checking backend environment variables...${NC}"
if [ -f backend/.env ]; then
    FRONTEND_URL=$(grep FRONTEND_URL backend/.env | cut -d '=' -f2)
    if [ -z "$FRONTEND_URL" ]; then
        echo -e "${RED}✗ FRONTEND_URL not found in backend/.env${NC}"
        echo -e "${YELLOW}Adding FRONTEND_URL...${NC}"
        echo "" >> backend/.env
        echo "FRONTEND_URL=http://ec2-98-89-26-163.compute-1.amazonaws.com" >> backend/.env
        echo -e "${GREEN}✓ Added FRONTEND_URL to backend/.env${NC}"
    else
        echo -e "${GREEN}✓ FRONTEND_URL found: $FRONTEND_URL${NC}"
        # Check if it matches the current hostname
        CURRENT_HOST=$(hostname -f 2>/dev/null || echo "ec2-98-89-26-163.compute-1.amazonaws.com")
        if [[ ! "$FRONTEND_URL" =~ "$CURRENT_HOST" ]]; then
            echo -e "${YELLOW}Warning: FRONTEND_URL may not match your EC2 hostname${NC}"
            echo -e "${YELLOW}Current: $FRONTEND_URL${NC}"
            echo -e "${YELLOW}Expected: http://$CURRENT_HOST or similar${NC}"
        fi
    fi
else
    echo -e "${RED}✗ backend/.env file not found!${NC}"
    echo -e "${YELLOW}Creating backend/.env file...${NC}"
    cat > backend/.env << EOF
DATABASE_URL=postgresql://corporatesim_user:your_password@localhost:5432/corporate_sim
JWT_SECRET=$(openssl rand -hex 32)
PORT=3001
FRONTEND_URL=http://ec2-98-89-26-163.compute-1.amazonaws.com
NODE_ENV=production
EOF
    echo -e "${GREEN}✓ Created backend/.env (you may need to edit DATABASE_URL and JWT_SECRET)${NC}"
fi
echo ""

# Step 4: Check if backend is running
echo -e "${YELLOW}Step 4: Checking PM2 status...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 status
    BACKEND_RUNNING=$(pm2 list | grep -c "corpgame-backend\|corporate-sim-backend" || echo "0")
    if [ "$BACKEND_RUNNING" -eq 0 ]; then
        echo -e "${YELLOW}Backend not running in PM2${NC}"
    else
        echo -e "${GREEN}✓ Backend process found in PM2${NC}"
    fi
else
    echo -e "${RED}✗ PM2 not found${NC}"
fi
echo ""

# Step 5: Rebuild backend
echo -e "${YELLOW}Step 5: Rebuilding backend TypeScript...${NC}"
cd backend
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend built successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Step 6: Restart backend
echo -e "${YELLOW}Step 6: Restarting backend with PM2...${NC}"
if command -v pm2 &> /dev/null; then
    # Try to restart existing process
    pm2 restart corpgame-backend 2>/dev/null || \
    pm2 restart corporate-sim-backend 2>/dev/null || \
    pm2 delete corpgame-backend 2>/dev/null || \
    pm2 delete corporate-sim-backend 2>/dev/null
    
    # Start fresh
    pm2 start dist/server.js --name corpgame-backend || {
        echo -e "${RED}✗ Failed to start backend${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Backend restarted${NC}"
    pm2 save
else
    echo -e "${RED}✗ PM2 not available, cannot restart${NC}"
fi
echo ""

# Step 7: Check logs
echo -e "${YELLOW}Step 7: Checking backend logs (last 20 lines)...${NC}"
echo "----------------------------------------"
pm2 logs corpgame-backend --lines 20 --nostream 2>/dev/null || \
pm2 logs corporate-sim-backend --lines 20 --nostream 2>/dev/null || \
echo "Could not retrieve logs"
echo "----------------------------------------"
echo ""

# Step 8: Test backend
echo -e "${YELLOW}Step 8: Testing backend endpoints...${NC}"
sleep 2  # Give backend time to start

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health 2>/dev/null || echo "FAILED")
if [ "$HEALTH_RESPONSE" != "FAILED" ]; then
    echo -e "${GREEN}✓ Health endpoint responding: $HEALTH_RESPONSE${NC}"
else
    echo -e "${RED}✗ Health endpoint not responding${NC}"
fi

# Test CORS endpoint
CORS_RESPONSE=$(curl -s -H "Origin: http://ec2-98-89-26-163.compute-1.amazonaws.com:3000" \
    http://localhost:3001/api/cors-test 2>/dev/null || echo "FAILED")
if [ "$CORS_RESPONSE" != "FAILED" ]; then
    echo -e "${GREEN}✓ CORS test endpoint responding${NC}"
else
    echo -e "${RED}✗ CORS test endpoint not responding${NC}"
fi

# Test OPTIONS preflight
OPTIONS_RESPONSE=$(curl -s -X OPTIONS \
    -H "Origin: http://ec2-98-89-26-163.compute-1.amazonaws.com:3000" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type" \
    -v http://localhost:3001/api/auth/register 2>&1 | grep -i "access-control-allow-origin" || echo "FAILED")
if [[ "$OPTIONS_RESPONSE" != *"FAILED"* ]] && [[ -n "$OPTIONS_RESPONSE" ]]; then
    echo -e "${GREEN}✓ OPTIONS preflight responding with CORS headers${NC}"
else
    echo -e "${RED}✗ OPTIONS preflight not responding correctly${NC}"
    echo -e "${YELLOW}This may indicate a CORS configuration issue${NC}"
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}Fix script completed!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Check PM2 logs: pm2 logs corpgame-backend"
echo "2. Check backend logs for CORS configuration messages"
echo "3. Test registration from your browser"
echo "4. If still failing, check security group allows port 3001"
echo ""


