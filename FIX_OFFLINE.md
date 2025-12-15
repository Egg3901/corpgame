# Fix "Offline" Issue - Step by Step

## On Your EC2 Server, Run These Commands:

### Step 1: Check Current Status
```bash
pm2 list
pm2 logs --lines 50
```

### Step 2: Stop Everything
```bash
pm2 stop all
pm2 delete all
```

### Step 3: Pull Latest Code (to get the fixes)
```bash
git pull
```

### Step 4: Install Dependencies (if needed)
```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### Step 5: Build Everything
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

### Step 6: Create Frontend Environment File
```bash
echo "NEXT_PUBLIC_API_URL=http://ec2-54-227-78-77.compute-1.amazonaws.com:3001" > frontend/.env.production
```

### Step 7: Create Logs Directory
```bash
mkdir -p logs
```

### Step 8: Start with PM2 (Production Mode)
```bash
NODE_ENV=production pm2 start ecosystem.config.js
```

### Step 9: Verify Everything is Running
```bash
# Check PM2 status
pm2 list

# Should show both processes as "online"

# Test backend locally
curl http://localhost:3001/health

# Test frontend locally  
curl http://localhost:3000

# Test from outside (replace with your EC2 IP)
curl http://ec2-54-227-78-77.compute-1.amazonaws.com:3001/health
curl http://ec2-54-227-78-77.compute-1.amazonaws.com:3000
```

### Step 10: Save PM2 Configuration
```bash
pm2 save
```

## If Still Not Working

### Check Logs for Errors:
```bash
pm2 logs corpgame-backend --lines 100
pm2 logs corpgame-frontend --lines 100
```

### Common Issues:

1. **"Cannot find module"** → Run `npm install` in that directory
2. **"Port already in use"** → Kill the process: `sudo lsof -i :3000` then `sudo kill -9 <PID>`
3. **"EADDRINUSE"** → Port conflict, check what's using it
4. **Database connection error** → Check `backend/.env` has correct DATABASE_URL

### Manual Start (for testing):
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
cd frontend
npm start
```

## Expected Results

After running these commands:
- ✅ `pm2 list` shows both processes as "online"
- ✅ `curl http://localhost:3001/health` returns `{"status":"ok"}`
- ✅ `curl http://localhost:3000` returns HTML
- ✅ Browser can access http://ec2-54-227-78-77.compute-1.amazonaws.com:3000
