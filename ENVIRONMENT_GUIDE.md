# Environment Configuration Guide

Corporate Sim uses `.env` files to keep secrets per service. This guide documents every variable, defaults, and how to configure them for local development, staging, and production (AWS EC2 + RDS).

---

## 1. File Locations

| Service | File | Purpose |
|---------|------|---------|
| Backend API | `backend/.env` | Runs Express/PM2 with database credentials, secrets, and CORS config |
| Frontend | `frontend/.env.local` | Optional override for the API URL (Next.js `NEXT_PUBLIC_*` namespace) |
| PM2 | `ecosystem.config.js` | Reads `NODE_ENV` and any OS-level env vars you export before `pm2 start` |

**Important**: Never commit these files. Use `.env.example` copies or Parameter Store to distribute safe templates instead.

---

## 2. Backend Variables

| Variable | Required? | Description |
|----------|-----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string: `postgresql://user:pass@host:5432/database` |
| `PGSSLROOTCERT` | Optional (recommended for RDS/Aurora) | Path to a PEM CA bundle file to trust for Postgres TLS connections (used by the app + migration runner) |
| `PGSSLINSECURE` | Optional | Set to `true` to disable TLS cert validation (debug only; do not use in production). When `true`, it overrides `PGSSLROOTCERT`. |
| `JWT_SECRET` | Yes | 32+ char random string used to sign auth tokens |
| `REGISTRATION_SECRET` | Optional (recommended) | Shared code required to create accounts; blank disables the gate |
| `ADMIN_SECRET` | Optional | Passphrase that allows a registrant to become `is_admin=true` |
| `PORT` | Default `3001` | Override only if the backend must listen on a different port |
| `NODE_ENV` | Default `development` | Set to `production` on EC2 to tighten logging + disable PM2 watch mode |
| `FRONTEND_URL` | Yes for prod | Base URL (protocol + host + optional port) allowed to call the API, e.g. `https://game.yourdomain.com` |
| `ALLOWED_ORIGINS` | Optional | Extra comma-separated origins (marketing site, admin domain) allowed through CORS |

The backend derives its CORS allow-list from `FRONTEND_URL` + `ALLOWED_ORIGINS`. Any browser origin not in that set is rejected, so keep the list synchronized with DNS/CloudFront changes.

---

## 3. Frontend Variables

| Variable | Required? | Description |
|----------|-----------|-------------|
| `NEXT_PUBLIC_API_URL` | Optional | Explicit base URL for axios requests. Leave blank locally to use `window.location` detection. Set it when serving frontend and backend from different domains (`https://api.yourdomain.com`). |

Because this variable is public (embedded in JavaScript), do **not** put secrets inside it—just the base URL.

---

## 4. Environment Templates

### Local Development (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/corporate_sim
JWT_SECRET=dev-secret-change-me
REGISTRATION_SECRET=
ADMIN_SECRET=
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
PORT=3001
NODE_ENV=development
```

### AWS / Production (`backend/.env`)

```env
DATABASE_URL=postgresql://corpgame_prod:<password>@<rds-endpoint>:5432/corpgame_prod
PGSSLROOTCERT=/home/ec2-user/rds-ca-bundle.pem
JWT_SECRET=<long random secret from Secrets Manager>
REGISTRATION_SECRET=<invite-only code>
ADMIN_SECRET=<admin-elevation code>
FRONTEND_URL=https://game.yourdomain.com
ALLOWED_ORIGINS=https://game.yourdomain.com,https://www.yourdomain.com
PORT=3001
NODE_ENV=production
```

### Frontend Overrides (`frontend/.env.local`)

```env
# Local (optional)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Production (if API is on a different subdomain)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 5. Applying Variables on AWS

1. **Parameter Store / Secrets Manager**: Store each secret (DB password, JWT, registration/admin codes) as SecureString parameters. Pull them into `.env` during deployment or export them in the systemd unit that bootstraps PM2.
2. **Owner Permissions**: Run `chmod 600 backend/.env` on the server so only the deploy user can read it.
3. **PM2 Startup**: Export vars in the shell before running `pm2 start`:

```bash
export $(grep -v '^#' backend/.env | xargs)   # loads backend vars into the current shell
NODE_ENV=production pm2 start ecosystem.config.js
```

4. **Rotate Secrets**: Update Parameter Store, redeploy `.env`, then restart PM2. JWT rotation requires forcing active sessions to log back in.

---

## 6. Troubleshooting

- **CORS blocked**: Confirm the browser origin exactly matches `FRONTEND_URL` or an entry in `ALLOWED_ORIGINS` (protocol + host). Remember that `https://game` and `https://www.game` are different origins.
- **Database connection failures**: Error codes `28P01` or `3D000` in PM2 logs mean the credentials/database specified in `DATABASE_URL` are invalid or missing.
- **Registration always denied**: If `REGISTRATION_SECRET` is set, you must send `registration_secret` in the request body. Clear the env var to open public signups.
- **Admin flag never set**: `ADMIN_SECRET` must match the `admin_secret` field passed during registration; ensure there are no trailing spaces in the `.env` file.

Keep this guide synchronized with code changes whenever new environment variables are introduced.
