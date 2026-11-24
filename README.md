# Parroto / LinguaCraft Platform

Independent full-stack English learning platform monorepo featuring interactive dictation, shadowing, vocabulary & spaced-repetition flashcards (SM-2), IELTS/TOEIC exam practice, speaking community rooms, and a multi-provider AI speech/coaching layer.

---

## Tech Stack & Workspace Structure

This repository is organized as an **npm workspaces** monorepo:

| Path | Package | Description |
| :--- | :--- | :--- |
| `apps/web` | `@linguacraft/web` | Next.js 15 (App Router, React 19, Tailwind CSS v4, TanStack Query, Zustand, Vitest + Testing Library) |
| `apps/api` | `@linguacraft/api` | NestJS 11 REST & WebSocket API + BullMQ worker (Prisma 6, PostgreSQL 16, Redis 7, S3/MinIO, Swagger/OpenAPI, Vitest + Supertest) |
| `packages/contracts` | `@linguacraft/contracts` | Shared Zod schemas and TypeScript contracts shared across frontend and backend |
| `e2e` | — | Playwright end-to-end test suite (`desktop-chrome` and `mobile-msedge`) |
| `docs` | — | System architecture, database schema, OpenAPI spec (`docs/api/openapi.json`), AI design, and QA reports |
| `research` | — | Public-behavior reconnaissance and module/audio/API research notes |

---

## Core Modules

- **Backend (`apps/api/src/modules`)**: `auth`, `users`, `lessons`, `dictation`, `shadowing`, `vocabulary`, `srs`, `exams`, `media`, `ai`, `progress`, `community`, `subscriptions`.
- **Frontend (`apps/web/src/app`)**: Landing (`/`), Auth (`/login`, `/auth/callback`, `/auth/verify`), Dashboard (`/dashboard`), Lessons (`/lessons`), Dictation (`/dictation`, `/dictation/[slug]`), Shadowing (`/shadowing`, `/shadowing/[slug]`), Vocabulary (`/vocabulary`, `/vocabulary/[slug]`), Flashcards (`/flashcards`), Exams (`/exams/[track]`), Speaking (`/speaking`), Analytics (`/analytics`), Settings (`/settings`).

---

## Prerequisites

- **Node.js** `>= 20` and **npm**
- **Docker & Docker Compose** (for local PostgreSQL 16, Redis 7, and MinIO S3-compatible storage)

---

## Getting Started

### 1. Start local infrastructure

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 (`localhost:5432`)
- Redis 7 (`localhost:6379`)
- MinIO (`localhost:9000`, console at `localhost:9001`)

### 2. Configure environment variables

Copy the example environment files and adjust values as needed:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

> By default in `apps/api/.env.example`, `AI_PROVIDER=mock` is configured so local development and automated tests run without external paid vendor keys.

### 3. Install dependencies & configure Git hooks

```bash
npm install
```

`npm install` runs the `prepare` script, which configures `git config core.hooksPath .githooks` so `.githooks/pre-push` runs automatically before every `git push`.

### 4. Generate Prisma client & apply migrations

```bash
npm --workspace @linguacraft/api run prisma:generate
npm --workspace @linguacraft/api run prisma:migrate
```

### 5. Run development servers

Run the API, background worker, and Web frontend in separate terminals:

```bash
npm run dev:api
npm --workspace @linguacraft/api run dev:worker
npm run dev:web
```

---

## Available Scripts

Root `package.json` scripts:

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev:web` | `npm --workspace @linguacraft/web run dev` | Start Next.js development server |
| `npm run dev:api` | `npm --workspace @linguacraft/api run dev` | Start NestJS API in watch mode |
| `npm run lint` | `npm --workspace @linguacraft/web run lint` | Run ESLint on `@linguacraft/web` |
| `npm run typecheck` | `tsc --noEmit` across workspaces | Type-check `contracts`, `web`, and `api` |
| `npm run test` | Vitest across `web` and `api` | Run frontend RTL & backend Supertest suites |
| `npm run test:api` | `npm --workspace @linguacraft/api run test` | Run backend tests only |
| `npm run check` | `lint` + `typecheck` + `test` | Run all pre-push static & test checks |
| `npm run build` | Build `api` and `web` | Compile NestJS (`dist/`) and Next.js (`.next/`) |
| `npm run test:e2e` | `playwright test` | Run Playwright E2E suite against built web app |

---

## AI Agent & Pre-Push Verification Setup

This repository includes workspace configuration so both AI coding assistants and developers verify code quality before pushing:

- **[AGENTS.md](./AGENTS.md)**: Workspace rules instructing AI agents to run `npm run check` (and `npm run build` / `npm run test:e2e` as applicable), audit staged files for secrets/build artifacts, and never pass `--no-verify`.
- **[.agents/skills/pre-push-verify/SKILL.md](./.agents/skills/pre-push-verify/SKILL.md)**: Step-by-step pre-push verification skill for Antigravity-compatible agents.
- **[.githooks/pre-push](./.githooks/pre-push)**: Git `pre-push` hook that executes `npm run check` automatically before any `git push`.

If you clone fresh and have not run `npm install` yet, enable the hooks manually with:

```bash
git config core.hooksPath .githooks
```

---

## Documentation

- [Project Status](./docs/PROJECT_STATUS.md)
- [System Architecture](./docs/architecture/system-architecture.md)
- [Database Schema](./docs/database/database-schema.md)
- [API Specification](./docs/api/api-specification.md) & [OpenAPI JSON](./docs/api/openapi.json)
- [Known Limitations](./docs/KNOWN_LIMITATIONS.md)
- [QA Test Plan](./docs/qa/test-plan.md) & [QA Test Results](./docs/qa/test-results.md)
