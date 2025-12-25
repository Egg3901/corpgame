# Corporate Warfare - Deployment Guide

This comprehensive guide covers all aspects of deploying and running the Corporate Warfare application, from local development to production deployment on AWS.

---

## Table of Contents

1. [Quick Start - Development](#quick-start---development)
2. [Environment Variables](#environment-variables)
3. [Local Development](#local-development)
4. [Production Deployment](#production-deployment)
5. [PM2 Process Management](#pm2-process-management)
6. [AWS Deployment](#aws-deployment)
7. [Database Setup](#database-setup)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start - Development

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- PM2 (optional, for process management)

### Installation

1. **Install dependencies:**
```bash
npm run install:all
```

2. **Set up environment variables** (see [Environment Variables](#environment-variables) section)

3. **Run database migrations:**
```bash
cd backend
npm run migrate
cd ..
```

4. **Start development servers:**
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3001
- Frontend Next.js app on http://localhost:3000

---

## Environment Variables

### Backend (`backend/.env`)

**Development:**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/corporate_sim
JWT_SECRET=your-secret-key-here
REGISTRATION_SECRET=choose-a-shared-registration-code
ADMIN_SECRET=optional-admin-code
FRONTEND_URL=http://localhost:3000
PORT=3001
NODE_ENV=development
```

**Production:**
```env
DATABASE_URL=postgresql://user:pass@db-host:5432/corporate_sim
JWT_SECRET=replace-me-with-strong-secret
REGISTRATION_SECRET=shared-signup-code
ADMIN_SECRET=optional-admin-code
FRONTEND_URL=http://your-domain-or-ip:3000
ALLOWED_ORIGINS=https://game.yourdomain.com,https://www.yourdomain.com
PORT=3001
NODE_ENV=production
```

**Environment Variable Descriptions:**

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT token signing | Yes |
| `REGISTRATION_SECRET` | Shared code for user registration | Yes |
| `ADMIN_SECRET` | Admin elevation code | No |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `ALLOWED_ORIGINS` | Additional allowed origins (comma-separated) | No |
| `PORT` | Backend server port | No (default: 3001) |
| `NODE_ENV` | Environment mode | No (default: development) |

### Frontend (`frontend/.env.local`)

**Development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Production:**
```env
# Leave blank when using nginx proxying /api on the same origin (recommended)
# Set only if your API is on a different domain/subdomain
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**Note**: With the latest update, the frontend automatically detects the API URL from the browser location, so this may not be needed in all cases.

---

## Local Development

### Method 1: Development with npm concurrently (Recommended)

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

# Restart
pm2 restart ecosystem.config.js

# Stop and delete
pm2 delete ecosystem.config.js
```

### Method 3: Separate Terminals (Manual)

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

**Stop:**
Press `Ctrl+C` in each terminal

### Verification

After starting, verify both services are running:

**Check Backend:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

**Check Frontend:**
```bash
curl http://localhost:3000
# Should return HTML
```

---

## Production Deployment

### System Overview

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14 (React 18, App Router, Tailwind) | Served with `npm start` (Next standalone) or behind a reverse proxy |
| Backend | Node.js 18 / Express + TypeScript | Auth, game, profile, and admin routes with JWT auth and CORS protections |
| Database | PostgreSQL 14+ | Use AWS RDS for production; migrations live in `backend/migrations/` |
| Process Manager | PM2 | `ecosystem.config.js` runs both apps, manages logs, restarts, clustering |

### Pre-Deployment Checklist

- [ ] Source pulled to the exact commit you want to promote (`git status` should be clean)
- [ ] Tests or manual sanity checks completed
- [ ] Database schema up to date by running every SQL file in `backend/migrations/`
- [ ] All secrets captured (see Environment Variables section)
- [ ] Node.js 18+, npm 10+, and PM2 installed on the target machine
- [ ] Security groups / firewalls opened only to required ports (80/443 for public traffic; 3000/3001 can stay internal behind an ALB or SSH tunnel)

### Build Process

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

**Or use the build script:**
```bash
NODE_ENV=production bash scripts/build-and-start.sh
```

This installs any missing packages inside `frontend/` and `backend/` and produces `backend/dist` + `frontend/.next`.

**Step 2: Start with PM2**
```bash
# Set production environment
export NODE_ENV=production

# Start with PM2
npm run start:pm2:prod
# or
NODE_ENV=production pm2 start ecosystem.config.js
```

**Step 3: Save PM2 configuration**
```bash
pm2 save
```

**Step 4: (Optional) Set PM2 to start on system boot**
```bash
pm2 startup systemd
# Follow the instructions it outputs
```

### Rolling Updates

After making code changes:

1. **Pull latest code:**
```bash
git pull
```

2. **Rebuild the application:**
```bash
bash scripts/build-and-start.sh
```

3. **Restart PM2 processes:**
```bash
pm2 restart ecosystem.config.js
# or for zero-downtime reload:
pm2 reload ecosystem.config.js
```

4. **Verify:**
- Check logs: `pm2 logs`
- Test health endpoint: `curl http://localhost:3001/health`
- Refresh browser with cache disabled to verify Next.js assets

### Smoke Tests After Deployment

```bash
curl -I https://game.yourdomain.com                    # Next.js landing page
curl https://api.yourdomain.com/health                 # Backend health
curl https://api.yourdomain.com/api/cors-test          # Confirms CORS headers
pm2 status                                             # Both processes online?
pm2 logs corpgame-backend --lines 50                   # Watch for DB/CORS errors
pm2 logs corpgame-frontend --lines 50
```

Also sign up a user using the production UI to confirm the registration-secret gating, admin promotion, and CORS enforcement are all working as expected.

---

## PM2 Process Management

### Installation

```bash
npm install -g pm2
```

### Common Commands

#### View Status
```bash
# List all processes
pm2 list

# Show detailed info
pm2 show corpgame-backend
pm2 show corpgame-frontend
```

#### Restart Application
```bash
# Restart all processes
pm2 restart ecosystem.config.js

# Restart specific process
pm2 restart corpgame-backend
pm2 restart corpgame-frontend

# Restart all
pm2 restart all
```

#### Stop Application
```bash
# Stop all processes
pm2 stop ecosystem.config.js

# Stop specific process
pm2 stop corpgame-backend
pm2 stop corpgame-frontend

# Stop all
pm2 stop all
```

#### Delete from PM2
```bash
# Delete all processes
pm2 delete ecosystem.config.js

# Delete specific process
pm2 delete corpgame-backend
pm2 delete corpgame-frontend
```

#### View Logs
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

#### Monitor
```bash
# Real-time monitoring dashboard
pm2 monit
```

### Auto-Start on Server Reboot

To make PM2 start automatically on server reboot:

```bash
# Generate startup script
pm2 startup

# Save current PM2 process list
pm2 save
```

This will create a systemd service (on Linux) that starts PM2 on boot.

To disable later:
```bash
pm2 unstartup systemd
rm ~/.pm2/dump.pm2
```

### Quick Reference

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

---

## AWS Deployment

### Reference Architecture

1. **EC2**: Amazon Linux 2023 or Ubuntu 22.04 t3.small+ instance hosts both frontend and backend via PM2. Use an Application Load Balancer if you want clean HTTPS without manual nginx.
2. **RDS**: PostgreSQL 14+ instance or Aurora PostgreSQL. Configure a security group that only accepts traffic from the EC2 instance.
3. **Secrets**: Store environment variables in AWS Systems Manager Parameter Store or Secrets Manager; load them via user data script or `.env` files during provisioning.
4. **Storage/Logs**: PM2 writes to `./logs/*.log`. Ship to CloudWatch using the CloudWatch Agent if you need centralized log retention.
5. **Optional**: Put CloudFront in front of the Next.js app once you switch to static export or edge rendering.

### Provision & Bootstrap EC2

```bash
# 1. Create instance security group
#    - Inbound: 22 (SSH), 80/443 (HTTP/HTTPS), optional 3000/3001 for smoke tests.

# 2. SSH into the instance
ssh -i <key>.pem ec2-user@ec2-xx-xx-xx-xx.compute-1.amazonaws.com

# 3. Install dependencies
sudo dnf install -y git
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo -E bash -
sudo dnf install -y nodejs
sudo npm install -g pm2

# 4. Clone the repo
git clone https://github.com/<org>/corporate-sim.git
cd corporate-sim
npm run install:all
```

Create `backend/.env` and `frontend/.env.local` with production values. If you rely on Parameter Store, write those values from the store before starting PM2.

### Build & Start Services

```bash
# From repository root on the server
mkdir -p logs
bash scripts/build-and-start.sh       # installs + builds backend and frontend

# Start processes under PM2 in production mode
NODE_ENV=production pm2 start ecosystem.config.js
pm2 save                              # persist across reboots
pm2 startup                           # follow the printed instructions once
```

The backend serves from port `3001`, the Next.js frontend from `3000`. When pairing with an ALB or nginx, direct `/api/*` traffic to port 3001 and everything else to 3000 (or host the frontend statically and only proxy API traffic).

---

## Database Setup

### Local PostgreSQL Setup

1. **Install PostgreSQL 14+**

2. **Create database:**
```sql
CREATE DATABASE corporate_sim;
```

3. **Run migrations:**
```bash
cd backend
npm run migrate
```

### AWS RDS Setup

1. **Create a production database or RDS instance**

2. **Update `backend/migrations/*.sql` files with any missing schema changes**

3. **Run migrations from your laptop or the EC2 instance:**
```bash
cd backend
npm run migrate
```

Keep credentials inside `DATABASE_URL` (username/password/host/port/database). Allow only TLS/SSL connections if your Postgres tier supports it.

### AWS RDS/Aurora TLS Configuration

If you see `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` from Node/pg, download the AWS RDS CA bundle on the server:

```bash
curl -fsSL -o /home/ec2-user/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
chmod 600 /home/ec2-user/rds-ca-bundle.pem
```

Then set `PGSSLROOTCERT=/home/ec2-user/rds-ca-bundle.pem` in `backend/.env` and restart the backend.

If you still see cert-chain errors, try the region-specific bundle (example for us-east-1):

```bash
curl -fsSL -o /home/ec2-user/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
chmod 600 /home/ec2-user/rds-ca-bundle.pem
```

**Note**: As a last-resort debugging step only, you can set `PGSSLINSECURE=true` to disable certificate validation.

---

## Troubleshooting

### Port Already in Use

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

### PM2 Processes Not Starting

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

### Database Connection Errors

```bash
# Verify PostgreSQL is running
# Linux/Mac
sudo systemctl status postgresql

# Check connection string in backend/.env
# Test connection
psql -U username -d corporate_sim
```

**Common database error codes:**
- `23505`: Duplicate key violation
- `42P01/42703`: Relation/column does not exist (migrations not applied)
- `28P01`: Invalid password
- `3D000`: Database does not exist

### Frontend Cannot Connect to Backend

1. Check backend is running: `curl http://localhost:3001/health`
2. Check CORS settings in `backend/src/server.ts`
3. Check `FRONTEND_URL` in backend `.env` matches where frontend is accessed
4. For production, ensure security groups allow port 3001
5. Verify `ALLOWED_ORIGINS` includes all necessary domains

### PM2 Restarts Repeatedly

Ensure:
- `backend/dist/server.js` exists (build step succeeded)
- `frontend/.next` exists (build step succeeded)
- Node can bind to ports 3000/3001 (no port collision)
- Environment variables are properly set
- Database is accessible

### CORS Issues

- Confirm `FRONTEND_URL` & `ALLOWED_ORIGINS` are set correctly
- Check security group ingress on port 3001
- Verify frontend is loading from the same hostname included in your env values
- Review `DEBUG_COMMANDS.md` for EC2-specific curl tests

### Rebuild After Major Changes

```bash
# Stop PM2
pm2 stop all

# Rebuild
bash scripts/build-and-start.sh

# Start again
pm2 start ecosystem.config.js
```

### Clear Logs

```bash
pm2 flush
```

---

## Emergency Stop / Cleanup

```bash
pm2 stop all
pm2 delete all
rm ~/.pm2/dump.pm2    # prevents PM2 from auto-starting on the next boot
```

Use this if you need the server to boot without any apps (e.g., for troubleshooting).

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
6. Use AWS RDS for PostgreSQL
7. Configure TLS/SSL for database connections
8. Set up CloudWatch for log monitoring

---

## Deployment Workflow (Start → Finish)

Follow these steps to go from a fresh EC2/VM to a running production stack managed by PM2:

1. **Prep the server**
   - Install system packages: `sudo dnf install -y git nodejs npm postgresql15`
   - Install PM2 globally: `sudo npm install -g pm2`
   - Open required ports in security group/firewall (SSH 22, backend 3001, frontend 3000)

2. **Clone the repo and install dependencies**
   ```bash
   git clone <repo-url> corporate-sim && cd corporate-sim
   npm run install:all
   ```

3. **Create environment files** (see Environment Variables section)

4. **Run database migrations**
   ```bash
   cd backend
   npm run migrate
   cd ..
   ```

5. **Build production artifacts**
   ```bash
   NODE_ENV=production bash scripts/build-and-start.sh
   ```

6. **Start everything with PM2**
   ```bash
   NODE_ENV=production pm2 start ecosystem.config.js
   pm2 status   # confirm corpgame-backend and corpgame-frontend show "online"
   ```

7. **Verify**
   - Backend health: `curl http://<server-ip>:3001/health` → expect `{"status":"ok"}`
   - Frontend: load `http://<server-ip>:3000` in a browser
   - Logs: `pm2 logs corpgame-backend` / `pm2 logs corpgame-frontend`

8. **Persist across reboots (optional after verifying)**
   ```bash
   pm2 save
   pm2 startup systemd
   # follow the command PM2 prints
   ```

9. **Deploying updates**
   ```bash
   git pull
   NODE_ENV=production bash scripts/build-and-start.sh
   pm2 reload ecosystem.config.js
   ```

---

Keep this guide close to your deployment run book so each release follows the exact same, predictable steps.
