# Startup Guide - How to Start Both Backend and Frontend

This guide explains the different ways to start both the backend and frontend services.

## Quick Start

### Development Mode (Recommended for local development)

**Option 1: Using npm concurrently (simplest)**
```bash
npm run dev
```
This starts both services simultaneously with auto-reload.

**Option 2: Using PM2 (better process management)**
```bash
npm run start:pm2
# or
pm2 start ecosystem.config.js
```

**Option 3: Using startup scripts**
```bash
# Linux/Mac
bash start-dev.sh

# Windows
start-dev.bat
```

### Production Mode (For EC2/server deployment)

**Step 1: Build both applications**
```bash
# Build backend
cd backend
npm run build
cd ..

# Build frontend
cd frontend
npm run build
cd ..
```

**Step 2: Start with PM2**
```bash
# Set production environment
export NODE_ENV=production

# Start with PM2
npm run start:pm2:prod
# or
NODE_ENV=production pm2 start ecosystem.config.js
```

## Detailed Methods

### Method 1: Development with npm concurrently

**Pros:**
- Simple, no additional tools needed
- Auto-reload on code changes
- See both logs in one terminal

**Usage:**
```bash
npm run dev
```

**Stop:**
Press `Ctrl+C` in the terminal

---

### Method 2: Development with PM2

**Pros:**
- Better process management
- Automatic restarts on crashes
- Logs saved to files
- Can run in background

**Usage:**
```bash
npm run start:pm2
```

**Management commands:**
```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs corpgame-backend    # Backend only
pm2 logs corpgame-frontend   # Frontend only

# Stop
pm2 stop ecosystem.config.js
# or
npm run stop:pm2

# Restart
pm2 restart ecosystem.config.js
# or
npm run restart:pm2

# Stop and delete
pm2 delete ecosystem.config.js
```

---

### Method 3: Separate terminals (manual)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Pros:**
- See logs separately
- Easy to debug individual services

**Stop:**
Press `Ctrl+C` in each terminal

---

### Method 4: Production deployment (PM2)

**Prerequisites:**
1. Build both applications
2. Set environment variables
3. Database migrations completed

**Steps:**
```bash
# 1. Build backend
cd backend
npm run build
cd ..

# 2. Build frontend
cd frontend
npm run build
cd ..

# 3. Start with PM2 in production mode
NODE_ENV=production pm2 start ecosystem.config.js

# 4. Save PM2 configuration
pm2 save

# 5. (Optional) Set PM2 to start on system boot
pm2 startup
# Follow the instructions it outputs
```

---

## Environment Variables Required

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/corporate_sim
JWT_SECRET=your-secret-key-here
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**For production on EC2:**
```env
FRONTEND_URL=http://your-ec2-ip:3000
NODE_ENV=production
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**For production on EC2:**
```env
NEXT_PUBLIC_API_URL=http://your-ec2-ip:3001
```

**Note:** With the latest update, the frontend automatically detects the API URL from the browser location, so this may not be needed in all cases.

---

## Verification

After starting, verify both services are running:

### Check Backend
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### Check Frontend
```bash
curl http://localhost:3000
# Should return HTML
```

### Check with PM2
```bash
pm2 status
# Should show both apps as "online"
```

### Check logs
```bash
# With PM2
pm2 logs

# Or check individual logs
tail -f logs/backend-out.log
tail -f logs/frontend-out.log
```

---

## Troubleshooting

### Port already in use
```bash
# Find what's using the port
# Linux/Mac
lsof -i :3000
lsof -i :3001

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# Kill the process or change ports in .env
```

### PM2 processes not starting
```bash
# Check logs
pm2 logs

# Check if builds completed
ls backend/dist/server.js  # Should exist
ls frontend/.next          # Should exist

# Restart
pm2 delete all
pm2 start ecosystem.config.js
```

### Database connection errors
```bash
# Verify PostgreSQL is running
# Linux/Mac
sudo systemctl status postgresql

# Check connection string in backend/.env
# Test connection
psql -U username -d corporate_sim
```

### Frontend can't connect to backend
1. Check backend is running: `curl http://localhost:3001/health`
2. Check CORS settings in `backend/src/server.ts`
3. Check `FRONTEND_URL` in backend `.env` matches where frontend is accessed
4. For production, ensure security groups allow port 3001

---

## Recommended Setup

**For Local Development:**
- Use `npm run dev` (concurrently) for simplicity
- Or use `npm run start:pm2` if you prefer PM2

**For Production/EC2:**
1. Build both applications
2. Use PM2 with `NODE_ENV=production`
3. Set up PM2 to start on boot
4. Configure environment variables
5. Set up security groups/firewall rules

---

## Quick Reference

| Task | Command |
|------|---------|
| Start dev mode | `npm run dev` |
| Start with PM2 | `npm run start:pm2` |
| Start production | `NODE_ENV=production npm run start:pm2:prod` |
| Stop PM2 | `npm run stop:pm2` |
| Restart PM2 | `npm run restart:pm2` |
| View logs | `npm run logs:pm2` or `pm2 logs` |
| Check status | `pm2 status` |
| Build backend | `cd backend && npm run build` |
| Build frontend | `cd frontend && npm run build` |






