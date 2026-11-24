# IELTS & TOEIC Exams — User Flow Specification

**Feature**: IELTS & TOEIC Practice Exams (`/exams/ielts`, `/exams/toeic`)  
**Target**: `https://parroto.app/`  
**Observation Mode**: Unauthenticated public guest observation via `capture_browser_scenario` and static inspection of loaded webpack chunks. Authenticated session runner (`/session/[sessionId]`) and result (`/session/[sessionId]/result`) routes were not entered directly due to non-bypass and guest-only rules; their flow behavior is documented strictly as observed/bounded in client UI code and clearly separated from verified runtime execution.

---

## 1. Entry Points (Observed)

1. **Primary Sidebar Navigation (`complementary` landmark)** (`ev_8e64...`, `ev_a402...`):
   - `"TOEIC Exams"` link -> `/exams/toeic`
   - `"IELTS Exams"` link -> `/exams/ielts`
2. **Mobile Hamburger Drawer (`390x844`, `ev_eb95cb6b9af61e4e9ab727aa93d53bca2a28f1a5a4885a37c4ba464af9d0a050`)**:
   - Mobile banner contains `"Open menu"` button, Parroto logo (`/`), and `"Search dictionary"` button above `"TOEIC Practice Tests"` / `"IELTS Practice Tests"`.
3. **Cross-Links (`ExamSeoContent` -> `RelatedLinks`)**:
   - Bidirectional cross-link between IELTS and TOEIC index pages, plus links to `/vocabulary/{ielts-600|toeic-600}`, `/dictation`, and (on IELTS) `/shadowing`.
4. **Direct / Deep Links**:
   - Exam Set Detail: `/exams/{ielts|toeic}/sets/[setSlug]` (e.g., `/exams/ielts/sets/parroto-ielts-2026`, `/exams/toeic/sets/parroto-toeic-vol-1`)
   - Exam Overview: `/exams/{ielts|toeic}/[slug]` (e.g., `/exams/ielts/parroto-ielts-2026-reading-test-1`, `/exams/ielts/parroto-ielts-2026-listening-test-1`, `/exams/toeic/parroto-toeic-vol-1-test-3`)
   - User History & Analytics: `/exams/{ielts|toeic}/history` (shared `/exams/history`), `/exams/{ielts|toeic}/analytics` (shared `/exams/analytics`)

---

## 2. End-to-End Runtime User Journeys

### Flow A: Discovery & Catalog Selection (`/exams/ielts` & `/exams/toeic`)
1. User clicks `"IELTS Exams"` or `"TOEIC Exams"` in the sidebar.
2. Page renders `<h1>` (`"IELTS Practice Tests"` / `"TOEIC Practice Tests"`), an introductory paragraph, and Exam Set cards hydrated from SSG (`initialExamSets`) + refreshed via `GET /api/exams/published/sets`:
   - IELTS (`ev_8e64...`): `"Parroto IELTS 2026"` (`20 tests`, `41856 attempts`), `"Parroto IELTS 2025"` (`20 tests`, `7499 attempts`).
   - TOEIC (`ev_a402...`): `"Parroto TOEIC Practice Vol. 1"` (`10 tests`, `111702 attempts`), `"TOEIC 2026"` (`10 tests`, `253842 attempts`), `"TOEIC 2024"` (`10 tests`, `36836 attempts`), `"TOEIC 2023"` (`10 tests`, `20042 attempts` seen in SSG `toeic.json`).
3. If authenticated (`isAuthenticated === true` in `ExamsLanding`), two quick-action header buttons (`History`, `Analytics`) plus sidebar/embedded `SessionHistory` & `AnalyticsSummary` panels render; as guest (`ev_8e64...`, `ev_a402...`), these panels are hidden.
4. Below the set grid, `"Keep improving"` cross-module suggestions render 4 vocabulary decks (`GET /api/vocabulary/enc/public`) and 4 listening dictation lessons (`GET /api/lessons?limit=4...`), followed by structured SEO tables (`Test structure`, `Scoring`, `Tips`, `FAQ`, `RelatedLinks`).
5. Clicking any Exam Set card navigates to `/exams/{ielts|toeic}/sets/{setSlug}`.

### Flow B: Exam Set Listing (`/exams/{ielts|toeic}/sets/[setSlug]`)
1. Back-pill `"Exam Sets"` navigates back to `/exams/{ielts|toeic}`.
2. Hero banner displays `source` + `year` badges, set title `<h1>`, total test count, and aggregated attempt count.
3. `"Exam List"` grid renders individual test cards sorted free-first then by `order` (`2323-487ef62d1fd678e4.js`):
   - In both `parroto-ielts-2026` (`ev_6c50...`, 20 tests alternating Reading/Listening) and `parroto-toeic-vol-1` (`ev_...` step `538`, 10 full tests), every observed test card displayed `"Free"`, question count (`40` IELTS / `200` TOEIC), attempt count, duration (`60 minutes` Reading / `40 minutes` Listening / `120 minutes` TOEIC), and `"View Details"`.
4. **Access Gate Check on Card Click (`ExamCard`)**:
   - If session is `in_progress`, clicking goes straight to `"Resume Exam"` (`/exams/.../session/{id}`).
   - If guest (`!isAuthenticated`), clicking `"View Details"` prevents navigation and triggers `openLoginModal()` (verified statically in `2323`; direct URL navigation to `/exams/{type}/{slug}` remains publicly readable!).
   - If `!exam.is_free && !isPremium`, card shows `"Unlock"` (`PRO`) button and calls `openPremiumRequiredModal()`.

### Flow C: Exam Overview & Mode/Part Configuration (`/exams/{ielts|toeic}/[slug]`)
1. Page fetches `GET /api/exams/published/{slug}` (encrypted response envelope) and `GET /api/exams/{examId}/comments?page=1&limit=20`.
2. **IELTS Overview (`IeltsExamOverview`, verified on `parroto-ielts-2026-reading-test-1` `ev_3553...` & `listening-test-1` `ev_4141...`)**:
   - Displays title `<h1>`, skill badge (`Reading` or `Listening`), metadata (`40 questions`, attempt count, `60`/`40 minutes`), and `"Test structure"` card listing `3` passages (`Passage 1..3`) or `4` listening sections (`Section 1..4 — 10 questions`).
   - Mode selector toggles between `"Test Mode"` (default) and `"Practice Mode"`. No `"Select Parts"` card is rendered for IELTS.
3. **TOEIC Overview (`ExamOverviewComponent`, verified on `parroto-toeic-vol-1-test-3` `ev_a327...`)**:
   - Left column displays 7-part breakdown table (Listening Parts 1–4: `6, 25, 39, 30`; Reading Parts 5–7: `30, 16, 54`).
   - Right sticky column displays `"Exam Mode"` (`Test Mode` vs `Practice Mode`), `"Select Parts"` card (`Select all`, `Deselect`, 7 checkboxes with live question & minute estimator), auto-submit/pause notes, and `"Start Exam"` button.
4. **Guest `"Start Exam"` Outcome (Verified Runtime `ev_4141...`)**:
   - Clicking `"Start Exam"` on `parroto-ielts-2026-listening-test-1` triggered client auth guard (`!isAuthenticated -> openLoginModal()`), displaying the `"Welcome Back"` dialog (`Continue with Google`, `Continue with Apple`, `Enter your email`, `Continue with Email`) without sending any `POST /api/exams/sessions/start` request.
5. **Comments Interaction (Observed UI + Static Handler)**:
   - Public users can browse paginated `Comments ({total})` (`←`, `{page} / {totalPages}`, `→`), including auto-posted system score comments (`Band 9 (reading: 40/40)`, `Band 8.5 (listening: 37/40)`, etc.).
   - Typing in `"Write a comment..."` enables the send button (`button` becomes enabled when trimmed text is non-empty); submitting while unauthenticated triggers `openLoginModal()`.

### Flow D: History & Analytics (`/exams/{ielts|toeic}/history` & `/analytics`)
- **Guest Visit Observed (`ev_69f7...`, `ev_9702...`)**: `useExamHistory` and `useExamAnalytics` skip API fetches when `isAuthenticated === false` (`80730` SWR key returns `null`), rendering empty states (`"You haven't taken any exams yet"` on `/history`, `"Take some exams to see your analytics"` on `/analytics`) with `"Exam Sets"` back link.

### Flow E: Authenticated Session Runner & Result (Inaccessible Limitation)
- **Not Observed at Runtime**: `/exams/{ielts,toeic}/session/[sessionId]` and `/session/[sessionId]/result` require an authenticated session created via `POST /api/exams/sessions/start`.
- **Client-Code Documented Contract (`5554` + `5702`)**: Authenticated users launch `startSession` -> route to `/session/{id}` -> load `getSession` + `getSessionQuestions` / `getIeltsQuestions` -> save answers (`PUT .../answer`, `PUT .../answers`), toggle flags (`PUT .../flag`), optionally check answer (`GET .../check/{qn}` in Practice Mode), pause/abandon (`POST .../abandon`), submit (`POST .../submit`), and view `/session/{id}/result` (`GET .../result`). An independent replacement specification is provided in [acceptance-criteria.md](file:///d:/parroto/research/modules/ielts-toeic-exams/acceptance-criteria.md) and [data-model-requirements.md](file:///d:/parroto/research/modules/ielts-toeic-exams/data-model-requirements.md).
