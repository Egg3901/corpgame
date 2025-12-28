# Planned Features

## [FID-20251225-002] Board Voting System Improvements
**Status:** PLANNED **Priority:** H **Complexity:** 3
**Created:** 2025-12-25 **Estimated:** 2h

**Description:** Fix and improve board voting system: remove votes from non-board members, display who voted for what, improve UI/UX clarity, and verify autopass on supermajority works.

**Acceptance:**
- [ ] Votes from removed board members are cleaned up when board membership changes
- [ ] Proposal view shows which board members voted aye/nay/abstained
- [ ] Board UI clearly displays voting status and results
- [ ] Supermajority autopass works correctly (auto-passes when majority reached)
- [ ] TypeScript compiles with no errors
- [ ] Voting system works correctly after changes

**Approach:**
1. Add vote cleanup when board members are removed (appointments deleted, reset board)
2. Enhance BoardProposal.getProposalsWithVotes() to return voter details
3. Update BoardTab.tsx to show who voted for what
4. Verify/fix autopass logic in cron/actions.ts
5. Improve UI clarity with better vote display

**Files:**
- [MOD] `backend/src/models/BoardProposal.ts` (add getVotersForProposal method)
- [MOD] `backend/src/routes/admin.ts` (clean votes on reset board)
- [MOD] `backend/src/routes/board.ts` (clean votes on appoint/remove)
- [MOD] `backend/src/cron/actions.ts` (verify autopass logic)
- [MOD] `frontend/components/BoardTab.tsx` (show voter details)

**Dependencies:** None

---

## Template
- FID: FID-YYYYMMDD-XXX
- Status: PLANNED
- Priority: H/M/L
- Complexity: 1-5
- Created: YYYY-MM-DD
- Estimated: Xh
- Description:
- Acceptance:
- Approach:
- Files:
- Dependencies:

