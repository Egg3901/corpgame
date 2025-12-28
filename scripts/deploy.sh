#!/bin/bash
set -e  # Exit on error

LOG_FILE="logs/deployment.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Helper function to log with timestamp
log() {
  echo "[$TIMESTAMP] $1" | tee -a "$LOG_FILE"
}

log "=== DEPLOYMENT STARTED ==="
log "Branch: $(git branch --show-current)"
log "Commit: $(git rev-parse --short HEAD)"

# Step 1: Git Pull
log "Step 1: Pulling from current branch..."
git pull origin "$(git branch --show-current)" 2>&1 | tee -a "$LOG_FILE"

# Step 2: Backend Build
log "Step 2: Building backend..."
cd backend
npm install 2>&1 | tee -a "../$LOG_FILE"
npm run build 2>&1 | tee -a "../$LOG_FILE"
cd ..

# Step 3: Frontend Build
log "Step 3: Building frontend..."
cd frontend
npm install 2>&1 | tee -a "../$LOG_FILE"
npm run build 2>&1 | tee -a "../$LOG_FILE"
cd ..

# Step 4: PM2 Reload
log "Step 4: Reloading PM2 processes..."
pm2 reload ecosystem.config.js 2>&1 | tee -a "$LOG_FILE"

log "=== DEPLOYMENT COMPLETED SUCCESSFULLY ==="
log "Deployed commit: $(git rev-parse --short HEAD)"

exit 0
