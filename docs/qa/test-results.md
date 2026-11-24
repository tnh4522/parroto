# LinguaCraft QA Test Execution Results

**Execution Date**: `2026-11-24`  
**Node / OS**: Node `v26.12.1` on Windows

---

## 1. Summary Ledger

| Check Command | Scope | Result | Verified Counts | Run Reference |
| :--- | :--- | :--- | :--- | :--- |
| `npm run lint` | Next.js ESLint (`apps/web`) | **PASS** | `0` errors, `0` warnings | `task-1243` |
| `npm run typecheck` | `@linguacraft/contracts`, `web`, `api` | **PASS** | `0` TypeScript errors (`tsc --noEmit`) | `task-1243` |
| `npm --workspace @linguacraft/web run test` | Frontend Vitest unit & RTL specs | **PASS** | **15 test files passed, 29 tests passed** | `task-1267` |
| `npm --workspace @linguacraft/api run test` | Backend Vitest + Supertest specs | **PASS** | **8 test files passed, 16 tests passed** | `task-1272` |
| `npm --workspace @linguacraft/web run build` | Production Next.js 15 App Router build | **PASS** | 21 App Router routes compiled (`16/16` static pages generated) | `task-1272` |
| `npx playwright test --reporter=list` | Live browser E2E (`desktop-chrome` + `mobile-msedge`) | **PASS** | **14 passed (7 scenarios x 2 browser/viewport targets)** in `10.6s` | `task-1285` |
| `npx lighthouse` | Production SSR performance & a11y (`/` & `/login`) | **PASS** | See detailed metrics in Section 3 below | `task-1290` + saved JSON read |

---

## 2. Backend Security & Regression Breakdown

All `8` backend test files (`16` tests) executed after the final API edit (`qa-security-consistency.spec.ts`):
- `src/modules/auth/auth.spec.ts` (`2/2` passed): magic link DTO rejection, single-use verify, `GET /users/me`, `PATCH /users/me/onboarding`, `PATCH /users/me/preferences`, refresh cookie rotation, refresh token reuse family revocation.
- `src/modules/media/media-ai.spec.ts` (`2/2` passed): PII redaction, MIME reject `400`, S3 presign + `HeadObject` confirm, foreign owner playback block `403`, `/audio/transcribe-fallback` + `AiAuditLog` persistence.
- `src/modules/ai/ai-layer.spec.ts` (`2/2` passed): DP word alignment without fabricated phonemes, audio consent gate (`403`), consent persistence, circuit fallback (`measurementTier = "TRANSCRIPT_COMPARISON_ONLY"`, `phonemes = null`, `prosody = null`), IELTS disclaimer (`isOfficialScore: false`), recording deletion via S3 `DeleteObjectCommand`, Vocabulary & TOEIC explain JSON contracts.
- `src/modules/lessons/lessons.spec.ts` (`2/2` passed): CEFR filter + pagination, Pro lesson transcript redaction, idempotent `DICTATION` & `SHADOWING` diamond rewards, PRO YouTube import (`202` BullMQ enqueue vs `403` Free).
- `src/modules/vocabulary/vocab-srs.spec.ts` (`2/2` passed): SM-2 interval math (`LEARNING -> REVIEW -> RELEARNING`), Pro `24`-card preview cap, personal deck creation `201`, Redis dictionary read, SM-2 review persistence.
- `src/modules/exams/exams-progress.spec.ts` (`2/2` passed): IELTS band & TOEIC scaled formulas, full `PRACTICE` session -> inline check -> submit -> result -> analytics -> history ordering, `TEST` check guard `403`, idempotent `/streak/checkin`.
- `src/modules/community/community-subscriptions.spec.ts` (`2/2` passed): age-verification room block (`403`), AI moderation reject (`400`), HMAC-SHA256 webhook signature reject/accept + idempotency, atomic diamond shop debit, expired exam sweep worker.
- `src/test/qa-security-consistency.spec.ts` (`2/2` passed): Helmet security headers (`nosniff`, `SAMEORIGIN`), forged JWT `401`, banned account `403`, cross-user IDOR `403`, expired `TEST` deadline `403`, non-negative diamond shop balance guard, malformed UUID `400` + `traceId`, and burst `/magic-link` `429 RATE_LIMIT_EXCEEDED`.

---

## 3. Lighthouse Production Audit (`127.0.0.1:3100`)

Measured directly from [lighthouse-home.json](file:///d:/parroto/docs/qa/artifacts/lighthouse-home.json) and [lighthouse-login.json](file:///d:/parroto/docs/qa/artifacts/lighthouse-login.json):

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `/` (Landing) | **100** | **100** | **96** | **100** | `0.8 s` | `0.8 s` | `0` | `60 ms` |
| `/login` | **100** | **96** | **96** | **100** | `0.8 s` | `0.8 s` | `0` | `50 ms` |

---

## 4. Playwright E2E Cross-Browser Results (`task-1285`)

- **`desktop-chrome` (`1280x800`, Chrome channel)**: `7/7` scenarios passed.
- **`mobile-msedge` (`390x844`, touch Edge channel)**: `7/7` scenarios passed (including mobile `"Open menu"` drawer visibility & zero horizontal scroll overflow on `/` and `/dashboard`).
