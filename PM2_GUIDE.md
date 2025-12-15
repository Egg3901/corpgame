# PM2 Management Guide for Corporate Sim

This guide explains how to use PM2 to manage and restart your Corporate Sim application.

## Prerequisites

Install PM2 globally:
```bash
npm install -g pm2
```

## Quick Start (Development Mode)

**Easiest way to run both frontend and backend:**

```bash
# Option 1: Simple npm command (uses concurrently)
npm run dev

# Option 2: Use PM2 for better process management
npm run start:pm2
# or
pm2 start ecosystem.config.js

# Option 3: Use the start script (auto-detects PM2)
bash start-dev.sh        # Linux/Mac
start-dev.bat            # Windows
```

This will start both backend (port 3001) and frontend (port 3000) in development mode with auto-reload.

## Production Setup

### 1. Build the Application

First, build both backend and frontend:

```bash
# Option 1: Use the build script
bash scripts/build-and-start.sh

# Option 2: Manual build
cd backend && npm install && npm run build && cd ..
cd frontend && npm install && npm run build && cd ..
```

### 2. Create Logs Directory

```bash
mkdir -p logs
```

### 3. Start with PM2 (Production)

```bash
npm run start:pm2:prod
# or
NODE_ENV=production pm2 start ecosystem.config.js
```

This will start both backend and frontend processes in production mode.

## Common PM2 Commands

### View Status
```bash
# List all processes
pm2 list

# Show detailed info
pm2 show corpgame-backend
pm2 show corpgame-frontend
```

### Restart Application
```bash
# Restart all processes
pm2 restart ecosystem.config.js

# Restart specific process
pm2 restart corpgame-backend
pm2 restart corpgame-frontend

# Restart all
pm2 restart all
```

### Stop Application
```bash
# Stop all processes
pm2 stop ecosystem.config.js

# Stop specific process
pm2 stop corpgame-backend
pm2 stop corpgame-frontend

# Stop all
pm2 stop all
```

### Delete from PM2
```bash
# Delete all processes
pm2 delete ecosystem.config.js

# Delete specific process
pm2 delete corpgame-backend
pm2 delete corpgame-frontend
```

### View Logs
```bash
# View all logs
pm2 logs

# View specific process logs
pm2 logs corpgame-backend
pm2 logs corpgame-frontend

# View last 100 lines
pm2 logs --lines 100

# Follow logs (like tail -f)
pm2 logs --follow
```

### Monitor
```bash
# Real-time monitoring dashboard
pm2 monit
```

## After Code Changes

### Development Mode (with auto-reload)
For development, you might want to use the dev scripts instead:
```bash
npm run dev
```

### Production Mode (with PM2)
After making code changes:

1. **Rebuild the application:**
   ```bash
   bash scripts/build-and-start.sh
   ```

2. **Restart PM2 processes:**
   ```bash
   pm2 restart ecosystem.config.js
   ```

   Or reload (zero-downtime restart):
   ```bash
   pm2 reload ecosystem.config.js
   ```

## Auto-Start on Server Reboot

To make PM2 start automatically on server reboot:

```bash
# Generate startup script
pm2 startup

# Save current PM2 process list
pm2 save
```

This will create a systemd service (on Linux) that starts PM2 on boot.

## Environment Variables

Set environment variables in `ecosystem.config.js` or use `.env` files:

```bash
# Backend .env file (backend/.env)
DATABASE_URL=postgresql://user:password@localhost:5432/corpgame
JWT_SECRET=your-secret-key
PORT=3001
FRONTEND_URL=http://localhost:3000

# Frontend .env file (frontend/.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Quick Reference

| Task | Command |
|------|---------|
| Start | `pm2 start ecosystem.config.js` |
| Restart | `pm2 restart ecosystem.config.js` |
| Stop | `pm2 stop ecosystem.config.js` |
| Delete | `pm2 delete ecosystem.config.js` |
| View logs | `pm2 logs` |
| Monitor | `pm2 monit` |
| Status | `pm2 list` |
| Reload (zero-downtime) | `pm2 reload ecosystem.config.js` |

## Troubleshooting

### Process won't start
```bash
# Check logs
pm2 logs

# Check if ports are in use
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Kill processes on ports if needed
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:3001)
```

### Rebuild after major changes
```bash
# Stop PM2
pm2 stop all

# Rebuild
bash scripts/build-and-start.sh

# Start again
pm2 start ecosystem.config.js
```

### Clear logs
```bash
pm2 flush
```


