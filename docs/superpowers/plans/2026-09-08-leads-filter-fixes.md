# Leads Filter Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two independent bugs on the Leads page: (1) the Role/Assignee dropdown returning all leads instead of the filtered subset, and (2) the search input visually resetting the active stage pill to "All Leads".

**Architecture:** Both are minimal targeted fixes. Bug 1 is a backend guard that incorrectly skips the `ownerId` WHERE conjunct for non-ORGANIZATION scope users. Bug 2 is a frontend mismatch where the visually-selected stage is driven by the query-override value (`effectiveStage`) instead of the persisted state (`selectedStage`); the fix also changes search to operate within the selected stage rather than globally across all stages.

**Tech Stack:** TypeScript, Prisma (backend); React, TanStack Query, Vitest (frontend).

**Spec:** No separate spec file. Requirements are embedded in this plan.

## Global Constraints

- Do NOT change unrelated behaviour, rename identifiers, or alter styling.
- Keep all existing tests passing; update only the tests that directly test the changed behaviour.
- Two independent repos: backend changes in `hpx-eigen-s1-foundation`, frontend changes in `hpx-eigen-frontend`. Commit each repo separately.
- main-only Git workflow — no branches, no PRs.

---

### Task 1: Backend — fix ownerId filter for all scope levels

**Root cause:** In `src/routes/leads.router.ts` the `ownerId` conjunct is guarded by `Object.keys(ownerFilter).length === 0`. This condition is only `true` for ORGANIZATION-scope users (ownerFilter is `{}`). For OWN/TEAM/DEPARTMENT-scope users the ownerFilter is non-empty, so the guard fails and the `ownerId` query parameter is silently dropped — the filter appears to do nothing.

The same pattern appears twice: once inside `buildLeadFilterWhere` (used by `GET /leads` and `GET /leads/export`) and once inside the `GET /stage-counts` handler.

The fix is safe: the scope-based `ownerFilter` is already spread into the WHERE clause. AND-ing an ownerId conjunct can only narrow the result set — it can never return records outside the scope the user is already restricted to.

**Files:**
- Modify: `hpx-eigen-s1-foundation/src/routes/leads.router.ts` (two locations)

**Interfaces:**
- Consumes: `buildOwnerFilter` return value, `req.query.ownerId`
- Produces: correct Prisma WHERE that applies ownerId for all scope levels

- [ ] **Step 1: Locate the two guards**

Open `hpx-eigen-s1-foundation/src/routes/leads.router.ts`.

First occurrence is inside `buildLeadFilterWhere` (around line 95–101):
```typescript
if (ownerId === 'UNASSIGNED') {
  conjuncts.push({ ownerId: null });
} else if (ownerId && Object.keys(ownerFilter).length === 0) {
  // Only ORGANIZATION-scope users (admins) may target an arbitrary owner;
  // scoped users are already constrained by ownerFilter.
  conjuncts.push({ ownerId });
}
```

Second occurrence is inside the `GET /stage-counts` handler (around line 890–894):
```typescript
if (ownerId === 'UNASSIGNED') {
  conjuncts.push({ ownerId: null });
} else if (ownerId && Object.keys(ownerFilter).length === 0) {
  conjuncts.push({ ownerId });
}
```

- [ ] **Step 2: Apply the fix — remove the scope guard from both locations**

Replace BOTH occurrences of:
```typescript
} else if (ownerId && Object.keys(ownerFilter).length === 0) {
```
with:
```typescript
} else if (ownerId) {
```

Also remove the now-stale comment from the first occurrence ("Only ORGANIZATION-scope users...").

After the edit, both blocks should read:
```typescript
if (ownerId === 'UNASSIGNED') {
  conjuncts.push({ ownerId: null });
} else if (ownerId) {
  conjuncts.push({ ownerId });
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "H:/HPX Eigen Reborn/hpx-eigen-s1-foundation"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Commit**

```bash
cd "H:/HPX Eigen Reborn/hpx-eigen-s1-foundation"
git add src/routes/leads.router.ts
git commit -m "fix(leads): apply ownerId filter for all scope levels, not just ORGANIZATION

The ownerId conjunct was guarded by Object.keys(ownerFilter).length === 0,
meaning it only fired for ORGANIZATION-scope users. Non-admin users selecting
a specific assignee silently got all their scoped leads instead.

Removing the guard is safe: the ownerFilter is already spread into the WHERE
clause, so adding an ownerId conjunct can only narrow the result set.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Frontend — fix stage-pill visual reset when searching

**Root cause (A):** `LeadsPage.tsx:547` passes `selectedStage={effectiveStage}` to `StageFilterPills`. `effectiveStageForSearch()` returns `''` whenever a search term is present, so the "All Leads" pill highlights instead of the actually-selected stage.

**Root cause (B):** The `onSelect` handler clears the search when a pill is clicked (`if (searchQuery) setSearchQuery('');`), meaning clicking a different pill loses the search term.

**Product change:** Search should now operate within the selected stage (not globally across all stages). This is an intentional change from the prior behaviour where a search always dropped the stage constraint to avoid missing leads in other stages. The new behaviour is more intentional: users explicitly choose a stage and then search within it. Selecting "All Leads" before searching is the global-search path.

**Files:**
- Modify: `hpx-eigen-frontend/src/domain/leadsQuery.ts`
- Modify: `hpx-eigen-frontend/src/domain/leadsQuery.test.ts`
- Modify: `hpx-eigen-frontend/src/pages/LeadsPage.tsx`

**Interfaces:**
- `effectiveStageForSearch` signature unchanged; its return value changes to always equal the input `stage`.
- `StageFilterPills.selectedStage` prop now receives `selectedStage` (not `effectiveStage`).

- [ ] **Step 1: Change `effectiveStageForSearch` to be an identity function**

In `hpx-eigen-frontend/src/domain/leadsQuery.ts`, replace the entire file content with:

```typescript
import type { LeadStage } from '../types';

// Search now operates within the selected stage. The stage filter is no longer
// dropped when a search term is active.
export function effectiveStageForSearch(
  stage: LeadStage | '',
  _search: string,
): LeadStage | '' {
  return stage;
}
```

- [ ] **Step 2: Update the test to match the new behaviour**

In `hpx-eigen-frontend/src/domain/leadsQuery.test.ts`, replace the file content with:

```typescript
import { describe, it, expect } from 'vitest';
import { effectiveStageForSearch } from './leadsQuery';

describe('effectiveStageForSearch', () => {
  it('returns the stage unchanged regardless of search term', () => {
    expect(effectiveStageForSearch('NEW', 'KRUNA')).toBe('NEW');
    expect(effectiveStageForSearch('FOLLOW_UP', 'acme')).toBe('FOLLOW_UP');
    expect(effectiveStageForSearch('NEW', '')).toBe('NEW');
    expect(effectiveStageForSearch('', 'anything')).toBe('');
    expect(effectiveStageForSearch('', '')).toBe('');
  });
});
```

- [ ] **Step 3: Run the test to confirm it passes**

```bash
cd "H:/HPX Eigen Reborn/hpx-eigen-frontend"
npx vitest run src/domain/leadsQuery.test.ts
```

Expected: 1 test suite, 1 test, all pass.

- [ ] **Step 4: Fix `LeadsPage.tsx` — pass `selectedStage` to `StageFilterPills`**

In `hpx-eigen-frontend/src/pages/LeadsPage.tsx`, locate the `StageFilterPills` usage (around line 546):

```tsx
<StageFilterPills
  selectedStage={effectiveStage}
  stageCounts={stageCounts}
  colourfulFilters={colourfulFilters}
  onSelect={(s) => { if (searchQuery) setSearchQuery(''); setSelectedStage(s); }}
/>
```

Replace with:

```tsx
<StageFilterPills
  selectedStage={selectedStage}
  stageCounts={stageCounts}
  colourfulFilters={colourfulFilters}
  onSelect={(s) => { setSelectedStage(s); }}
/>
```

Changes:
- `selectedStage={effectiveStage}` → `selectedStage={selectedStage}` (visual highlight reflects persisted state, not query override)
- Removed `if (searchQuery) setSearchQuery('');` (clicking a pill preserves the search term)

Note: `effectiveStage` is still used in the leads `queryKey` and `queryFn` (and still equals `selectedStage` after the identity-function change in Task 2 Step 1). No other changes needed.

- [ ] **Step 5: Verify TypeScript**

```bash
cd "H:/HPX Eigen Reborn/hpx-eigen-frontend"
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 6: Run all frontend tests**

```bash
cd "H:/HPX Eigen Reborn/hpx-eigen-frontend"
npx vitest run
```

Expected: all tests pass. If `StageFilterPills` tests check the `selectedStage` prop via `effectiveStage`, update them to pass `selectedStage` directly.

- [ ] **Step 7: Commit**

```bash
cd "H:/HPX Eigen Reborn/hpx-eigen-frontend"
git add src/domain/leadsQuery.ts src/domain/leadsQuery.test.ts src/pages/LeadsPage.tsx
git commit -m "fix(leads): search within selected stage; preserve pill highlight during search

Two bugs fixed:

1. StageFilterPills received effectiveStage (which resolves to '' during
   search) instead of selectedStage, causing the 'All Leads' pill to
   highlight whenever a search was active.

2. The onSelect handler cleared searchQuery when clicking a pill, losing
   the user's search term.

Product behaviour change: effectiveStageForSearch now returns the stage
unchanged. Search operates within the selected stage rather than globally
across all stages. Selecting 'All Leads' is the global-search path.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Verification

After both tasks are committed and deployed (or tested locally):

1. Log in to the CRM as an Organization Admin.
2. Open `/leads`, select Departments → Sales.
3. Open Role/Assignee dropdown → select a specific person → confirm list shows only their leads and pill counts reflect the filtered set.
4. Select a different assignee → confirm results update.
5. Select "All [Role]" → confirm all role members' leads appear.
6. Click the "Follow-up" pill → type a search term → confirm "Follow-up" pill stays highlighted and results are follow-up leads matching the search.
7. Click a different pill while search is active → confirm pill changes and search term persists.
8. Clear the search → confirm you return to the stage-filtered (non-search) view with the correct pill highlighted.
9. Confirm "All Leads" + search still shows all leads matching the search (no stage restriction).
