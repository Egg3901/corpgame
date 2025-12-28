# In-Progress Features

## [FID-20251225-005] Admin Force End Board Vote & Tooltip Fixes
**Status:** COMPLETED **Priority:** H **Complexity:** 2
**Created:** 2025-12-25 **Started:** 2025-12-25 **Completed:** 2025-12-25
**Estimated:** 1.5h **Actual:** 1.5h

**Description:** Add admin panel feature to force end board votes with corporation name autocomplete. Fix SectorCard tooltip display issues (z-index, positioning, hitboxes).

**Progress:**
- [x] Phase 1: Backend endpoint for force ending board votes
- [x] Phase 2: Backend endpoint for corporation search/autocomplete
- [x] Phase 3: Frontend API methods
- [x] Phase 4: Admin UI with corporation autocomplete
- [x] Phase 5: Fix tooltip z-index and pointer-events issues
- [x] Phase 6: Add overflow-visible to SectorCard unit containers

**Files Modified:**
- backend/src/routes/admin.ts (added force-end-vote endpoint and corporations/search endpoint)
- frontend/lib/api.ts (added forceEndVote and searchCorporations API methods)
- frontend/app/admin/page.tsx (added force end vote UI with autocomplete)
- frontend/components/TooltipPanel.tsx (fixed z-index and pointer-events)
- frontend/components/SectorCard.tsx (added overflow-visible to unit containers)

**Implementation Details:**
- Force end vote sets proposal expires_at to NOW(), resolved by cron
- Corporation autocomplete searches by name (case-insensitive ILIKE)
- Tooltip fixes: z-index 10000, pointer-events-none on container, faster transitions
- SectorCard overflow-visible allows tooltips to escape container bounds

**Blockers:** None

---

## [FID-20251225-006] State Page Rework with Capacity Management
**Status:** COMPLETED **Priority:** H **Complexity:** 4
**Created:** 2025-12-25 **Started:** 2025-12-25 **Completed:** 2025-12-25
**Estimated:** 3h **Actual:** 3h

**Description:** Rework states listing page with better regional organization, capacity sorting (high/medium/low), resource availability sorting, backend capacity enforcement, and clear capacity display on sector cards.

**Progress:**
- [x] Phase 1: Backend - New region mapping & capacity
- [x] Phase 2: Backend - Resource availability
- [x] Phase 3: Frontend - State page UI
- [x] Phase 4: Frontend - Sector card capacity display
- [x] Phase 5: Testing & verification

**Files Modified:**
- backend/src/constants/sectors.ts (updated US_REGIONS, added capacity utilities)
- backend/src/routes/markets.ts (added capacity enforcement, updated states endpoints)
- frontend/lib/api.ts (updated StateInfo interface)
- frontend/app/states/page.tsx (major rework - new sorting, capacity/resource badges)
- frontend/components/SectorCard.tsx (added capacity display)

**Implementation Details:**
- New US_REGIONS with 7 logical geographic regions (West Coast, Mountain, Southwest, Midwest, Northeast, Southeast, Alaska & Hawaii)
- Capacity tier functions: getStateCapacityTier(), getStateCapacityInfo()
- Capacity enforcement on build endpoint with tier display
- States endpoint returns capacity, capacity_tier, extractable_resources for each state
- States page with sort dropdown (Region/Capacity/Resources)
- State cards display capacity tier badges and resource badges (up to 3 + overflow)
- SectorCard shows "X / Y units" with warning when at capacity
- TypeScript verification passed with 0 errors

**Blockers:** None

---

## [FID-20251225-004] Market UI and Business Unit Controls
**Status:** IN_PROGRESS **Priority:** H **Complexity:** 3
**Created:** 2025-12-25 **Started:** 2025-12-25
**Estimated:** 2h

**Description:** Fix top demanders display, verify electricity fix, move abandon to per-unit level, add quantity selector (1/5/10) with dynamic costs.

**Progress:**
- [ ] Phase 1: Fix top demanders display
- [ ] Phase 2: Verify electricity production fix
- [ ] Phase 3: Per-unit abandon buttons
- [ ] Phase 4: Quantity selector with dynamic costs

**Files Modified:**
- (pending)

**Blockers:** None

---

## Template
- FID: FID-YYYYMMDD-XXX
- Status: IN_PROGRESS
- Started: YYYY-MM-DD HH:mm
- Progress:
  - Phase 1:
  - Phase 2:
- Files Modified:
- Blockers:

