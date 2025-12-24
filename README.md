# Corporate Warfare Game

A multiplayer corporate simulation game where players build production, retail, and service units across different economic sectors, manage supply chains, and compete in an hourly turn-based environment.

## Features

### Core Gameplay
- **Hourly Turn-Based Gameplay**: Strategic decisions update every hour via cron jobs
- **Multi-Sector Economy**: Operate in 16 different sectors (Technology, Defense, Energy, Manufacturing, etc.)
- **Unit Management**: Build and manage extraction, production, retail, and service units
- **Corporation Focus**: Choose between extraction, production, retail, service, or diversified strategies
- **State Markets**: Operate in different US states with unique resource availability and market conditions

### Economic System
- **Supply Chain Dynamics**: 
  - Extraction units extract commodities (Oil, Steel, Rare Earth, etc.)
  - Production units consume commodities and produce products
  - Retail/Service units consume products to generate revenue
- **Dynamic Pricing**: Commodity and product prices fluctuate based on supply and demand
- **Resource Scarcity**: State-level resource pools affect production efficiency
- **Product Demands**: Retail and service units require specific products to operate (e.g., Defense retail needs Defense Equipment, Defense service needs both Tech Products and Defense Equipment)

### Strategic Elements
- **Vertical Integration**: Control your supply chain from extraction to retail
- **Horizontal Expansion**: Build market presence across multiple states
- **Sector Restrictions**: Some sectors can only build certain unit types (e.g., Technology/Manufacturing cannot build retail/service)
- **Capital Management**: Balance investment in expansion vs. operational costs

### Social Features
- **Stock Market**: Trade corporation shares with other players
- **User Profiles**: Customizable avatars and player profiles
- **Messaging System**: In-game communication between players
- **Admin Tools**: IP banning, user management, and moderation features

## Tech Stack

- **Frontend**: Next.js 14+ (React) with Tailwind CSS
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT-based authentication

## Game Economy

### Supply Chain Flow
```
Extraction Units
    ↓ Extract
Commodities (Oil, Steel, Copper, Rare Earth, Lumber, Fertile Land, Chemical Compounds)
    ↓ Consumed by
Production Units
    ↓ Produce
Products (Tech Products, Manufactured Goods, Electricity, Food Products, Defense Equipment, etc.)
    ↓ Demanded by
Retail & Service Units + Other Production Units
    ↓ Generate
Revenue & Profit
```

### Unit Types

1. **Extraction Units**: Extract raw commodities from state resource pools
   - Revenue from selling commodities at market prices
   - Cost: Labor only
   - Limited by resource availability in each state

2. **Production Units**: Convert commodities into products
   - Revenue from selling products
   - Cost: Labor + commodity inputs
   - Require resources (e.g., Tech production needs Rare Earth)

3. **Retail Units**: Sell products to consumers
   - Revenue from consumer sales (fixed)
   - Cost: Labor + product inputs (e.g., Defense retail needs Defense Equipment)
   - **Disabled** in Technology and Manufacturing sectors

4. **Service Units**: Provide services using products
   - Revenue from service fees (fixed)
   - Cost: Labor + product inputs (e.g., Defense service needs Tech + Defense Equipment)
   - **Disabled** in Technology and Manufacturing sectors

### Sector Examples

- **Defense**: Production needs Steel → produces Defense Equipment → retail/service consume Defense Equipment
- **Technology**: Production needs Rare Earth → produces Tech Products → other sectors consume Tech
- **Energy**: Production needs Oil → produces Electricity → retail/service consume Electricity
- **Agriculture**: Extraction produces Food Products → retail/service consume Food Products

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

### Installation

1. Install dependencies:
```bash
npm run install:all
```

2. Set up environment variables:

Create `backend/.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/corporate_sim
JWT_SECRET=your-secret-key-here
REGISTRATION_SECRET=choose-a-shared-registration-code
ADMIN_SECRET=optional-admin-code
PORT=3001
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Run database migrations:
```bash
cd backend
npm run migrate
```

4. Start development servers:
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3001
- Frontend Next.js app on http://localhost:3000

## Project Structure

```
corporate-sim/
├── frontend/          # Next.js frontend application
├── backend/           # Express API server
├── architecture.md    # System architecture documentation
└── README.md          # This file
```

## Development

- Frontend: `npm run dev:frontend`
- Backend: `npm run dev:backend`
- Both: `npm run dev`

## Documentation

### Setup & Deployment
- **[STARTUP_GUIDE.md](STARTUP_GUIDE.md)** - How to start backend and frontend in development or production
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Step-by-step AWS/PM2 deployment instructions
- **[PM2_GUIDE.md](PM2_GUIDE.md)** - Process management with PM2
- **[ENVIRONMENT_GUIDE.md](ENVIRONMENT_GUIDE.md)** - Complete list of environment variables

### Architecture
- **[architecture.md](architecture.md)** - System architecture and technical design decisions

## Admin APIs

Administrators (users with `is_admin = true`) can manage security via:

- `POST /api/admin/ban-ip` `{ ip, reason }` — blocks registrations/logins from an IP and flags existing accounts using it.
- `POST /api/admin/users/:id/ban` `{ reason }` — bans a specific user.
- `DELETE /api/admin/users/:id` — deletes a user account.

All admin routes require a valid JWT with admin privileges.

## Deployment Guide (Start → Finish)

Follow these steps to go from a fresh EC2/VM to a running production stack managed by PM2.

1. **Prep the server**
   - Install system packages: `sudo dnf install -y git nodejs npm postgresql15` (adjust for your distro).
   - Install PM2 globally: `sudo npm install -g pm2`.
   - Open the required ports in your security group/firewall (SSH 22, backend 3001, frontend 3000 or your custom ports).

2. **Clone the repo and install dependencies**
   ```bash
   git clone <repo-url> corporate-sim && cd corporate-sim
   npm run install:all
   ```

3. **Create environment files**
   - `backend/.env`
     ```ini
     DATABASE_URL=postgresql://user:pass@db-host:5432/corporate_sim
     JWT_SECRET=replace-me
     REGISTRATION_SECRET=shared-signup-code
     ADMIN_SECRET=optional-admin-code
     FRONTEND_URL=http://your-domain-or-ip:3000
     PORT=3001
     NODE_ENV=production
     ```
   - `frontend/.env.local`
     ```ini
     # Leave blank when using nginx proxying /api on the same origin (recommended).
     # Set only if your API is on a different domain/subdomain.
     # NEXT_PUBLIC_API_URL=https://api.yourdomain.com
     ```

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
   This installs any missing packages inside `frontend/` and `backend/` and produces `backend/dist` + `frontend/.next`.

6. **Start everything with PM2**
   ```bash
   NODE_ENV=production pm2 start ecosystem.config.js
   pm2 status   # confirm corpgame-backend and corpgame-frontend show "online"
   ```
   The ecosystem file runs `node dist/server.js` for the backend and `next start` for the frontend (no dev watchers).

7. **Verify**
   - Backend health: `curl http://<server-ip>:3001/health` → expect `{"status":"ok"}`.
   - Frontend: load `http://<server-ip>:3000` in a browser.
   - Logs: `pm2 logs corpgame-backend` / `pm2 logs corpgame-frontend`.

8. **Persist across reboots (optional after verifying)**
   ```bash
   pm2 save
   pm2 startup systemd
   # follow the command PM2 prints, e.g.
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user
   ```
   To disable later, run `pm2 unstartup systemd` and delete `~/.pm2/dump.pm2`.

9. **Deploying updates**
   ```bash
   git pull
   NODE_ENV=production bash scripts/build-and-start.sh
   pm2 reload ecosystem.config.js
   ```
   Reload gives zero-downtime restarts with the new build.

10. **Emergency stop / cleanup**
    ```bash
    pm2 stop all
    pm2 delete all
    rm ~/.pm2/dump.pm2    # prevents PM2 from auto-starting on the next boot
    ```
    Use this if you need the server to boot without any apps (e.g., for troubleshooting).

## License

MIT

