# Fix Registration Issue - Step by Step

Your registration issue is caused by the frontend trying to connect to `localhost:3001` when accessed via EC2 IP. Follow these steps to fix it.

## Quick Fix (Run these commands on your EC2 server)

```bash
# 1. Navigate to project directory
cd ~/testing/corpgame

# 2. Rebuild backend (to get CORS logging)
cd backend
npm run build
cd ..

# 3. Rebuild frontend (CRITICAL - this includes the API URL fix)
cd frontend
npm run build
cd ..

# 4. Stop PM2 processes
pm2 stop all

# 5. Delete PM2 processes
pm2 delete all

# 6. Start PM2 with production config
NODE_ENV=production pm2 start ecosystem.config.js

# 7. Save PM2 config
pm2 save

# 8. Check status
pm2 status
pm2 logs
```

## Verify It's Working

### Check Backend
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### Check Backend Logs for CORS
```bash
pm2 logs corpgame-backend
# Should see: "CORS enabled for origin: http://your-ec2-ip:3000"
```

### Test Registration
1. Open your browser to: `http://your-ec2-ip:3000`
2. Try to register a new user
3. Check browser console (F12) for any errors
4. Check PM2 logs: `pm2 logs`

## If Build Fails

### Backend TypeScript Error
If you get a TypeScript error during backend build:

```bash
cd backend
npm run build 2>&1 | grep -A 5 "error TS"
```

Common fixes:
- Check for syntax errors in `src/server.ts`
- Make sure all imports are correct
- Try: `rm -rf dist && npm run build`

### Frontend Build Issues
If frontend build fails:

```bash
cd frontend
rm -rf .next
npm run build
```

## Environment Variables Check

Make sure your environment variables are set correctly:

### Backend `.env` file
```bash
cat ~/testing/corpgame/backend/.env
```

Should include:
```
FRONTEND_URL=http://your-ec2-ip:3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3001
NODE_ENV=production
```

**Important:** `FRONTEND_URL` must include the port number (`:3000`)

### Frontend `.env.local` (optional now)
With the latest code, this is optional because the frontend auto-detects the API URL. But if you want to set it explicitly:

```bash
cat ~/testing/corpgame/frontend/.env.local
```

Can be:
```
NEXT_PUBLIC_API_URL=http://your-ec2-ip:3001
```

## Still Having Issues?

### Check PM2 Logs
```bash
pm2 logs --lines 50
```

### Check if ports are accessible
```bash
# From EC2 server
curl http://localhost:3001/health
curl http://localhost:3000

# From your local machine (replace with your EC2 IP)
curl http://your-ec2-ip:3001/health
```

### Check Security Group
Make sure AWS Security Group allows:
- Port 3000 (HTTP) from 0.0.0.0/0
- Port 3001 (Backend API) from 0.0.0.0/0

### Check CORS in Browser Console
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to register
4. Look for failed requests
5. Check the error message - it will tell you if it's CORS, connection, or other

## What Was Fixed

1. **Frontend API URL Detection**: The frontend now automatically detects the correct backend URL based on where you're accessing it from
2. **Backend CORS Logging**: Added logging to see what CORS origin is configured
3. **PM2 Configuration**: Fixed production mode to use `node dist/server.js` directly

After rebuilding and restarting, registration should work!

