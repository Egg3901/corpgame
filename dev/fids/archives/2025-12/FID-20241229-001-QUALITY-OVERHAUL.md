# FID-20241229-001: Project-Wide Quality Overhaul & Standardization

> **Status**: APPROVED
> **Priority**: CRITICAL (P0)
> **Owner**: Trae AI
> **Date**: 2024-12-29

## 1. Context & Objective
The project has undergone a migration from PostgreSQL to MongoDB and a partial transition to HeroUI. A recent quality audit revealed significant gaps:
- **UI**: < 30% HeroUI adoption; reliance on raw HTML/Tailwind.
- **Architecture**: Excessive `use client` with `useEffect` for data fetching, bypassing Next.js 14 Server Components.
- **Testing**: No standard test runner (Vitest/Jest); reliance on ad-hoc scripts.
- **Quality**: 25+ TODOs/placeholders remaining.
- **Security**: Naive DB-based rate limiting.

**Objective**: Bring the entire codebase to **AAA Production Quality** standards as defined in ECHO v1.4.0.

## 2. Scope & Acceptance Criteria

### 2.1 Scope
1.  **UI Framework**: Complete migration of all pages/components to `@heroui/react`.
2.  **Testing**: Implementation of Vitest testing framework with CI-ready configuration.
3.  **Architecture**: Refactor main list pages (Corporations, Market, etc.) to use React Server Components (RSC).
4.  **Code Quality**: Resolution of all "TODO", "FIXME", and placeholder content.
5.  **Security**: Implementation of robust rate limiting and strict type safety.

### 2.2 Acceptance Criteria
- [ ] **UI**: 0 instances of raw HTML forms/tables; 100% usage of HeroUI `Table`, `Input`, `Card`, `Button`.
- [ ] **Testing**: `npm test` runs Vitest; >80% coverage on `lib/` utils and models.
- [ ] **Performance**: Corporations list page loads data server-side (no layout shift).
- [ ] **QA**: `grep -r "TODO" .` returns 0 results (excluding this file).
- [ ] **Types**: `npx tsc --noEmit` passes with 0 errors and no `any` types in core paths.

## 3. Implementation Plan

### Phase 1: Foundation & Testing Setup (P0)
- **Task 1.1**: Install & Configure Vitest + React Testing Library.
- **Task 1.2**: Port existing ad-hoc scripts (`tests/*.js`) to `tests/unit/*.test.ts`.
- **Task 1.3**: Establish CI test command in `package.json`.

### Phase 2: Core Architecture Refactor (RSC) (P1)
- **Task 2.1**: Refactor `app/corporations/page.tsx` to Server Component.
- **Task 2.2**: Implement `CorporationsTable` client component for interactivity.
- **Task 2.3**: Refactor `app/stock-market/page.tsx` to Server Component.

### Phase 3: HeroUI Migration (Systematic) (P1)
- **Task 3.1**: Refactor `app/login/page.tsx` & `app/register/page.tsx` to HeroUI Forms.
- **Task 3.2**: Refactor `app/corporation/[id]/page.tsx` (Dashboard) to HeroUI Cards/Tabs.
- **Task 3.3**: Refactor `components/admin/SectorConfigPanel.tsx` to HeroUI.
- **Task 3.4**: Global CSS cleanup (remove unused Tailwind utility classes).

### Phase 4: QA Cleanup & Hardening (P2)
- **Task 4.1**: Audit and resolve all 25+ TODOs.
- **Task 4.2**: Implement `rate-limiter-flexible` for API routes.
- **Task 4.3**: Strict Type Audit (remove `any` from API responses).

## 4. Technical Specifications

### 4.1 Testing Stack
- **Runner**: Vitest (faster than Jest, native ESM support).
- **Environment**: JSDOM.
- **Integration**: React Testing Library.

### 4.2 HeroUI Patterns
- **Tables**: Use `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`.
- **Forms**: Use `<Input>`, `<Select>`, `<Checkbox>` with `isInvalid` prop for errors.
- **Loading**: Use `<Skeleton>` instead of custom spinners.
- **Feedback**: Use `<Chip>` for status indicators.

## 5. Risks & Mitigation
- **Risk**: RSC refactor breaks client-side interactivity (sorting/filtering).
  - *Mitigation*: Pass search params to Server Component; use `useRouter` for URL updates.
- **Risk**: HeroUI styling conflicts with legacy global CSS.
  - *Mitigation*: Isolate HeroUI provider; verify `tailwind.config.js` plugins.
