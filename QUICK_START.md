# Quick Start Guide

## Start Both Frontend and Backend

### Option 1: Simple Command (Recommended)
```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 3000) automatically.

### Option 2: With PM2
```bash
npm run start:pm2
```

## Backend Setup (First Time Only)

### 1. Install Dependencies
```bash
cd backend
npm install
cd ..
```

### 2. Set Up Environment Variables

Create `backend/.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/corpgame
JWT_SECRET=your-secret-key-here-change-this
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Important:** Replace `username`, `password`, and database name with your actual PostgreSQL credentials.

### 3. Set Up Database

Make sure PostgreSQL is running and create the database:
```bash
createdb corpgame
# or
psql -U postgres -c "CREATE DATABASE corpgame;"
```

Then run migrations:
```bash
cd backend
psql -U postgres -d corpgame -f migrations/001_initial.sql
psql -U postgres -d corpgame -f migrations/002_add_user_profile_fields.sql
cd ..
```

## Troubleshooting

### Backend Won't Start

1. **Check if dependencies are installed:**
   ```bash
   cd backend
   npm install
   ```

2. **Check if database is running:**
   ```bash
   # Linux/Mac
   pg_isready
   
   # Or check PostgreSQL service
   sudo systemctl status postgresql
   ```

3. **Check if port 3001 is available:**
   ```bash
   # Linux/Mac
   lsof -i :3001
   
   # Windows
   netstat -ano | findstr :3001
   ```

4. **Check backend logs:**
   If using `npm run dev`, you'll see backend logs in the terminal.
   If using PM2: `pm2 logs corpgame-backend`

### Frontend Can't Connect to Backend

1. **Verify backend is running:**
   Open: http://localhost:3001/health
   Should see: `{"status":"ok"}`

2. **Check API URL:**
   Frontend defaults to `http://localhost:3001`
   If different, create `frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. **Check CORS:**
   Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL

## Common Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start both frontend & backend |
| `npm run start:pm2` | Start with PM2 |
| `npm run stop:pm2` | Stop PM2 processes |
| `npm run restart:pm2` | Restart PM2 processes |
| `npm run logs:pm2` | View logs |

## Verify Everything Works

1. **Backend health check:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok"}
   ```

2. **Frontend:**
   Open http://localhost:3000 in your browser

3. **Try registration:**
   Go to http://localhost:3000/register and create an account
