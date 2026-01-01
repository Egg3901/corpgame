# Admin Account Setup & Management

This document outlines the procedures for creating and managing administrator accounts in the Corporate Game.

## 1. Initial Setup (CLI Method - Recommended)

For security, the recommended way to create the first admin account is using the server-side CLI tool. This requires physical or SSH access to the server.

### Using `admin-manager.js`

The project includes a utility script `scripts/admin-manager.js` for managing admin accounts.

**Commands:**

*   **List Admins:**
    ```bash
    npm run admin list
    # or
    node scripts/admin-manager.js list
    ```

*   **Create Admin:**
    ```bash
    npm run admin create <username> <email> <password>
    # Example:
    npm run admin create system_admin admin@corpgame.com SuperSecretPass123!
    ```

*   **Promote Existing User:**
    ```bash
    npm run admin promote <username>
    ```

*   **Demote Admin:**
    ```bash
    npm run admin demote <username>
    ```

## 2. Database Reset & Seeding

For development or fresh installations, you can reset the database and automatically seed a default admin account.

**Command:**
```bash
npm run db:reset
```

**Configuration (Environment Variables):**
You can customize the default admin credentials in your `.env.local` file:

```env
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=secure_password_here
```

## 3. Remote Setup (API Method)

If CLI access is not available, you can enable a temporary setup endpoint.

**Prerequisites:**
1.  Set `ALLOW_ADMIN_CREATION=true` in `.env.local`.
2.  Set `ADMIN_SETUP_TOKEN=your-secret-token` in `.env.local`.

**Endpoint:** `POST /api/admin/setup`

**Payload:**
```json
{
  "username": "new_admin",
  "email": "admin@example.com",
  "password": "strongpassword",
  "setup_token": "your-secret-token"
}
```

**Security Warning:** Always set `ALLOW_ADMIN_CREATION=false` (or remove it) after the initial setup is complete.

## 4. Security & Auditing

*   **Audit Logs:** All admin creation, promotion, and demotion events are logged to the `audit_logs` collection in MongoDB.
*   **MFA:** The API method requires a `setup_token` as a second factor (knowledge of server config).
*   **Privileges:** Admin accounts have elevated access to the `/admin` dashboard and API endpoints.

## 5. Troubleshooting

*   **"No admin accounts found"**: Run `npm run admin list` to verify.
*   **"Admin creation disabled"**: Check `ALLOW_ADMIN_CREATION` env var for API usage.
*   **Connection Errors**: Ensure `MONGODB_URI` is correctly set in `.env.local`.
