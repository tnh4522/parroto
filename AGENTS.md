# Repository Instructions for AI Agents

This repository is the **LinguaCraft (Parroto)** npm-workspaces monorepo:
- `apps/web` — Next.js 15 frontend (`@linguacraft/web`)
- `apps/api` — NestJS 11 + Prisma 6 + BullMQ backend (`@linguacraft/api`)
- `packages/contracts` — Shared Zod schemas and TypeScript contracts (`@linguacraft/contracts`)
- `e2e` — Playwright end-to-end tests

## Mandatory Pre-Commit & Pre-Push Checks

Before creating a commit or pushing code (`git commit` / `git push`), you MUST verify that the codebase passes all quality gates:

1. **Run lint, typecheck, and unit/integration tests**:
   ```bash
   npm run check
   ```
   (`npm run check` runs `npm run lint`, `npm run typecheck`, and `npm run test` across workspaces.)
2. **Verify production builds** whenever code or configuration in `apps/web`, `apps/api`, or `packages/contracts` changed:
   ```bash
   npm run build
   ```
3. **Run Playwright E2E tests** (`npm run test:e2e`) when changing UI flows, routing, or Playwright specs (after building `apps/web`).
4. **Inspect staged files before committing**:
   - Run `git status` and `git diff --cached --stat`.
   - Ensure no `.env` files, credentials, API keys, `node_modules/`, `dist/`, `.next/`, `coverage/`, or `test-results/` artifacts are staged.
5. **Never bypass Git hooks**:
   - Do NOT use `git push --no-verify` or `git commit --no-verify`.
   - The repository ships `.githooks/pre-push`, which automatically executes `npm run check` before pushing. If a check fails, fix the issue and re-run verification before pushing again.

## Architecture & Coding Guardrails

- Keep request/response schemas synchronized in `packages/contracts` (`@linguacraft/contracts`) rather than duplicating DTOs.
- Preserve capability-honest AI telemetry boundaries: never fabricate phoneme or prosody scores when using transcript-only or mock providers.
- Never commit real vendor keys (`AZURE_SPEECH_KEY`, `DEEPGRAM_API_KEY`, `GEMINI_API_KEY`, OAuth secrets, or billing webhook secrets); document variables in `.env.example` only.
