# Frontend Architecture — Next.js App Router & Client Modules

**Stack**: Next.js (App Router, TypeScript), React, Tailwind CSS, Radix UI, TanStack Query, Zustand, `next-intl`, Web Workers (`onnxruntime-web`), Web Audio API.  
**Related Specs**: [system-architecture.md](file:///d:/parroto/docs/architecture/system-architecture.md), [audio-architecture.md](file:///d:/parroto/docs/architecture/audio-architecture.md), [api-specification.md](file:///d:/parroto/docs/api/api-specification.md).

---

## 1. Repository & Directory Structure (`apps/web`)

```text
apps/web/src/
├── app/
│   ├── [locale]/
│   │   ├── (marketing)/              # Top navbar + full footer shell
│   │   │   ├── page.tsx              # / (SSG + ISR landing)
│   │   │   ├── pricing/page.tsx      # Public plans & FAQ
│   │   │   ├── blog/                 # Editorial MDX / CMS routes
│   │   │   └── (legal)/              # about, advisors, privacy, terms, contact
│   │   ├── (auth)/                   # /login, /auth/callback, /auth/verify
│   │   ├── (workspace)/              # App sidebar + mobile drawer + top search bar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── topics/               # /topics, /topics/[slug], /dictation, /shadowing
│   │   │   ├── lessons/[mode]/[slug]/page.tsx  # Dictation & Shadowing workspaces
│   │   │   ├── vocabulary/           # /vocabulary, /[slug], /review, /my-vocabulary
│   │   │   ├── grammar/              # /grammar, /[slug], /review
│   │   │   ├── stories/              # /stories, /[slug]
│   │   │   ├── exams/[track]/        # ielts|toeic index, /sets/[setSlug], /[slug], /session/[id], /history, /analytics
│   │   │   ├── speaking/page.tsx     # Voice rooms lobby & active room
│   │   │   ├── games/                # /games, /vocab-battle, /word-rain, ...
│   │   │   └── community/            # /community, /chat, /leaderboard, /feedbacks, /shop, /affiliate, /profile
│   │   └── (immersive)/
│   │       └── shorts/page.tsx       # Distraction-free vertical feed
├── features/                         # Colocated feature modules (hooks, components, schemas)
│   ├── auth/
│   ├── lessons/
│   ├── exams/
│   ├── vocabulary/
│   ├── audio-engine/                 # Transport controller, SegmentClock, CapturePipeline, Worker client
│   ├── dictionary/
│   ├── community/
│   └── billing/
├── shared/
│   ├── api/                          # Typed fetch client wrapping @platform/contracts
│   ├── stores/                       # Ephemeral Zustand stores (ui, audioPlayer, examSession)
│   └── ui/                           # Design-system primitives (Radix + Tailwind tokens)
```

---

## 2. Routing, Shell Composition & Auth Guards

1. **Route Groups Instead of Layout Checks**:
   - Replacing Parroto's per-page wrapper branching with Next.js App Router Route Groups guarantees zero layout flash: `(marketing)` renders TopBar + Footer, `(workspace)` renders Sidebar + Compact TopBar (`Search dictionary`, `Translation language`, Theme, Locale), and `(immersive)` renders edge-to-edge media chrome.
2. **Hybrid Rendering Strategy**:
   - **Public Catalogs (`/`, `/topics`, `/grammar`, `/stories`, `/exams/ielts`, `/exams/toeic`, `/pricing`)**: Server Components with ISR (`revalidate: 300`) for fast TTFB and SEO JSON-LD, hydrated with client interactivity.
   - **Dynamic Interactive Workspaces (`/lessons/...`, `/exams/.../session/[id]`, `/review`)**: Server Component fetches public/session metadata or triggers redirect/login gate cleanly; heavy media/ONNX/chart modules load on demand via `next/dynamic(..., { ssr: false })`.
3. **Declarative Access Boundaries (Client + Server Parity)**:
   - Next.js `middleware.ts` inspects HTTP-only session presence for hard-protected routes (`/profile`, `/affiliate`, `/exams/*/session/*`, `/my-vocabulary`, `/my-notes`), redirecting with `?next=...` or triggering the inline Login Gate on soft-gated workspaces (`/review`, `/vocab-battle`, `/speaking`).
   - All `PRO` paywalls and user entitlements are enforced on NestJS API responses **first** (`403 ENTITLEMENT_REQUIRED`), with client `useEntitlement()` controlling Pro badges and `"Unlock Pro"` modals.

---

## 3. State Management & Data Fetching Architecture

| State Category | Tooling | Ownership & Rules |
| :--- | :--- | :--- |
| **Server Cache & Pagination** | **TanStack Query v5** | Manages catalogs, exam comments (`limit=20`), session summaries, SRS due queues, and optimistic comment/bookmark mutations with query-key factories matching `@platform/contracts`. |
| **Ephemeral Lesson / Exam Player State** | **Zustand** (scoped provider per workspace) | Holds `activeSegmentIndex`, `isPlaying`, `playbackRate`, `autoStop`, local draft answers (`answersMap`), and offline answer retry queues without polluting global React trees. |
| **Audio Capture & Recognition** | **Web Worker + Service Class** | Keeps `onnxruntime-web` WASM/WebGPU inference and PCM resampling off the main React thread so typing (`Dictation`) and word chips (`Shadowing`) remain responsive at 60 FPS. |
| **Cross-Cutting Modals** | **Zustand Global UI Store** | `openLoginModal(reason)`, `openPaywallModal(feature)`, `openDictionaryModal(initialWord)` — usable from any feature hook without prop drilling. |

---

## 4. Typed API Client & Security Hygiene

- **HTTP Client (`shared/api/client.ts`)**:
  - Uses native `fetch` with `credentials: "include"` (HTTP-only refresh token cookie) + in-memory `accessToken` attached on requests; never stores long-lived JWTs in `localStorage` or unencrypted cookies.
  - Automatic `401` single-flight token refresh lock (`refreshPromise`) hitting `POST /api/v1/auth/refresh`; on failure, clears memory token and emits an explicit `auth:expired` state transition.
  - Validates critical responses against shared Zod schemas in development/test builds and handles structured RFC 7807 / domain error codes (`ACCOUNT_BANNED`, `USERNAME_REQUIRED`, `AGE_VERIFICATION_REQUIRED`, `ENTITLEMENT_REQUIRED`, `RATE_LIMITED`).
- **Internationalization (`next-intl`)**:
  - Supports multi-locale URL routing (`/en/...`, `/vi/...`, expandable to all target locales) plus separate learner `targetTranslationLocale` preference stored per user (`user_preferences`) and guest cookie.
