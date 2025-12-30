# Double Turn Processing - ACTUAL ROOT CAUSE

**Date:** Dec 30, 2025  
**Status:** ❌ Bug Confirmed  
**Severity:** HIGH - Causes double/triple/N-tuple revenue/losses  
**Branch:** alpha-0.0.1

## ACTUAL Root Cause

The issue is **NOT** related to manual admin triggers. The problem is with **`ts-node-dev` hot reloading** combined with **cron jobs not being cleaned up on restart**.

### The Problem

**File:** `backend/package.json` line 7
```json
"dev": "ts-node-dev --respawn --transpile-only src/server.ts"
```

**`ts-node-dev --respawn`** automatically restarts the Node.js server whenever TypeScript files change. This is great for development, BUT:

1. Every time the server restarts, `app.listen()` is called again (line 278 in `server.ts`)
2. This calls `startActionsCron()` again (line 283)
3. `startActionsCron()` calls `cron.schedule()` which **adds NEW cron jobs**
4. **The old cron jobs from previous server instances are NOT stopped**
5. Result: Multiple cron jobs all fire at the same time

### Evidence

**`backend/src/cron/actions.ts` lines 24-53:**
```typescript
export function startActionsCron() {
  // Run every hour at the start of the hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly actions increment...');
    // ... processes revenue, CEO salaries, dividends
  });
  
  console.log('[Cron] Actions cron job scheduled (runs every hour at :00)');
  // ... more cron jobs
}
```

**Problem:** `cron.schedule()` is called every time `startActionsCron()` is called, but there's **NO cleanup** of previous cron jobs.

### Scenario

1. Server starts at 10:00 AM → Cron job #1 scheduled
2. Developer saves a file at 10:15 AM → Server auto-restarts → Cron job #2 scheduled
3. Developer saves another file at 10:30 AM → Server auto-restarts → Cron job #3 scheduled
4. At 11:00 AM, **ALL THREE cron jobs fire simultaneously**
5. Result: Triple processing of revenue, CEO salaries, dividends

### Why This Wasn't Caught Earlier

- In production (using `npm start`), the server doesn't auto-restart, so this doesn't happen
- In development, if you only restart once and don't make many file changes, you might not notice
- The issue compounds over time as more restarts occur

## Solutions

### Solution 1: Store and Destroy Cron Jobs (RECOMMENDED)

**File:** `backend/src/cron/actions.ts`

```typescript
import cron, { ScheduledTask } from 'node-cron';

// Store active cron jobs
let activeCronJobs: ScheduledTask[] = [];

export function startActionsCron() {
  // Stop any existing cron jobs first
  stopActionsCron();
  
  // Schedule hourly actions
  const hourlyCron = cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly actions increment...');
    // ... existing logic
  });
  activeCronJobs.push(hourlyCron);
  
  // Schedule proposal checks
  const proposalCron = cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Running proposal resolution check...');
    // ... existing logic
  });
  activeCronJobs.push(proposalCron);
  
  // Schedule market price recording
  const priceCron = cron.schedule('*/10 * * * *', async () => {
    console.log('[Cron] Recording market prices...');
    // ... existing logic
  });
  activeCronJobs.push(priceCron);
  
  console.log(`[Cron] ${activeCronJobs.length} cron jobs scheduled`);
}

export function stopActionsCron() {
  if (activeCronJobs.length > 0) {
    console.log(`[Cron] Stopping ${activeCronJobs.length} existing cron jobs...`);
    activeCronJobs.forEach(job => job.stop());
    activeCronJobs = [];
  }
}
```

**File:** `backend/src/server.ts`

```typescript
import { startActionsCron, stopActionsCron } from './cron/actions';

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Accessible at http://localhost:${PORT} and from external IPs`);
  
  // Start cron jobs (will clean up any existing ones first)
  startActionsCron();
});

// Clean up cron jobs on process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping cron jobs...');
  stopActionsCron();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping cron jobs...');
  stopActionsCron();
  process.exit(0);
});
```

### Solution 2: Use Singleton Pattern

```typescript
let cronInitialized = false;

export function startActionsCron() {
  if (cronInitialized) {
    console.log('[Cron] Cron jobs already initialized, skipping...');
    return;
  }
  
  cronInitialized = true;
  
  // ... schedule cron jobs
}
```

**Problem with this approach:** In development with hot reload, the singleton flag persists but the actual cron jobs might not, leading to no cron jobs running at all after a restart.

### Solution 3: Disable Auto-Restart for Cron-Related Files

**File:** `backend/package.json`

```json
"dev": "ts-node-dev --respawn --transpile-only --ignore-watch src/cron src/server.ts"
```

**Problem:** This defeats the purpose of hot reload for development.

## Recommended Implementation

**Use Solution 1** - It's the most robust and works in both development and production:
- Cleans up old cron jobs before creating new ones
- Handles graceful shutdown
- Works with hot reload
- No duplicate executions

## Testing Plan

1. Implement Solution 1
2. Start dev server
3. Check logs: should see "X cron jobs scheduled"
4. Save a file to trigger hot reload
5. Check logs: should see "Stopping X existing cron jobs..." then "X cron jobs scheduled"
6. Wait for next hourly update
7. Verify only ONE set of transactions is created

## Impact Assessment

This bug affects **development environments only** (using `npm run dev`).

Production environments using `npm start` (which runs `node dist/server.js` without hot reload) are **NOT affected** unless:
- The server is manually restarted multiple times within the same hour
- PM2 is configured with multiple instances (but we confirmed it's set to 1 instance)

## Related Files

- `backend/package.json` - Dev script with `ts-node-dev`
- `backend/src/server.ts` - Calls `startActionsCron()` on server start
- `backend/src/cron/actions.ts` - Schedules cron jobs without cleanup

## Notes

- This explains why the user saw duplicate transactions "every hour on the hour"
- The number of duplicates depends on how many times the server has been restarted
- In production, this shouldn't happen unless the server is restarted multiple times within an hour

