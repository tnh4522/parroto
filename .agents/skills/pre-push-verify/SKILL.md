---
name: pre-push-verify
description: >-
  Use this skill before committing or pushing code in this repository to run
  lint, typecheck, tests, build checks, and staged-file safety audits.
---

# Pre-Push Verification Workflow

Run this checklist before every `git commit` and `git push`.

## Steps

1. **Run the unified quality gate** (ESLint, TypeScript across all workspaces, Web Vitest, and API Vitest + Supertest):
   ```bash
   npm run check
   ```
2. **Verify workspace production builds** (when `apps/` or `packages/` changed):
   ```bash
   npm run build
   ```
3. **Run E2E suite when UI/routes/E2E specs changed**:
   ```bash
   npm run test:e2e
   ```
4. **Audit working tree & staged changes** before committing/pushing:
   ```bash
   git status
   ```
   Confirm no `.env` secrets, `dist/`, `.next/`, `coverage/`, or `test-results/` files are tracked or staged.
5. **Commit and push without bypassing hooks** (`--no-verify` is prohibited). `.githooks/pre-push` will execute `npm run check` automatically on push.
