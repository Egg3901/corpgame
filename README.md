# Corporate Sim Game

A multiplayer corporate simulation game where players build production, retail, and service units, choose integration strategies, and compete in an hourly turn-based environment.

## Features

- **Hourly Turn-Based Gameplay**: Make strategic decisions every hour
- **Unit Management**: Build and manage production, retail, and service units
- **Integration Strategies**: Choose between vertical or horizontal integration
- **Labor Policies**: Customize your labor policy focus
- **Sector Focus**: Specialize in different business sectors

## Tech Stack

- **Frontend**: Next.js 14+ (React) with Tailwind CSS
- **Backend**: Node.js/Express with TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT-based authentication

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
psql -U username -d corporate_sim -f migrations/001_initial.sql
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

## Deployment & Ops Docs

- `DEPLOYMENT_GUIDE.md` ƒ?" step-by-step AWS/PM2 deployment instructions plus current stack summary.
- `ENVIRONMENT_GUIDE.md` ƒ?" canonical list of backend/frontend environment variables and per-environment templates.
- `STARTUP_GUIDE.md`, `PM2_GUIDE.md`, and `DEBUG_COMMANDS.md` cover local bootstrapping, process management, and EC2 debug commands respectively.

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
     NEXT_PUBLIC_API_URL=http://your-domain-or-ip:3001
     ```

4. **Run database migrations**
   ```bash
   cd backend
   psql -U user -d corporate_sim -f migrations/001_initial.sql   # plus later migrations if present
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

