# EC2 Production Setup Guide

## Current Configuration

Your backend `.env` is configured for:
- **Backend URL**: `http://ec2-54-227-78-77.compute-1.amazonaws.com:3001`
- **Frontend URL**: `http://ec2-54-227-78-77.compute-1.amazonaws.com`
- **Database**: PostgreSQL on localhost

## Frontend Environment Setup

Create `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=http://ec2-54-227-78-77.compute-1.amazonaws.com:3001
```

Or if using a domain:
```env
NEXT_PUBLIC_API_URL=http://yourdomain.com:3001
```

## Start the Application on EC2

### Option 1: Using PM2 (Recommended for Production)

```bash
# 1. Build both frontend and backend
bash scripts/build-and-start.sh

# 2. Start with PM2
pm2 start ecosystem.config.js

# 3. Save PM2 configuration for auto-start
pm2 save
pm2 startup
```

### Option 2: Using npm (Development)

```bash
npm run dev
```

## Verify Backend is Running

```bash
# Check if backend is responding
curl http://localhost:3001/health
# Should return: {"status":"ok"}

# Check PM2 status
pm2 list

# View logs
pm2 logs
```

## Security Group Configuration

Make sure your EC2 Security Group allows:
- **Port 3000** (HTTP) - for frontend
- **Port 3001** (HTTP) - for backend API
- **Port 22** (SSH) - for access

## Common Issues

### Backend Not Accessible

1. **Check if backend is running:**
   ```bash
   pm2 list
   pm2 logs corpgame-backend
   ```

2. **Check Security Group:**
   - Ensure port 3001 is open in EC2 Security Group
   - Inbound rules should allow HTTP/HTTPS on port 3001

3. **Check if backend is bound to 0.0.0.0:**
   The backend should listen on `0.0.0.0`, not just `localhost`. Check `backend/src/server.ts`:
   ```typescript
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on http://0.0.0.0:${PORT}`);
   });
   ```

### Frontend Can't Connect

1. **Verify frontend `.env.production` exists** with correct backend URL
2. **Rebuild frontend** after changing `.env`:
   ```bash
   cd frontend
   npm run build
   ```

3. **Check browser console** for CORS errors

## Quick Commands

```bash
# Start everything
pm2 start ecosystem.config.js

# Restart after changes
pm2 restart ecosystem.config.js

# View logs
pm2 logs

# Stop everything
pm2 stop ecosystem.config.js
```
