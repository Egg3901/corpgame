#!/bin/bash

# Test Database Connection Script
# Run this after fixing pg_hba.conf

echo "========================================="
echo "Testing Database Connection"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd ~/corpgame/backend

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Loaded .env file${NC}"
else
    echo -e "${RED}✗ .env file not found${NC}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Testing connection with DATABASE_URL...${NC}"
echo ""

# Test 1: Simple connection test
echo -e "${YELLOW}Test 1: Basic connection test${NC}"
if psql "$DATABASE_URL" -c "SELECT 1 as test;" 2>&1 | grep -q "test"; then
    echo -e "${GREEN}✓ Database connection successful!${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    echo "Error output:"
    psql "$DATABASE_URL" -c "SELECT 1;" 2>&1
    exit 1
fi
echo ""

# Test 2: Check if users table exists
echo -e "${YELLOW}Test 2: Check users table${NC}"
if psql "$DATABASE_URL" -c "\d users" 2>&1 | grep -q "Table"; then
    echo -e "${GREEN}✓ Users table exists${NC}"
    
    # Check for required columns
    echo -e "${YELLOW}Checking required columns...${NC}"
    COLUMNS=$(psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY column_name;" 2>/dev/null)
    
    REQUIRED=("id" "email" "username" "password_hash" "player_name" "gender" "age" "starting_state" "created_at" "is_admin" "profile_slug" "registration_ip" "last_login_ip" "last_login_at" "is_banned" "banned_at" "banned_reason" "banned_by")
    for col in "${REQUIRED[@]}"; do
        if echo "$COLUMNS" | grep -qi "$col"; then
            echo -e "${GREEN}  ✓ Column '$col' exists${NC}"
        else
            echo -e "${RED}  ✗ Column '$col' is MISSING${NC}"
        fi
    done
else
    echo -e "${RED}✗ Users table does not exist${NC}"
    echo -e "${YELLOW}Run migrations:${NC}"
    echo "  npm run migrate   # from backend/"
fi
echo ""

# Test 3: Test a query
echo -e "${YELLOW}Test 3: Test database query${NC}"
USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
if [ ! -z "$USER_COUNT" ]; then
    echo -e "${GREEN}✓ Query successful. Current users in database: $USER_COUNT${NC}"
else
    echo -e "${RED}✗ Query failed${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}Database connection test complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. If all tests passed, restart backend: pm2 restart corpgame-backend"
echo "2. Check logs: pm2 logs corpgame-backend --lines 50"
echo "3. Try registering a user from the frontend"
echo ""

