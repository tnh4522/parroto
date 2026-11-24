# Master Implementation Roadmap

**Architecture Baseline**: [system-architecture.md](file:///d:/parroto/docs/architecture/system-architecture.md) · **Detailed Module Roadmap**: [implementation-roadmap.md](file:///d:/parroto/docs/implementation/implementation-roadmap.md)

---

## Phased Delivery Tracker

| Phase | Scope | Target Exit Criteria | Current Status |
| :--- | :--- | :--- | :--- |
| **Phase 0** | REA MCP verification & schema audit | Verified MCP settings + browser/JS/network tool parameter schemas + CDP reachability probe | **Done** (`2026-11-24`) |
| **Phase 1** | Public site reconnaissance | Page inventory, navigation map, UI components, auth/Pro boundaries | **Done** (`research/website/*`) |
| **Phase 2** | JS, Network/API, Audio & Exam module recon | Chunk graph, API candidate contracts, audio engine lifecycle analysis | **Done** (`research/{javascript,api,audio,modules}/*`) |
| **Phase 3** | Technical architecture & DB/API/AI specs | Consistent Postgres schema, OpenAPI/REST contracts, AI capability evaluation | **Done** (`docs/{architecture,database,api,ai}/*`) |
| **Phase 4** | Frontend & Backend Core (13 Web + 13 API modules) | All App Router routes + NestJS modules + Prisma migrations + typecheck/lint/unit/integration tests | **Done** (`apps/web`, `apps/api`, `packages/contracts`) |
| **Phase 5** | AI Speech, Pronunciation, IELTS/TOEIC Coaching & Privacy | Decoupled adapters, BullMQ workers, consent enforcement, S3 deletion, honest telemetry tiers | **Done** (`apps/api/src/modules/ai`, `docs/ai/*`) |
| **Phase 6** | Comprehensive QA | Vitest, Supertest security/DB checks, Chrome/Edge Playwright E2E, Lighthouse audits | **Done** (`docs/qa/*`, `e2e/*`) |
| **Phase 7** | Staging / Production Deployment | Live Docker/Cloud Postgres (`prisma migrate deploy`), Redis, MinIO/S3, CDN, Admin UI seeding, Monitoring | **Next Milestone** |

---

## Phase 7 Production Cutover Prerequisites

1. Launch `postgres`, `redis`, and `minio` (`docker compose up -d`) and apply `npm --workspace @linguacraft/api run prisma:migrate`.
2. Provision production S3 CORS rules, domain TLS, Stripe/Paddle/VietQR webhook secrets, and OAuth2 Google/Apple client credentials.
3. Configure optional live AI keys (`AZURE_SPEECH_KEY`, `DEEPGRAM_API_KEY`, `GEMINI_API_KEY`) strictly in backend secrets vault.
4. Build and start dedicated Web (`apps/web`), API (`apps/api/dist/main.js`), and BullMQ Worker (`apps/api/dist/worker.main.js`) containers alongside Playwright CI matrix (`chromium`, `firefox`, `webkit`).
