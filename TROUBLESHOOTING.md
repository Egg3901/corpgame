# Troubleshooting: "Offline" Issue on EC2

## Quick Diagnostic Steps

### 1. Check PM2 Status
```bash
pm2 list
```

**Expected output:**
- Both `corpgame-backend` and `corpgame-frontend` should show status "online"
- If they show "errored" or "stopped", check logs

### 2. Check PM2 Logs
```bash
# View all logs
pm2 logs

# View specific process logs
pm2 logs corpgame-backend
pm2 logs corpgame-frontend
```

### 3. Check if Processes are Actually Running
```bash
# Check backend
curl http://localhost:3001/health
# Should return: {"status":"ok"}

# Check frontend
curl http://localhost:3000
# Should return HTML

# Check from outside
curl http://ec2-54-227-78-77.compute-1.amazonaws.com:3001/health
curl http://ec2-54-227-78-77.compute-1.amazonaws.com:3000
```

## Common Issues and Fixes

### Issue 1: Frontend Not Built

**Symptom:** PM2 shows frontend as "errored" or logs show "Cannot find module"

**Fix:**
```bash
cd frontend
npm install
npm run build
cd ..
pm2 restart corpgame-frontend
```

### Issue 2: Backend Not Built (Production Mode)

**Symptom:** Backend shows errors about missing dist folder

**Fix:**
```bash
cd backend
npm install
npm run build
cd ..
pm2 restart corpgame-backend
```

### Issue 3: Port Already in Use

**Symptom:** Error "EADDRINUSE: address already in use"

**Fix:**
```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process
sudo kill -9 <PID>

# Or stop PM2 and restart
pm2 stop all
pm2 start ecosystem.config.js
```

### Issue 4: Frontend Can't Connect to Backend

**Symptom:** Frontend loads but shows "Cannot connect to server"

**Fix:**
1. Create `frontend/.env.production`:
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://ec2-54-227-78-77.compute-1.amazonaws.com:3001" > frontend/.env.production
   ```

2. Rebuild frontend:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

3. Restart PM2:
   ```bash
   pm2 restart ecosystem.config.js
   ```

### Issue 5: Everything Shows Offline

**Symptom:** PM2 list shows processes but they're not responding

**Fix:**
```bash
# Stop everything
pm2 stop all
pm2 delete all

# Rebuild everything
bash scripts/build-and-start.sh

# Start fresh
NODE_ENV=production pm2 start ecosystem.config.js

# Check status
pm2 list
pm2 logs
```

## Complete Reset Procedure

If nothing works, do a complete reset:

```bash
# 1. Stop everything
pm2 stop all
pm2 delete all

# 2. Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Build everything
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# 4. Create frontend env file
echo "NEXT_PUBLIC_API_URL=http://ec2-54-227-78-77.compute-1.amazonaws.com:3001" > frontend/.env.production

# 5. Create logs directory
mkdir -p logs

# 6. Start with PM2
NODE_ENV=production pm2 start ecosystem.config.js

# 7. Check status
pm2 list
pm2 logs

# 8. Test
curl http://localhost:3001/health
curl http://localhost:3000
```

## Verify Security Group

Make sure your EC2 Security Group has these inbound rules:

| Type | Protocol | Port Range | Source |
|------|----------|------------|--------|
| Custom TCP | TCP | 3000 | 0.0.0.0/0 |
| Custom TCP | TCP | 3001 | 0.0.0.0/0 |
| SSH | TCP | 22 | Your IP |

## Access URLs

- **Frontend**: http://ec2-54-227-78-77.compute-1.amazonaws.com:3000
- **Backend API**: http://ec2-54-227-78-77.compute-1.amazonaws.com:3001
- **Health Check**: http://ec2-54-227-78-77.compute-1.amazonaws.com:3001/health
