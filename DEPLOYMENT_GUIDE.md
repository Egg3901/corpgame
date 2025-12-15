# Corporate Sim - EC2 Deployment Guide (Amazon Linux)

Complete guide from git clone to running application on Amazon Linux EC2.

## Prerequisites

- EC2 instance running Amazon Linux 2023 or Amazon Linux 2
- Connected via SSH/PuTTY
- GitHub repository URL

## Step 1: Connect to EC2

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

## Step 2: Install System Dependencies

```bash
# Update system
sudo dnf update -y

# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Install PostgreSQL 15 (or latest available)
sudo dnf install -y postgresql15 postgresql15-server

# Find PostgreSQL installation path
which psql
# Note the version number from output (e.g., /usr/bin/psql might show version)

# Initialize PostgreSQL database (try different paths)
# Option 1: Try standard path
sudo postgresql-setup --initdb

# Option 2: If that doesn't work, initialize manually
sudo -u postgres /usr/pgsql-15/bin/initdb -D /var/lib/pgsql/15/data

# Option 3: If PostgreSQL 15 isn't available, try PostgreSQL 16 or 14
# sudo dnf install -y postgresql16 postgresql16-server
# sudo postgresql-setup --initdb

# Enable and start PostgreSQL
# Find the correct service name:
sudo systemctl list-units | grep postgresql

# Usually it's one of these:
sudo systemctl enable postgresql
sudo systemctl start postgresql
# OR
sudo systemctl enable postgresql.service
sudo systemctl start postgresql.service

# Verify it's running
sudo systemctl status postgresql

# Install PM2 globally
sudo npm install -g pm2

# Install Git (if not already installed)
sudo dnf install -y git
```

## Step 3: Clone Repository

```bash
cd ~
git clone https://github.com/your-username/corporate-sim.git
cd corporate-sim
```

**If repository is private:**
```bash
# Use Personal Access Token when prompted for password
# OR set up SSH key:
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Copy output and add to GitHub → Settings → SSH keys
git clone git@github.com:your-username/corporate-sim.git
```

## Step 4: Set Up PostgreSQL Database

```bash
# First, verify PostgreSQL is running
sudo systemctl status postgresql
# If service name is different, check: sudo systemctl list-units | grep postgresql

# Switch to postgres user
sudo -u postgres psql
# If psql command not found, use full path: sudo -u postgres /usr/pgsql-15/bin/psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE corporate_sim;
CREATE USER corporatesim_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE corporate_sim TO corporatesim_user;
ALTER USER corporatesim_user CREATEDB;
\q
```

```bash
# Find PostgreSQL data directory
sudo -u postgres psql -c "SHOW data_directory;"
# Or check common locations:
# ls -la /var/lib/pgsql/15/data/
# ls -la /var/lib/pgsql/data/

# Configure PostgreSQL to allow local connections
# The data directory is at /var/lib/pgsql/data (from initdb output)
sudo nano /var/lib/pgsql/data/pg_hba.conf
```

Change `ident` to `md5` for local connections:
```
# Find line with:
local   all             all                                     ident
# Change to:
local   all             all                                     md5
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Verify PostgreSQL is running
sudo systemctl status postgresql

# Run database migration
cd ~/corporate-sim
sudo -u postgres psql -d corporate_sim -f backend/migrations/001_initial.sql
```

## Step 5: Install Project Dependencies

```bash
cd ~/corporate-sim
npm run install:all
```

## Step 6: Configure Environment Variables

### Backend Environment

```bash
cd ~/corporate-sim/backend
nano .env
```

Add (replace with your values):
```env
DATABASE_URL=postgresql://corporatesim_user:your_secure_password_here@localhost:5432/corporate_sim
JWT_SECRET=generate-random-secret-here
PORT=3001
FRONTEND_URL=http://your-ec2-ip
NODE_ENV=production
```

Generate JWT secret:
```bash
openssl rand -hex 32
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### Frontend Environment

```bash
cd ~/corporate-sim/frontend
nano .env.local
```

Add:
```env
NEXT_PUBLIC_API_URL=http://your-ec2-ip:3001
```

Save: `Ctrl+X`, then `Y`, then `Enter`

## Step 7: Build Application

```bash
cd ~/corporate-sim

# Build backend TypeScript
cd backend
npm run build

# Build frontend Next.js
cd ../frontend
npm run build
```

## Step 8: Start with PM2

```bash
cd ~/corporate-sim

# Start backend
cd backend
pm2 start dist/server.js --name corporate-sim-backend

# Start frontend
cd ../frontend
pm2 start npm --name corporate-sim-frontend -- start

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Run the command it outputs (starts with 'sudo')
```

## Step 9: Configure Security Group

In AWS Console → EC2 → Security Groups:

Add inbound rules:
- **Type**: Custom TCP
- **Port**: 3000
- **Source**: 0.0.0.0/0 (or your IP for security)
- **Description**: Frontend

- **Type**: Custom TCP  
- **Port**: 3001
- **Source**: 0.0.0.0/0 (or restrict to frontend server IP)
- **Description**: Backend API

## Step 10: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs

# Test backend health endpoint
curl http://localhost:3001/health

# Test frontend
curl http://localhost:3000
```

## Step 11: Access Your Application

Open in browser:
- **Frontend**: `http://your-ec2-ip:3000`
- **Backend API**: `http://your-ec2-ip:3001/health`

## Optional: Set Up Nginx Reverse Proxy

```bash
# Install Nginx
sudo dnf install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create site configuration
sudo nano /etc/nginx/conf.d/corporate-sim.conf
```

Add:
```nginx
server {
    listen 80;
    server_name your-ec2-ip;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx

# Update security group to allow port 80
```

## Useful Commands

```bash
# View PM2 logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Check status
pm2 status

# Update code
cd ~/corporate-sim
git pull
cd backend && npm run build
cd ../frontend && npm run build
pm2 restart all

# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
sudo -u postgres psql -d corporate_sim
```

## Troubleshooting

### PM2 Process Not Starting
```bash
pm2 logs corporate-sim-backend
pm2 logs corporate-sim-frontend
```

### Database Connection Error
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql -d corporate_sim -U corporatesim_user

# Check DATABASE_URL in backend/.env
```

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill process if needed
sudo kill -9 <PID>
```

### Permission Denied Errors
```bash
# Fix file permissions
sudo chown -R ec2-user:ec2-user ~/corporate-sim
```

## Next Steps

Your application is now deployed! You can:
- Access the frontend at `http://your-ec2-ip:3000`
- Register/login and view the game overview
- Start building game features

For local development, see `README.md`.

