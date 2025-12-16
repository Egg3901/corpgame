#!/bin/bash

# Database Schema Check Script
# Run this on your EC2 server to verify database setup

echo "========================================="
echo "Database Schema Diagnostic"
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we can connect to the database
echo -e "${YELLOW}Step 1: Testing database connection...${NC}"
cd ~/corpgame/backend

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Loaded .env file${NC}"
else
    echo -e "${RED}✗ .env file not found${NC}"
    exit 1
fi

# Extract database connection info
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL not found in .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ DATABASE_URL is set${NC}"
echo ""

# Connect and check schema
echo -e "${YELLOW}Step 2: Checking users table schema...${NC}"

psql "$DATABASE_URL" -c "\d users" 2>&1 | tee /tmp/db_schema_check.txt

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo -e "${YELLOW}Step 3: Verifying required columns...${NC}"
    
    # Check for required columns
    REQUIRED_COLS=("id" "email" "username" "password_hash" "player_name" "gender" "age" "starting_state" "created_at" "is_admin" "profile_slug" "registration_ip" "last_login_ip" "last_login_at" "is_banned" "banned_at" "banned_reason" "banned_by")
    MISSING_COLS=()
    
    for col in "${REQUIRED_COLS[@]}"; do
        if grep -qi "\b$col\b" /tmp/db_schema_check.txt; then
            echo -e "${GREEN}✓ Column '$col' exists${NC}"
        else
            echo -e "${RED}✗ Column '$col' is MISSING${NC}"
            MISSING_COLS+=("$col")
        fi
    done
    
    echo ""
    
    if [ ${#MISSING_COLS[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ All required columns exist!${NC}"
    else
        echo -e "${RED}✗ Missing columns: ${MISSING_COLS[*]}${NC}"
        echo ""
        echo -e "${YELLOW}To fix, run migrations:${NC}"
        echo "cd ~/corpgame/backend"
        echo "npm run migrate"
    fi
else
    echo -e "${RED}✗ Failed to connect to database${NC}"
    echo -e "${YELLOW}Check:${NC}"
    echo "1. PostgreSQL is running: sudo systemctl status postgresql"
    echo "2. DATABASE_URL is correct in backend/.env"
    echo "3. Database user has proper permissions"
fi

echo ""
echo "========================================="

