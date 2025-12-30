# Double Turn Processing Issue

**Date:** Dec 30, 2025  
**Status:** ✅ RESOLVED  
**Severity:** HIGH - Causes double revenue/losses  
**Branch:** alpha-0.0.1

**RESOLUTION:** This was a false lead. The actual issue was `ts-node-dev` hot reloading causing duplicate cron jobs. See `double-turn-processing-ACTUAL-CAUSE.md` for details and fix.

## Problem

Admin transaction logs show TWO turns firing at the same time (on the hour), causing:
- Double revenue processing
- Double CEO salary payments
- Double dividend payments
- Duplicate transactions in the database

## Root Cause Analysis

There are **TWO SEPARATE CODE PATHS** that process hourly turns:

### 1. Automatic Cron Job (Production Path)
**File:** `backend/src/cron/actions.ts`  
**Function:** `startActionsCron()` - Lines 24-56  
**Schedule:** Runs every hour at :00 via `cron.schedule('0 * * * *')`  
**Calls:**
- `processMarketRevenue()` (line 257-355) ✅
- `processCeoSalaries()` (line 363-428) ✅
- `processDividends()` (line 430-500) ✅

### 2. Manual Admin Trigger (Testing Path)
**File:** `backend/src/routes/admin.ts`  
**Endpoint:** `POST /api/admin/run-turn` (lines 445-479)  
**Trigger:** Manual button click in admin panel  
**Calls:**
- `triggerMarketRevenue()` (line 635-674 in actions.ts) ✅
- `triggerCeoSalaries()` (line 432-493 in actions.ts) ✅  
- `triggerDividends()` (line 576-630 in actions.ts) ✅

### Key Finding: BOTH CREATE IDENTICAL TRANSACTIONS

**`processMarketRevenue()` creates transaction:**
```typescript
// Line 327-332 in actions.ts
await TransactionModel.create({
  transaction_type: 'corp_revenue',
  amount: adjustedProfit,
  corporation_id: corporation_id,
  description: `Hourly ${adjustedProfit >= 0 ? 'profit' : 'loss'}: $${Math.abs(adjustedProfit).toLocaleString()}${boostNote}`,
});
```

**`triggerMarketRevenue()` creates transaction:**
```typescript
// Line 652-657 in actions.ts
await TransactionModel.create({
  transaction_type: 'corp_revenue',
  amount: hourly_profit,
  corporation_id: corporation_id,
  description: `Hourly ${hourly_profit >= 0 ? 'profit' : 'loss'}: $${Math.abs(hourly_profit).toLocaleString()}`,
});
```

## Confirmed: NOT a Frontend Auto-Trigger

✅ Verified there are NO `setInterval`, `setTimeout`, or automatic polling mechanisms in the frontend  
✅ The "Run Turn" button ONLY fires when manually clicked (line 810 in `frontend/app/admin/page.tsx`)  
✅ No `useEffect` hooks automatically calling `runTurn()`

## Possible Scenarios

### Scenario A: Simultaneous Execution (Most Likely)
- Cron job fires at exactly :00
- Admin clicks "Run Turn" button at the same time (or within seconds)
- Both code paths execute simultaneously
- Result: Double processing

### Scenario B: Multiple Server Instances
- If the backend is deployed with multiple instances (PM2 cluster mode, Docker replicas, etc.)
- Each instance runs its own cron job
- Result: Cron runs N times (where N = number of instances)

### Scenario C: Server Restart During Hour
- Server restarts and reinitializes cron
- Cron might fire twice during the same hour

## Impact

**Corporation ID Example (from screenshots):**
- Expected: +$161.90/hour
- Actual: Capital decreased by $1,881.54 in one hour
- This suggests BOTH the cron AND manual trigger fired

**Affected Transactions:**
- `corp_revenue` - Double profit/loss application
- `ceo_salary` - Double salary deduction
- `dividend_payment` - Double dividend payments

## Recommended Solutions

### Solution 1: Add Mutex/Lock (RECOMMENDED)
Add a distributed lock to prevent concurrent execution:

```typescript
// Using a database flag or Redis lock
let turnProcessing = false;
const TURN_LOCK_KEY = 'turn_processing_lock';

async function acquireTurnLock(): Promise<boolean> {
  // Check if turn is already processing
  const result = await pool.query(
    `INSERT INTO system_locks (lock_key, locked_at) 
     VALUES ($1, NOW()) 
     ON CONFLICT (lock_key) DO NOTHING 
     RETURNING id`,
    [TURN_LOCK_KEY]
  );
  return result.rowCount > 0;
}

async function releaseTurnLock(): Promise<void> {
  await pool.query(`DELETE FROM system_locks WHERE lock_key = $1`, [TURN_LOCK_KEY]);
}
```

### Solution 2: Disable Manual Trigger in Production
Add environment check to admin endpoint:

```typescript
router.post('/run-turn', async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Manual turn trigger is disabled in production. Use cron jobs only.' 
    });
  }
  // ... rest of code
});
```

### Solution 3: Deduplication via Transaction Timestamps
Add a unique constraint or check:

```typescript
// Before creating transaction, check if one exists in the last minute
const recentTransaction = await TransactionModel.findRecent({
  corporation_id,
  transaction_type: 'corp_revenue',
  within_seconds: 60
});

if (recentTransaction) {
  console.log(`Skipping duplicate transaction for corp ${corporation_id}`);
  return;
}
```

### Solution 4: Cron Job Clustering with PM2
If using PM2, ensure only ONE instance runs cron:

```javascript
// In server.ts
if (process.env.pm_id === '0' || !process.env.pm_id) {
  // Only run cron on first instance
  startActionsCron();
}
```

## Immediate Action Items

1. ✅ **CONFIRMED**: Issue is NOT a logging artifact - it's actually processing twice
2. 🔍 **INVESTIGATE**: Check if multiple backend instances are running (`pm2 list`, Docker containers)
3. 🔧 **IMPLEMENT**: Add Solution 1 (Mutex/Lock) to prevent concurrent execution
4. ⚠️ **TEMPORARY**: Disable manual "Run Turn" button in production or add warning
5. 📊 **MONITOR**: Add logging to track when each code path executes

## Testing Plan

1. Add detailed logging to both code paths with timestamps
2. Monitor transaction logs during next hourly update
3. Verify only ONE set of transactions is created
4. Test manual "Run Turn" button behavior with lock in place

## Migration Required

Create `system_locks` table:

```sql
CREATE TABLE IF NOT EXISTS system_locks (
  id SERIAL PRIMARY KEY,
  lock_key VARCHAR(255) UNIQUE NOT NULL,
  locked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  locked_by VARCHAR(255),
  expires_at TIMESTAMP
);

CREATE INDEX idx_system_locks_key ON system_locks(lock_key);
```

## Related Files

- `backend/src/cron/actions.ts` - Both cron and manual trigger functions
- `backend/src/routes/admin.ts` - Admin endpoint for manual trigger
- `backend/src/server.ts` - Cron initialization
- `frontend/app/admin/page.tsx` - Admin UI with "Run Turn" button

## Notes

- The CEO salary $0 bug fix (using `??` instead of `||`) was separate and has been resolved
- This double-processing bug has likely been present since the manual trigger was added
- User reported cash discrepancy was a combination of BOTH this bug AND the CEO salary bug

