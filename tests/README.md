# Test Suite

## Overview

This project uses two test layers:

- `vitest` for unit and integration tests (fast feedback + coverage)
- Legacy Node test scripts for backwards compatibility checks

## Commands

- `npm test`
  - Runs the Vitest suite (watch mode by default).

- `npm run test:coverage`
  - Runs Vitest in CI mode and produces coverage reports.
  - Coverage reports:
    - Text summary in the console
    - `coverage/` HTML report
    - `coverage/coverage-final.json`

- `npm run test:legacy`
  - Runs legacy test scripts under `tests/*.js`.

## Structure

- `tests/unit/`
  - Pure logic tests (finance calculations, utilities, API route handlers with mocks).

- `tests/integration/`
  - Multi-module workflow tests (UI flows using Testing Library).

- `tests/setup.ts`
  - Shared runtime setup and Next.js mocks.

## Coverage policy

Coverage thresholds are enforced for recently modified modules.
If a change introduces new branches or error paths, add tests for both:

- expected success behavior
- invalid input and error handling

## Debugging failures

- Use `vitest --run --reporter=verbose` for more detail.
- For UI tests, use `screen.debug()` to inspect the rendered DOM.
