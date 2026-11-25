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

## Impeccable UI & Design Workflow (`apps/web`)

When running `/impeccable` commands or designing/refining UI in this monorepo, follow these workspace-specific conventions:

### Launcher, Target & Artifact Scope

- **Windows CLI launcher**: Always invoke `.agent/skills/impeccable/scripts/impeccable.cmd` in Windows shells (or `.agent/skills/impeccable/scripts/impeccable` on Unix/macOS).
- **Monorepo UI target**: Always target `apps/web` (`--target apps/web` for `context`, `signals`, `live`, `shot`, or run with `cwd` = `apps/web`). Never run unscoped `detect .` across `apps/api`, `packages/contracts`, `docs`, or `research`.
- **Canonical Impeccable artifacts**:
  - Product truth: `apps/web/PRODUCT.md` (`platform: web`)
  - Design system & sidecar: `apps/web/DESIGN.md` and `apps/web/.impeccable/design.json`
  - Live mode config: `apps/web/.impeccable/live/config.json`
  - Shared hook & detector config: `.impeccable/config.json` (hooks wired in `.agents/hooks.json`)

### Command Playbook

1. **`/impeccable init`**:
   - Run `.agent/skills/impeccable/scripts/impeccable.cmd context --target apps/web` first.
   - Explore `README.md`, `docs/PROJECT_STATUS.md`, `apps/web/src/app/**`, and `apps/web/src/features/**` before interviewing the user so confirmed product facts are not re-asked.
   - Write confirmed facts (`platform: web`, core learning modes: dictation, shadowing, vocabulary/SM-2 flashcards, IELTS/TOEIC mock exams, speaking lobby, analytics) to `apps/web/PRODUCT.md`.
2. **`/impeccable context`**:
   - Run `.agent/skills/impeccable/scripts/impeccable.cmd context --target apps/web` once per UI session (never bare `context` at repo root).
   - Load `apps/web/PRODUCT.md`, `apps/web/DESIGN.md`, and `apps/web/.impeccable/design.json` if present before editing frontend UI.
3. **`/impeccable document`**:
   - Run in **Scan mode** against `apps/web/src/app/globals.css` (Tailwind CSS v4 + `:root` / `.dark` CSS custom properties), `apps/web/src/app/layout.tsx`, `apps/web/src/shared/ui/**`, and `apps/web/src/features/**`.
   - Extract real CSS variable tokens, typography, radii, and shared primitives into `apps/web/DESIGN.md` and `apps/web/.impeccable/design.json` without inventing unused tokens.
4. **`/impeccable critique the entire application`**:
   - Scope source inspection to `apps/web/src` and use the running Next.js server (`http://localhost:3000`, or `npm --workspace @linguacraft/web run start -- -p 3100` after build) for rendered inspection.
   - Run isolated dual-agent Assessment A (design review with `.agent/skills/impeccable/reference/critique-rubric.md`, checking **Persuade** mode for `/` and **Operate** mode for workspace routes) and Assessment B (`impeccable.cmd detect --json apps/web/src` + desktop `1280x800` & mobile `390x844` browser inspection across representative routes: `/`, `/login`, `/dashboard`, `/lessons`, `/dictation`, `/shadowing`, `/vocabulary`, `/flashcards`, `/exams/ielts`, `/speaking`, `/analytics`, `/settings`).
   - Do not fabricate live backend metrics if `apps/api` is offline; evaluate API-backed loading/empty/error states honestly.
5. **`/impeccable audit the entire application`**:
   - Audit all 5 technical dimensions (Accessibility WCAG AA, Performance, Theming incl. `:root` & `.dark`, Responsive `390x844` & `1280x800`, and Implementation Integrity) across `apps/web/src` without modifying code.
   - Combine `impeccable.cmd detect --json apps/web/src` with `npm run lint`, `npm --workspace @linguacraft/web run test`, and `npm run test:e2e` / Lighthouse findings.
6. **`/impeccable polish the entire application`**:
   - Load `apps/web/DESIGN.md`, `.agent/skills/impeccable/reference/craft-floor.md`, and any active `critique-storage latest` snapshot before editing.
   - Apply fixes in priority order: `apps/web/src/shared/ui/**` (systemic primitives & shell) first, then `apps/web/src/app/**` and `apps/web/src/features/**`.
   - Preserve existing RTL/Playwright selectors, ARIA attributes, and Tailwind CSS variable theming.
   - After UI edits, verify rendered views and run `npm run check`, `npm run build`, and `npm run test:e2e` (when UI/routes changed) before committing or pushing.
