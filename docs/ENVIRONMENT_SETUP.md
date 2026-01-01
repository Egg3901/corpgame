# Environment Setup Guide

**Corporate Game Platform**  
**Version:** 1.0.0  
**Last Updated:** 2025-12-31

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Installation Steps](#installation-steps)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Troubleshooting](#troubleshooting)
8. [Deployment](#deployment)
9. [Security Best Practices](#security-best-practices)

---

## 🚀 Quick Start

**For experienced developers:**

```bash
# 1. Clone repository
git clone <repository-url>
cd corpgame

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and JWT secrets

# 4. Generate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 5. Set up database (optional - creates admin user)
npm run reset-db

# 6. Start development server
npm run dev

# 7. Open http://localhost:3000
```

---

## 📦 Prerequisites

### **Required:**

- **Node.js:** v18.17 or higher (v20+ recommended)
- **npm:** v9+ (comes with Node.js)
- **MongoDB:** v6.0+ (local installation OR MongoDB Atlas account)
- **Git:** For version control

### **Recommended:**

- **MongoDB Compass:** GUI for database management
- **VS Code:** IDE with TypeScript support
- **Postman:** For API testing

### **Check your versions:**

```bash
node --version   # Should be v18.17+
npm --version    # Should be v9+
mongod --version # Should be v6.0+
```

---

## 🛠️ Installation Steps

### **Step 1: Clone Repository**

```bash
git clone <repository-url>
cd corpgame
```

### **Step 2: Install Dependencies**

```bash
npm install
```

**Expected output:** ~1,200 packages installed (takes 2-5 minutes)

**If errors occur:**
- Try `npm cache clean --force` then reinstall
- Check Node.js version matches requirements
- Delete `node_modules` and `package-lock.json`, then reinstall

### **Step 3: Verify Installation**

```bash
npm run build
```

**Expected output:** `.next` folder created with no errors

---

## ⚙️ Environment Configuration

### **Step 1: Create Environment File**

```bash
cp .env.example .env.local
```

**Important:** `.env.local` is git-ignored and will NOT be committed to version control.

### **Step 2: Configure Required Variables**

Open `.env.local` and configure these **REQUIRED** variables:

#### **1. Database Connection**

```env
MONGODB_URI=<your-mongodb-connection-string>
```

**Options:**

**A) MongoDB Atlas (Cloud - Recommended for Production):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/corpgame?retryWrites=true&w=majority
```

**B) Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/corpgame
```

**C) Docker MongoDB:**
```env
MONGODB_URI=mongodb://admin:password@localhost:27017/corpgame?authSource=admin
```

#### **2. JWT Secrets (CRITICAL)**

**Generate strong secrets:**

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET (use different value)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Add to .env.local:**
```env
JWT_SECRET=<generated-secret-1>
JWT_REFRESH_SECRET=<generated-secret-2>
```

**⚠️ WARNING:** 
- Must be at least 32 characters long
- Use different values for each secret
- Never share or commit these secrets
- Changing these logs out all users

#### **3. Admin Setup Configuration**

```env
ALLOW_ADMIN_CREATION=true
ADMIN_SETUP_TOKEN=<your-secure-token>
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=<strong-password>
DEFAULT_ADMIN_EMAIL=admin@example.com
```

**Security Notes:**
- Set `ALLOW_ADMIN_CREATION=false` after creating first admin
- Change `ADMIN_SETUP_TOKEN` from default value
- Use strong password for `DEFAULT_ADMIN_PASSWORD`

#### **4. Game Configuration (Optional)**

```env
GAME_START_DATE=2025-01-01T00:00:00.000Z
GAME_SPEED=1
```

**Game Speed Examples:**
- `1` = Real-time (default)
- `24` = 1 in-game day = 1 real hour
- `168` = 1 in-game week = 1 real hour
- `0.5` = Slow motion (2x longer)

#### **5. Application Configuration**

```env
NODE_ENV=development
PORT=3000
```

**Change port if 3000 is in use:**
```env
PORT=3001
```

### **Step 3: Verify Configuration**

Run the diagnostic tool:

```bash
node scripts/diagnose-system.js
```

**Expected output:**
```
✓ MongoDB connection successful
✓ Database accessible
✓ JWT secrets configured
✓ Admin setup enabled
```

---

## 🗄️ Database Setup

### **Option A: MongoDB Atlas (Cloud)**

#### **1. Create Free Account**
- Go to https://cloud.mongodb.com
- Sign up for free account
- Create new project

#### **2. Create Cluster**
- Click "Build a Database"
- Choose FREE "M0" tier
- Select region closest to you
- Click "Create Cluster" (takes 3-5 minutes)

#### **3. Create Database User**
- Go to "Database Access"
- Click "Add New Database User"
- Choose "Password" authentication
- Username: `corpgame-admin` (or your choice)
- Generate secure password (click "Autogenerate Secure Password")
- **IMPORTANT:** Save password somewhere safe
- Set role to "Read and write to any database"
- Click "Add User"

#### **4. Configure Network Access**
- Go to "Network Access"
- Click "Add IP Address"

**For Development:**
- Click "Allow Access from Anywhere" (0.0.0.0/0)
- **WARNING:** Not secure for production!

**For Production:**
- Add your server's specific IP address

#### **5. Get Connection String**
- Go to "Database" → "Connect"
- Choose "Connect your application"
- Copy connection string
- Replace `<password>` with your database user password
- Replace `<dbname>` with `corpgame`

**Example:**
```
mongodb+srv://corpgame-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/corpgame?retryWrites=true&w=majority
```

#### **6. Add to .env.local**
```env
MONGODB_URI=mongodb+srv://corpgame-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/corpgame?retryWrites=true&w=majority
```

#### **7. Test Connection**
```bash
node scripts/diagnose-system.js
```

---

### **Option B: Local MongoDB**

#### **1. Install MongoDB**

**macOS (Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

**Ubuntu/Debian:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

**Windows:**
- Download installer: https://www.mongodb.com/try/download/community
- Run installer (choose "Complete" setup)
- Check "Install MongoDB as a Service"
- Start MongoDB service from Services panel

#### **2. Verify MongoDB is Running**

```bash
# Check if MongoDB is running
mongosh --eval "db.version()"
```

**Expected output:** Version number (e.g., "7.0.4")

#### **3. Configure .env.local**

```env
MONGODB_URI=mongodb://localhost:27017/corpgame
```

#### **4. Test Connection**

```bash
node scripts/diagnose-system.js
```

---

### **Option C: Docker MongoDB**

#### **1. Create docker-compose.yml**

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    container_name: corpgame-mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secure_password_here
      MONGO_INITDB_DATABASE: corpgame
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

#### **2. Start MongoDB Container**

```bash
docker-compose up -d
```

#### **3. Configure .env.local**

```env
MONGODB_URI=mongodb://admin:secure_password_here@localhost:27017/corpgame?authSource=admin
```

#### **4. Test Connection**

```bash
node scripts/diagnose-system.js
```

---

### **Database Initialization**

#### **Option 1: Automatic Setup (Recommended)**

Run the database reset script:

```bash
npm run reset-db
```

**This script will:**
- Drop existing database (if any)
- Create admin user from `DEFAULT_ADMIN_*` variables
- Set up initial game configuration
- Seed states data (if configured)

**Expected output:**
```
✓ Connected to MongoDB
✓ Database reset complete
✓ Admin user created: admin
✓ Game configuration initialized
```

#### **Option 2: Manual Setup**

1. Start the application:
```bash
npm run dev
```

2. Create admin user via API:
```bash
curl -X POST http://localhost:3000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{
    "setupToken": "your-setup-token",
    "username": "admin",
    "email": "admin@example.com",
    "password": "SecurePassword123!"
  }'
```

---

## 🚀 Running the Application

### **Development Mode**

```bash
npm run dev
```

**What this does:**
- Starts Next.js development server
- Enables hot module replacement (HMR)
- Shows detailed error messages
- Runs on http://localhost:3000

**Expected output:**
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

**Access the application:**
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3000/api

### **Production Mode**

```bash
# Build for production
npm run build

# Start production server
npm start
```

**What this does:**
- Creates optimized production build
- Minifies JavaScript and CSS
- Generates static pages where possible
- Removes development-only code

### **Using PM2 (Process Manager)**

For production deployments with automatic restart:

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# View logs
pm2 logs corpgame

# Monitor
pm2 monit

# Stop
pm2 stop corpgame

# Restart
pm2 restart corpgame
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. "Cannot connect to MongoDB"**

**Symptoms:**
```
MongoServerError: Authentication failed
```

**Solutions:**

**A) Check connection string:**
- Verify username and password are correct
- Ensure password is URL-encoded if it contains special characters
- Use online URL encoder: https://www.urlencoder.org

**B) Check network access:**
- MongoDB Atlas: Whitelist your IP address
- Local MongoDB: Verify service is running

**C) Test connection manually:**
```bash
mongosh "mongodb+srv://username:password@cluster.mongodb.net/corpgame"
```

---

#### **2. "JWT_SECRET is required"**

**Symptoms:**
```
Error: JWT_SECRET must be set in environment variables
```

**Solutions:**

**A) Verify .env.local exists:**
```bash
ls -la .env.local
```

**B) Check JWT_SECRET is set:**
```bash
grep JWT_SECRET .env.local
```

**C) Regenerate secrets:**
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

**D) Restart server:**
```bash
# Stop with Ctrl+C, then:
npm run dev
```

---

#### **3. "Port 3000 already in use"**

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

**A) Change port in .env.local:**
```env
PORT=3001
```

**B) Kill process using port 3000:**

**macOS/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

#### **4. "Module not found" Errors**

**Symptoms:**
```
Error: Cannot find module '@/lib/db/mongo'
```

**Solutions:**

**A) Reinstall dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**B) Clear Next.js cache:**
```bash
rm -rf .next
npm run build
```

---

#### **5. TypeScript Errors**

**Symptoms:**
```
Type error: Property 'X' does not exist on type 'Y'
```

**Solutions:**

**A) Run TypeScript check:**
```bash
npx tsc --noEmit
```

**B) Update types:**
```bash
npm install --save-dev @types/node @types/react @types/react-dom
```

**C) Restart TypeScript server in VS Code:**
- Press `Cmd/Ctrl + Shift + P`
- Type "TypeScript: Restart TS Server"

---

#### **6. Database Reset Issues**

**Symptoms:**
```
Error: Failed to drop database
```

**Solutions:**

**A) Check database connection:**
```bash
node scripts/diagnose-system.js
```

**B) Manually drop database:**
```bash
mongosh "mongodb://localhost:27017/corpgame" --eval "db.dropDatabase()"
```

**C) Run reset with verbose logging:**
```bash
DEBUG=* node scripts/reset-db.js
```

---

### **Debug Mode**

Enable verbose logging:

```env
DEBUG=*
NODE_ENV=development
```

**View logs:**
```bash
# Development mode
npm run dev

# Production mode with PM2
pm2 logs corpgame --lines 100
```

---

## 🌍 Deployment

### **Vercel (Recommended)**

#### **1. Install Vercel CLI**

```bash
npm install -g vercel
```

#### **2. Login to Vercel**

```bash
vercel login
```

#### **3. Configure Environment Variables**

Go to your Vercel project → Settings → Environment Variables

**Add these variables:**
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_SETUP_TOKEN`
- `ALLOW_ADMIN_CREATION` (set to `false` after setup)
- `NODE_ENV` (set to `production`)

#### **4. Deploy**

```bash
vercel --prod
```

**Expected output:**
```
✓ Production deployment ready
🔗 https://your-project.vercel.app
```

---

### **Docker Deployment**

#### **1. Create Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

#### **2. Build Image**

```bash
docker build -t corpgame:latest .
```

#### **3. Run Container**

```bash
docker run -d \
  --name corpgame \
  -p 3000:3000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="..." \
  -e JWT_REFRESH_SECRET="..." \
  corpgame:latest
```

---

### **VPS Deployment (Ubuntu)**

#### **1. Install Prerequisites**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -sc)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2
```

#### **2. Clone and Setup**

```bash
# Clone repository
git clone <repository-url>
cd corpgame

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
nano .env.local  # Edit with your values

# Build application
npm run build
```

#### **3. Start with PM2**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### **4. Configure Nginx (Optional)**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔒 Security Best Practices

### **Environment Variables**

✅ **DO:**
- Use `.env.local` for local development
- Store production secrets in secure secret management (Vercel env vars, AWS Secrets Manager, etc.)
- Generate strong random JWT secrets (64+ characters)
- Use different secrets for development and production
- Rotate JWT secrets periodically

❌ **DON'T:**
- Never commit `.env.local` or `.env` files
- Never share JWT secrets
- Never use weak or default passwords
- Never expose secrets in client-side code
- Never log sensitive environment variables

### **Database Security**

✅ **DO:**
- Enable MongoDB authentication
- Use strong database passwords
- Whitelist specific IP addresses (not 0.0.0.0/0 in production)
- Enable SSL/TLS for connections
- Set up regular backups
- Use separate databases for development/staging/production

❌ **DON'T:**
- Never allow unauthenticated access
- Never use default MongoDB port (27017) in production without firewall
- Never share database credentials
- Never use same database for testing and production

### **Application Security**

✅ **DO:**
- Set `ALLOW_ADMIN_CREATION=false` after initial setup
- Use HTTPS in production (automatic with Vercel)
- Implement rate limiting (see Phase 6)
- Configure proper CORS settings
- Keep dependencies updated (`npm audit`)
- Use Content Security Policy (CSP) headers

❌ **DON'T:**
- Never run with `ALLOW_ADMIN_CREATION=true` in production
- Never expose stack traces to users (set `NODE_ENV=production`)
- Never disable security middleware
- Never trust user input without validation

---

## 📚 Additional Resources

### **Documentation**

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com)
- [HeroUI Documentation](https://heroui.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

### **Tools**

- [MongoDB Compass](https://www.mongodb.com/products/compass) - Database GUI
- [Postman](https://www.postman.com) - API testing
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Cloud database

### **Support**

- Check [Troubleshooting](#troubleshooting) section
- Run diagnostics: `node scripts/diagnose-system.js`
- Review logs: `pm2 logs corpgame` or console output

---

**Last Updated:** 2025-12-31  
**Version:** 1.0.0  
**Author:** Corporate Game Development Team
