# Debug Commands for EC2 Registration Issue

Run these commands on your EC2 server in sequence:

## 1. Pull Latest Code & Rebuild
```bash
cd ~/testing/corpgame
git pull
cd frontend
npm run build
cd ..
pm2 restart corpgame-frontend
```

## 2. Test Backend Connectivity
```bash
# Test from server to backend
curl -v http://localhost:3001/health

# Test external access (replace with your actual EC2 hostname)
curl -v http://ec2-54-227-78-77.compute-1.amazonaws.com:3001/health
```

## 3. Check PM2 Status
```bash
pm2 status
pm2 logs corpgame-backend --lines 10
pm2 logs corpgame-frontend --lines 10
```

## 4. Test Registration & Check Logs

1. Open browser to your frontend URL
2. Try to register (fill out all fields)
3. Check browser console (F12 → Console) for the debug log showing what API URL is detected
4. Check PM2 logs for API requests:
```bash
pm2 logs --lines 50
```

## Expected Results

**Browser Console should show:**
```
API URL Detection: {
  protocol: "http:",
  hostname: "ec2-54-227-78-77.compute-1.amazonaws.com",
  port: "3000",
  detectedUrl: "http://ec2-54-227-78-77.compute-1.amazonaws.com:3001"
}
```

**PM2 logs should show API requests** when you submit registration.

**If backend connectivity fails:**
- Check if port 3001 is open in Security Groups
- Verify backend is actually running: `ps aux | grep node`
- Check backend logs for errors: `pm2 logs corpgame-backend`

**If CORS errors:**
- Backend should accept any origin from your hostname
- Check browser Network tab for failed requests
- Verify the CORS log message in backend logs

Run these steps and share what you see in the browser console and PM2 logs.


