# LinguaCraft Quality Assurance Test Plan

**Scope**: Independent full-stack QA covering Web Frontend (`apps/web`), Backend API & Workers (`apps/api`), Shared Contracts (`packages/contracts`), and AI Service Layer across all **18 target areas**.  
**Last Verified**: `2026-11-24`

---

## 1. Test Pyramid & Tooling Stack

| Layer | Runner & Libraries | Target Coverage | Execution Mode |
| :--- | :--- | :--- | :--- |
| **Unit & Component Tests** | `Vitest v3`, React Testing Library, `jsdom` | Domain logic (`SegmentClock`, SM-2 scheduler, dictation grading, IELTS/TOEIC band calculators, phoneme/word aligner), UI validation, Pro gates, permission errors | `npm --workspace @linguacraft/web run test` & `npm --workspace @linguacraft/api run test` |
| **API Integration, Security & Consistency Tests** | `Vitest v3` + `Supertest` + NestJS `Test` module | End-to-end HTTP controller -> guards (`JwtAuthGuard`, `EntitlementGuard`, `ComplianceGuard`, `RateLimitGuard`) -> `ZodValidationPipe` -> `AllExceptionsFilter` -> domain services | Compiled with `unplugin-swc` decorator metadata; stateful in-memory Prisma/Storage doubles + in-memory Redis store |
| **End-to-End & Cross-Browser Tests** | `@playwright/test` | Real compiled `next start` server (`http://127.0.0.1:3100`) rendered in **Desktop Chrome (`1280x800`)** and **Mobile Microsoft Edge (`390x844`, touch)** | `npx playwright test` (`e2e/app.e2e.spec.ts`) |
| **Performance, Accessibility & SEO Audits** | `Lighthouse CLI` (headless Chrome) | Core Web Vitals (`FCP`, `LCP`, `CLS`, `TBT`) & Lighthouse categories against production Next.js SSR/static routes | `npx lighthouse` outputs persisted under `docs/qa/artifacts/` |
| **Static Safety & Build** | `ESLint 9`, `TypeScript 5.7`, `Prisma CLI`, `next build` | Zero lint errors, strict TS (`noUncheckedIndexedAccess`), Prisma schema/migration validity, Next.js App Router bundling | `npm run lint`, `npm run typecheck`, `npm --workspace @linguacraft/web run build`, `npm --workspace @linguacraft/api run build` |

---

## 2. Coverage Matrix Across All 18 QA Areas

| # | Area | Verification Methods |
| :--- | :--- | :--- |
| 1 | **Authentication** | Magic link validation, single-use Redis verify, refresh cookie rotation & family reuse revocation (`Supertest`), E2E `/login` validation & submit (`Playwright`) |
| 2 | **Dashboard** | Daily featured spotlight & guest daily check-in login prompt (`Vitest` component + `Playwright` `/dashboard` load) |
| 3 | **Lesson management** | CEFR filtering, pagination metadata, PRO YouTube import `202` vs Free `403`, daily cache (`Vitest` + `Supertest`) |
| 4 | **Dictation** | Word tokenization, difficulty masking, reveal hint penalties, idempotent reward ledger, live typing flow (`Vitest` + `Playwright`) |
| 5 | **Shadowing** | `Learn` vs `Watch` modes, transcript alignment, `SHADOWING` attempt threshold, honest AI `measurementTier` (`Vitest` + `Supertest`) |
| 6 | **Microphone permissions** | `NotAllowedError` handling UI tests (`Vitest` + `Playwright` real browser override on `/shadowing/morning-routine`) |
| 7 | **Audio playback** | `SegmentClock` `rAF` start/stop, `findCueIndexAtMs` `O(log n)` binary search, `HtmlMediaTransportAdapter` clamping (`Vitest`) |
| 8 | **Recording and uploads** | Explicit audio consent gate (`403 AUDIO_CONSENT_REQUIRED`), MIME/25MB checks, S3 `PUT`/`HeadObject` confirm, `DELETE /media/:assetId` (`Supertest`) |
| 9 | **Vocabulary** | Deck filtering, `POST /vocabulary/decks`, 24-card Pro preview cap, dictionary cache & AI explanations (`Vitest` + `Supertest`) |
| 10 | **Spaced repetition** | Pure SM-2 interval math (`1 -> 6 -> n*EF`, `Again` reset), card flip & `1–4` ratings, due queue API (`Vitest` + `Supertest`) |
| 11 | **Learning statistics** | Streak/XP/analytics switch (`IELTS`/`TOEIC`), weak-area computation, idempotent `/streak/checkin` (`Vitest` + `Supertest`) |
| 12 | **Community speaking** | Unverified-age block (`403 AGE_VERIFICATION_REQUIRED`), AI moderation flagging (`400`), room creation (`Vitest` + `Supertest`) |
| 13 | **IELTS / TOEIC** | Part selector math (`Playwright`), IELTS Band & TOEIC scaled calculators, `TEST` check block `403`, deadline guard, `submit` -> `result` (`Supertest`) |
| 14 | **Subscription entitlements** | Pro lesson transcript redaction, Pro YouTube import block, HMAC-SHA256 webhook signature verify + idempotent grant (`Supertest`) |
| 15 | **Responsive behavior** | Desktop (`1280x800` Chrome) vs Mobile (`390x844` Edge) sidebar/drawer toggle & zero horizontal scroll overflow assertions (`Playwright`) |
| 16 | **API security** | Helmet headers, forged JWT `401`, banned account `403`, cross-user IDOR `403`, Redis `429` burst rate-limiting, PII scrubbing (`Supertest`) |
| 17 | **Database consistency** | Idempotency keys (`DiamondLedger`, webhooks, sentence rewards), expired exam lockout, insufficient diamonds non-negative guard (`Supertest`) |
| 18 | **Performance** | Headless Chrome `Lighthouse` measurements (`Performance`, `FCP`, `LCP`, `CLS`, `TBT`) & Next.js bundle sizes (`next build`) |

---

## 3. Environment & Exclusions

- Docker Engine daemon (`postgres`, `redis`, `minio`) and vendor sandbox API keys (`AZURE_SPEECH_KEY`, `DEEPGRAM_API_KEY`, `GEMINI_API_KEY`) were not provisioned on the workstation. Accordingly, server persistence, S3 storage, and third-party AI adapters were verified through compiled NestJS modules, real Zod/JWT/HMAC/Guard execution, and deterministic in-memory doubles.
- Desktop Chrome and Mobile Microsoft Edge executed real browser E2E suites; native Firefox and Safari WebKit engines were not installed locally and remain scheduled for CI runners.
