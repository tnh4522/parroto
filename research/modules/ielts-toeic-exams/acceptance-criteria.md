# IELTS & TOEIC Exams — Acceptance Criteria & Independent Build Specification

**Feature**: IELTS & TOEIC Practice Exams (`https://parroto.app/exams/ielts` & `/exams/toeic`)  
**Purpose**: Defines testable acceptance criteria covering both all observed public behaviors and an independent implementation specification for the auth-gated test-taking, grading, and analytics subsystems.

---

## 1. Public Catalog, Set Detail & Overview (Verified Parity Requirements)

1. **Dual Exam Track Indexes (`/exams/ielts`, `/exams/toeic`)**:
   - Must render SSR/SSG initial exam sets immediately without blocking spinner, displaying set source, year, test count, and aggregate attempt count.
   - Must display SEO test structure tables (IELTS 4-skill breakdown & 0–9 bands; TOEIC 7 parts totaling 200 questions & 10–990 scale) and cross-links to vocabulary decks and dictation practice.
   - Header buttons (`History`, `Analytics`) and sidebar summary widgets (`SessionHistory`, `AnalyticsSummary`) must remain hidden while `isAuthenticated === false`.
2. **Exam Set Listing (`/exams/{type}/sets/[setSlug]`)**:
   - Back link `"Exam Sets"` must return to `/exams/ielts` or `/exams/toeic` matching active base path.
   - Tests inside a set must sort `is_free` tests before Pro tests, then ascending by `order`.
   - Clicking a Pro exam while unsubscribed must open the upgrade modal; clicking an exam card while unauthenticated (or Resume if `in_progress`) must enforce auth/session rules.
3. **Exam Overview Configuration (`/exams/{type}/[slug]`)**:
   - **IELTS**: Renders skill tag (`Listening` 40 min / `Reading` 60 min) and section/passage breakdown without part checkboxes; offers `"Test Mode"` vs `"Practice Mode"`.
   - **TOEIC**: Renders 7-part table (`P1(6)`, `P2(25)`, `P3(39)`, `P4(30)`, `P5(30)`, `P6(16)`, `P7(54)`) and sticky right configurator (`"Exam Mode"` + `"Select Parts"` card with `Select all`, `Deselect`, and dynamic question/time calculation); empty selection defaults to full `200 questions — 120 minutes` test.
4. **Access Boundaries & Empty/Error States**:
   - Clicking `"Start Exam"` or submitting a comment while logged out must intercept client-side and open the Login modal (`"Welcome Back"`) without firing unauthorized mutation requests.
   - Visiting `/exams/{type}/history` or `/analytics` while logged out must avoid protected API calls and render localized empty states.
   - Unknown `[setSlug]` or `[slug]` must display `"Exam Set Not Found"` / `"Exam Not Found"`.
5. **Comments Thread**:
   - Must support paginated public reading (`page`, `limit=20`) with auto-posted score badges (`Band ...` / `Score`), timestamps, and disabled Send button when input is blank (`maxLength: 1000`).

---

## 2. Independent Session Runner, Audio & Grading Specification (Inaccessible Subsystems)

Since live `/session/[sessionId]` and `/result` routes were inaccessible as guest, an independent build must satisfy the following self-contained requirements:

1. **Test Mode vs. Practice Mode Execution**:
   - **Test Mode**: Enforces strict countdown timer (`deadline_at` persisted server-side); auto-submits unanswered/saved answers on expiration; suppresses answer feedback & explanations until final submission; supports `"Test"` audio lock (single continuous playback matching exam conditions if enabled).
   - **Practice Mode**: Loads only `selected_parts[]` (or all parts if empty); enables on-demand `"Check Answer"` per question (`GET .../check/{qn}` or immediate feedback reveal) with explanations and unrestricted audio seeking/replay for Listening parts.
2. **Listening Audio Synchronization & Controls**:
   - Preload part MP3/AAC streams only when entering `/session/[sessionId]` (never on overview pages).
   - Provide buffered seek bar, pause/resume (in Practice Mode), playback speed (`0.8x–1.5x` in Practice Mode; `1.0x` locked in Test Mode), and network stall retry indicator.
3. **Interactive Question Renderers**:
   - Render TOEIC Part 1 single/multi-photo layouts (`aspect-ratio` responsive containers), Parts 3–4 multi-question audio groups, Parts 6–7 split-pane passage + question scroller, and IELTS completion HTML blocks (`[[N]]` inline text inputs with optional `max_words` enforcement & dropdown selects).
   - Persist answers automatically on selection/blur (`PUT .../answer` / `PUT .../answers`) and support offline/retry queueing so page reload or pause/resume preserves all answers and `flagged` markers.
4. **Submission, Scoring & Post-Test Review**:
   - Confirm modal before early `"Submit Exam"` displaying answered vs. unanswered/flagged counts.
   - Compute deterministic raw + scaled scores (`1.0–9.0` IELTS; `10–990` TOEIC full tests; accuracy % for partial Practice sessions), per-part breakdown, and skill-tag weak-area tallies.
   - `/session/[sessionId]/result` displays full passage/audio transcript + user answer vs. correct answer + explanation per question, optionally posting a shareable system score comment.
5. **Analytics & History**:
   - Aggregate completed sessions per exam type (`total_exams`, `best`, `avg`, `latest`, chronological `trend[]`, top 5 `weakAreas`) and allow filtering, resuming (`in_progress`), or abandoning incomplete sessions.
