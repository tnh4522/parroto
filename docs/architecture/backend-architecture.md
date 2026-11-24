# Backend Architecture — NestJS Modular Monolith & Services

**Stack**: NestJS (TypeScript), Prisma ORM, PostgreSQL, Redis, BullMQ, Socket.IO, Zod.  
**Related Specs**: [system-architecture.md](file:///d:/parroto/docs/architecture/system-architecture.md), [database-schema.md](file:///d:/parroto/docs/database/database-schema.md), [api-specification.md](file:///d:/parroto/docs/api/api-specification.md).

---

## 1. Module Structure (`apps/api/src`)

```text
apps/api/src/
├── core/
│   ├── config/                 # Env validation (Zod)
│   ├── database/               # PrismaService + transaction helper
│   ├── redis/                  # Redis clients (cache, locks, pub/sub)
│   ├── storage/                # S3 Pre-signed URL & media key policy service
│   ├── queue/                  # BullMQ module & worker registration
│   ├── observability/          # Structured Pino logging, requestId/traceId, OpenTelemetry metrics
│   └── security/               # Guards, decorators, rate limiter, CSRF/CORS
├── modules/
│   ├── iam/                    # Auth, JWT/Refresh cookies, OAuth2, RBAC, Entitlements, Age gate
│   ├── lessons/                # Topics, Dictation/Shadowing, Grammar, Stories, Progress & Attempts
│   ├── vocabulary/             # Decks, Dictionary, Cards, SM-2 / FSRS SRS Engine
│   ├── exams/                  # IELTS & TOEIC Catalog, Timed Sessions, Scoring & Analytics
│   ├── ai/                     # Pluggable AI providers, Prompt registry, Audit logger, Cost caps
│   ├── community/              # Posts, Comments, Friends, Moderation Reports, WebSocket Chat/Speaking
│   ├── gamification/           # Streaks, Freezes, XP/Level, Diamond Ledger, Shop, Missions, Leaderboard
│   └── billing/                # Plans, Promo codes, Checkout Webhooks (Card/QR), Affiliates
└── worker.main.ts              # Standalone BullMQ worker entrypoint (same codebase, separate container)
```

---

## 2. Authentication, Authorization & Access Control Design

### 2.1 Token & Session Lifecycle (`iam`)
- **Primary Auth Methods**:
  - OAuth2 Authorization Code Flow with PKCE (`Google`, `Apple`) verified server-side.
  - Passwordless Email Magic Link / OTP (`10-min` single-use hashed token stored in Redis) and standard Email + Argon2id password auth.
- **Dual-Token Model**:
  - **Access Token (JWT)**: Short-lived (`15 min`), signed with asymmetric `EdDSA`/`RS256` (or `HS256` rotated secrets), returned in JSON/memory; carries `sub` (userId), `role`, `entitlementTier`, `sessionVersion`.
  - **Refresh Token**: Opaque `256-bit` random token persisted hashed (`SHA-256`) in `auth_sessions` (`PostgreSQL`) + Redis cache, delivered exclusively in an `HttpOnly; Secure; SameSite=Lax` cookie scoped to `/api/v1/auth`.
  - **Refresh Rotation & Reuse Detection**: Every `POST /auth/refresh` revokes the used refresh token and issues a new pair; reuse of a rotated token revokes the entire token family immediately.

### 2.2 Authorization Layers (NestJS Guards)
1. `JwtAuthGuard` (`@Public()` opt-out for catalog/comment reads).
2. `AccountStatusGuard`: Enforces `status === ACTIVE` (rejects `BANNED` -> `403 ACCOUNT_BANNED`, requires onboarding username if unset -> `403 USERNAME_REQUIRED`).
3. `EntitlementGuard` (`@RequireEntitlement("PRO")`): Verifies active subscription (`expiresAt > now() || isLifetime`) inside `entitlement_grants`, returning `403 ENTITLEMENT_REQUIRED` for Pro lessons, Pro vocabulary decks, AI YouTube import, and Pro exams.
4. `ComplianceGuard`: Enforces `birthDate` / `ageVerifiedAt >= 13/16/18` policy before permitting `POST /chat/private/*` or creating voice chat rooms (`403 AGE_VERIFICATION_REQUIRED`).
5. `RateLimitGuard` (Redis sliding window): Protects auth endpoints, dictionary queries, AI endpoints, and comment creation.

---

## 3. Asynchronous Processing & BullMQ Job Queues

All slow, external-I/O, or CPU-heavy operations run in `worker.main.ts` backed by Redis **BullMQ**:

| Queue Name | Producer Event | Job Responsibilities | Retry & Backoff Policy |
| :--- | :--- | :--- | :--- |
| `media-ingestion` | Admin upload or Pro user `"Import YouTube Lesson"` (`POST /community-lessons/import`) | Validates metadata/duration quota -> downloads/extracts permitted audio track -> runs `ffmpeg` loudnorm & AAC/MP3 optimization -> uploads to private S3 -> triggers `ai-transcription`. | 3 attempts, exponential backoff (`10s, 30s, 90s`), DLQ alert on permanent failure. |
| `ai-transcription` | `media-ingestion` completion or optional server STT verification | Invokes configured `SttProvider` -> segments transcript into `[startMs, endMs]` -> invokes `LlmProvider` for translations/IPA enrichment -> commits `lesson_sentences` -> marks lesson `READY`. | 3 attempts, per-provider timeout (`60s`), fallback provider routing. |
| `audio-verification` | High-stakes speaking verification / mission claim (optional) | Downloads pre-signed user audio upload -> computes server-side audio duration / VAD check -> optional server STT validation -> cleans temp file or stores per retention TTL. | 2 attempts; never blocks instant client feedback. |
| `exam-maintenance` | Scheduled cron (`every 1 min`) & on exam submit | Auto-finalizes expired `IN_PROGRESS` `TEST` mode exam sessions when `now() > deadlineAt + 5s`; computes final IELTS band / TOEIC scaled score; writes analytics rollup row. | Idempotent DB lock (`status = 'IN_PROGRESS'` WHERE check). |
| `leaderboard-rollup` | Scheduled cron (`every 5 min`) & month-end close | Syncs Redis `ZSET leaderboard:monthly:{yyyymm}` to PostgreSQL snapshots; awards monthly top-rank diamond/badge prizes via idempotent `diamond_ledger` entries (`month:rank:userId` unique key). | Idempotent ledger constraint prevents double payouts. |
| `notifications-dispatch` | Streak milestone, reply created, purchase confirmed | Fans out in-app `notifications` records + WebSocket push to connected sockets (`user:{id}`). | 5 attempts, backoff `5s`. |

---

## 4. Caching & Concurrency Control (Redis)

- **Catalog Cache (`cache-aside`)**: Exam sets (`TTL 5m`), Grammar syllabus (`TTL 10m`), Shop items (`TTL 5m`), Promo events (`TTL 60s`), Dictionary word entries (`TTL 24h`) — invalidated explicitly on admin publish.
- **Distributed Locks (`Redlock / SET NX PX`)**: Prevents duplicate diamond credit on webhook replay, concurrent `exam-session/submit` double-grading, and race conditions on `streak/checkin`.
- **Realtime Adapter**: `@socket.io/redis-adapter` synchronizes `/chat` community rooms, `/speaking` lobby presence, and `/vocab-battle` PvP room state across multiple NestJS API replicas.
