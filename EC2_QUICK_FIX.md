# Quick Fix for EC2 Setup

## Issue: Frontend can't connect to backend

## Solution Steps:

### 1. Create Frontend Environment File

On your EC2 server, create `frontend/.env.production`:

```bash
cd /path/to/your/project/frontend
nano .env.production
```

Add this line:
```
NEXT_PUBLIC_API_URL=http://ec2-54-227-78-77.compute-1.amazonaws.com:3001
```

Save and exit (Ctrl+X, then Y, then Enter)

### 2. Make Sure Backend Listens on All Interfaces

The backend server.ts has been updated to listen on `0.0.0.0` instead of just `localhost`. This allows external connections.

### 3. Rebuild Frontend

After creating `.env.production`, rebuild the frontend:

```bash
cd frontend
npm run build
```

### 4. Start Everything with PM2

```bash
# From project root
pm2 start ecosystem.config.js

# Or if already running, restart
pm2 restart ecosystem.config.js
```

### 5. Verify Backend is Running

```bash
# Check PM2 status
pm2 list

# Should show both corpgame-backend and corpgame-frontend as "online"

# Test backend health
curl http://localhost:3001/health
# Should return: {"status":"ok"}

# Test from outside (use your EC2 public IP)
curl http://ec2-54-227-78-77.compute-1.amazonaws.com:3001/health
```

### 6. Check Security Group

Make sure your EC2 Security Group has:
- **Inbound rule**: Allow HTTP/HTTPS on port **3001** from `0.0.0.0/0`
- **Inbound rule**: Allow HTTP/HTTPS on port **3000** from `0.0.0.0/0` (if serving frontend directly)

## Quick Commands Summary

```bash
# Create frontend env file
echo "NEXT_PUBLIC_API_URL=http://ec2-54-227-78-77.compute-1.amazonaws.com:3001" > frontend/.env.production

# Rebuild frontend
cd frontend && npm run build && cd ..

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Restart if needed
pm2 restart ecosystem.config.js
```

## After These Steps

1. Backend should be accessible at: `http://ec2-54-227-78-77.compute-1.amazonaws.com:3001`
2. Frontend should connect to backend automatically
3. Registration should work!
