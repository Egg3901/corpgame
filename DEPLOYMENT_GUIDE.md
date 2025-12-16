# Corporate Sim Deployment Guide

This guide explains how to move the Corporate Sim stack from local development into a production-grade environment with AWS as the reference platform.

---

## 1. System Snapshot

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | Next.js 14 (React 18, App Router, Tailwind) | Served with `npm start` (Next standalone) or behind a reverse proxy |
| Backend | Node.js 18 / Express + TypeScript | Auth, game, profile, and admin routes with JWT auth and CORS protections |
| Database | PostgreSQL 14+ | Use AWS RDS for production; migrations live in `backend/migrations/` |
| Process Manager | PM2 | `ecosystem.config.js` runs both apps, manages logs, restarts, clustering |

Recent work added tighter CORS controls (`FRONTEND_URL` and `ALLOWED_ORIGINS`), optional registration/admin shared secrets, additional profile/admin routes, and enhanced logging for troubleshooting PM2/EC2 issues. Make sure your deployment reflects those settings.

---

## 2. Pre-Deployment Checklist

- [ ] Source pulled to the exact commit you want to promote (`git status` should be clean).
- [ ] Tests or manual sanity checks completed.
- [ ] Database schema up to date by running every SQL file in `backend/migrations/`.
- [ ] All secrets captured (see `ENVIRONMENT_GUIDE.md`): `DATABASE_URL`, `JWT_SECRET`, `REGISTRATION_SECRET`, `ADMIN_SECRET`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, etc.
- [ ] Node.js 18+, npm 10+, and PM2 installed on the target machine.
- [ ] Security groups / firewalls opened only to required ports (80/443 for public traffic; 3000/3001 can stay internal behind an ALB or SSH tunnel).

---

## 3. AWS Reference Architecture

1. **EC2**: Amazon Linux 2023 or Ubuntu 22.04 t3.small+ instance hosts both frontend and backend via PM2. Use an Application Load Balancer if you want clean HTTPS without manual nginx.
2. **RDS**: PostgreSQL 14+ instance or Aurora PostgreSQL. Configure a security group that only accepts traffic from the EC2 instance.
3. **Secrets**: Store environment variables in AWS Systems Manager Parameter Store or Secrets Manager; load them via user data script or `.env` files during provisioning.
4. **Storage/Logs**: PM2 writes to `./logs/*.log`. Ship to CloudWatch using the CloudWatch Agent if you need centralized log retention.
5. **Optional**: Put CloudFront in front of the Next.js app once you switch to static export or edge rendering.

---

## 4. Provision & Bootstrap EC2

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

Create `backend/.env` and `frontend/.env.local` with production values (see environment guide). If you rely on Parameter Store, write those values from the store before starting PM2.

---

## 5. Build & Start Services

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

## 6. Database & Migrations

1. Create a production database or RDS instance.
2. Update `backend/migrations/*.sql` files with any missing schema changes.
3. Run migrations from your laptop or the EC2 instance:

```bash
cd backend
npm run migrate
```

Keep credentials inside `DATABASE_URL` (username/password/host/port/database). Allow only TLS/SSL connections if your Postgres tier supports it.

### AWS RDS/Aurora TLS note

If you see `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` from Node/pg, download the AWS RDS CA bundle on the server and point `PGSSLROOTCERT` at it:

```bash
curl -fsSL -o /home/ec2-user/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
chmod 600 /home/ec2-user/rds-ca-bundle.pem
```

Then set `PGSSLROOTCERT=/home/ec2-user/rds-ca-bundle.pem` in `backend/.env` and restart the backend (and rerun `npm run migrate` if needed).

If you still see cert-chain errors, try the region-specific bundle (example for us-east-1):

```bash
curl -fsSL -o /home/ec2-user/rds-ca-bundle.pem https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem
chmod 600 /home/ec2-user/rds-ca-bundle.pem
```

As a last-resort debugging step only, you can set `PGSSLINSECURE=true` to disable certificate validation.

---

## 7. Environment Variables

See `ENVIRONMENT_GUIDE.md` for complete documentation. At minimum set:

```bash
# backend/.env
DATABASE_URL=postgresql://<user>:<pass>@<rds-host>:5432/corpgame
JWT_SECRET=<long-random-secret>
REGISTRATION_SECRET=<shared-code>
ADMIN_SECRET=<admin-elevation-code>
FRONTEND_URL=https://game.yourdomain.com
ALLOWED_ORIGINS=https://game.yourdomain.com,https://www.yourdomain.com
PORT=3001
NODE_ENV=production

# frontend/.env.local (optional if using relative URLs)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

`FRONTEND_URL` controls which browser origins can talk to the API. `ALLOWED_ORIGINS` lets you list extra origins (comma separated) when you have marketing pages, alternate domains, or admin portals. Failing to set these leads to CORS rejections in production.

---

## 8. Smoke Tests After Deployment

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

## 9. Rolling Updates

1. Pull latest code: `git pull`.
2. `bash scripts/build-and-start.sh` (re-build both apps).
3. `pm2 restart ecosystem.config.js` for zero-downtime reload, or `pm2 reload ecosystem.config.js` for graceful restart.
4. Verify logs, run `/health`, and confirm Next.js assets are refreshed (Next caches aggressively, so refresh the browser with cache disabled when verifying).

---

## 10. Troubleshooting Quick Hits

- **Frontend cannot reach backend**: Confirm `FRONTEND_URL` & `ALLOWED_ORIGINS`, security group ingress on 3001, and that the frontend is loading from the same hostname included in your env values.
- **Registrations blocked**: Check `REGISTRATION_SECRET` and banned IP table. Review `DEBUG_COMMANDS.md` for EC2-specific curl tests.
- **Database errors**: Inspect PM2 backend logs; `23505` indicates duplicates, `42P01/42703` means migrations not applied, `28P01`/`3D000` signal bad credentials or missing database.
- **PM2 restarts repeatedly**: Ensure `backend/dist/server.js` and `frontend/.next` exist (build step succeeded) and that Node can bind to 3000/3001 (no port collision).

Keep this guide close to your deployment run book so each release follows the exact same, predictable steps.
