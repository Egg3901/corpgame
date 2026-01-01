# Database Reset System

This project includes a comprehensive system for resetting the database to a known, clean state. This is useful for development, testing, and staging environments.

## Quick Start

To completely wipe and re-initialize the database:

```bash
npm run db:reset
```

To run without confirmation prompts (e.g., in CI/CD):

```bash
npm run db:reset:force
```

## What Happens During Reset

The `scripts/master-reset.js` script performs the following actions in order:

### 1. Data Wipe (Phase 1)
All game-related collections are dropped. This includes:
- User accounts (`users`)
- Corporations and business units (`corporations`, `business_units`)
- Market data (`transactions`, `orders`, `price_history`)
- Messages and social data (`messages`, `boards`, `posts`)
- Configuration data (`sector_configs`, `product_configs`, etc.)
- Metadata (`state_metadata`)
- Logs (`audit_logs`)

**Preserved Data:**
- System collections (MongoDB internal)
- Non-game collections not explicitly listed in `COLLECTIONS_TO_WIPE`

### 2. Data Reseeding (Phase 2)
The script re-initializes foundational data:

- **States**: Populates 50 US States + DC with resource modifiers and regions (`scripts/seed-states-data.js`).
- **Sectors**: Populates default Industries, Resources, and Products based on game constants (`scripts/seed-sectors-data.js`).
- **Unit Configs**: Sets up default production/extraction/retail capabilities for each sector.

### 3. Admin Creation (Phase 3)
A default system administrator account is created:
- **Username**: `admin` (or `DEFAULT_ADMIN_USERNAME` env var)
- **Email**: `admin@example.com` (or `DEFAULT_ADMIN_EMAIL` env var)
- **Password**: `admin123` (or `DEFAULT_ADMIN_PASSWORD` env var)
- **Role**: System Admin (`is_admin: true`)
- **Starting Resources**: High cash and action points for testing.

### 4. Verification (Phase 4)
The script runs sanity checks to ensure:
- Essential collections have documents (Users > 0, States > 50, etc.).
- Wiped collections are empty (Corporations = 0).

## Configuration

The reset process relies on `.env.local` for:
- `MONGODB_URI`: Database connection string.
- `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`: Optional overrides for the default admin.

## Adding New Data to Seed

### States
Modify `scripts/seed-states-data.js`. The `seedStates(db)` function handles the insertion.

### Sectors/Products
Modify `scripts/seed-sectors-data.js`. Update the `SECTOR_CONFIGS`, `PRODUCT_CONFIGS`, or `RESOURCE_CONFIGS` arrays.

## Safety Mechanisms

- **Prompt**: The interactive script requires typing "RESET" to proceed.
- **Environment Check**: (Recommended) Ensure you are not pointing to a production database URI before running.

## Troubleshooting

**Error: MONGODB_URI is not set**
Ensure `.env.local` exists and contains a valid MongoDB URI.

**Verification Failed**
If the script fails at Phase 4, check the console output for specific counts. It likely means a seed script failed to insert data.
