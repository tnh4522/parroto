# IELTS & TOEIC Exams — UI & Interactive State Specification

**Feature**: IELTS & TOEIC Practice Exams  
**Target**: `https://parroto.app/exams/ielts` & `https://parroto.app/exams/toeic`  
**Evidence Sources**: Accessibility snapshots (`ev_8e64...`, `ev_a402...`, `ev_3553...`, `ev_6c50...`, `ev_4141...`, `ev_a327...`, `ev_9702...`, `ev_69f7...`, mobile `ev_eb95...`) and webpack UI modules (`8184`, `2323`, `9444`, `1855`, `5702`).

---

## 1. Layout & Page Hierarchy

### 1.1 Landing Page (`ExamsLanding`, `/exams/ielts` & `/exams/toeic`)
- **Desktop (`1280x720`)**:
  - Persistent left sidebar (`complementary`), main content column (`sm+:container sm+:py-6 py-4 px-4`).
  - Header row: `<h1>` (`"IELTS Practice Tests"` / `"TOEIC Practice Tests"`) + conditional auth-only right action buttons (`History`, `Analytics`).
  - Intro paragraph explaining exam format & scoring.
  - Exam Sets grid (`ExamSetCard[]`), 3 cards/row on desktop (`sm+:grid-cols-2 lg+:grid-cols-3` or conditional two-column layout when authenticated user shows `SessionHistory` & `AnalyticsSummary` side panels).
  - `"Keep improving"` suggestion strips: 4 Vocabulary Deck cards + 4 Dictation Lesson cards with `"See all"` links.
  - `ExamSeoContent`: Scope overview -> Test Structure HTML `<table>` -> Scoring/Band interpretation `<table>` -> Test Types (IELTS only) -> Tips (4 items) -> FAQ (5 items + JSON-LD `FAQPage`) -> `RelatedLinks` (3–4 cross-module cards).
- **Mobile (`390x844`, `ev_eb95...`)**:
  - Top promo banner (`"Teachers' Day Sale..."`) + app download badges (`ios app link`, `android app link`).
  - Compact header (`banner`): `"Open menu"` drawer toggle, Parroto logo, `"Search dictionary"` icon button.
  - Single-column stacked set cards, scrollable tables (`overflow-x-auto`).

### 1.2 Exam Set Detail (`/exams/{type}/sets/[setSlug]`, `2323 -> ExamSetDetail`)
- `"Exam Sets"` pill back-link (`ArrowLeft` icon).
- Full-width rounded gradient/thumbnail Hero Banner (`relative overflow-hidden rounded-duo-lg border-2`):
  - Badges: `source` (white pill) + `year` (dark translucent pill).
  - `<h1>` set title, optional description, test-count badge (`"{n} tests"`), total-attempt badge.
- `"Exam List"` `<h2>` + responsive 1/2/3-column grid of `ExamCard` items.

### 1.3 Exam Overview (`/exams/{type}/[slug]`, `9444 -> ExamOverviewContent`)
- Back-link `"Exam Sets"`.
- Header block: `<h1>` exam title, skill/Pro badges, optional description, metadata row (Question count icon, Attempt count icon, Duration in minutes icon).
- **Two-column responsive body (`grid-cols-1 sm+:grid-cols-[1fr_1fr] gap-6`)**:
  - **Left Column**:
    - **IELTS**: Card titled `"Test structure"` with parts badge (`4 parts` Listening / `3 parts` Reading) and divided list of Section 1–4 (`"10 questions"`) or Passage 1–3 (`"Reading passage with mixed question types"`), footer summary (`40 questions`, `40`/`60 minutes`).
    - **TOEIC**: Card containing 4-column `<table>` (`Section` badge `Listening`/`Reading`, `Part`, `Type`, `Questions`) across Parts 1–7.
  - **Right Column (sticky on desktop `sm+:sticky sm+:top-20`)**:
    - `"Exam Mode"` card: 2-button toggle grid (`"Test Mode"` vs `"Practice Mode"`).
    - `"Select Parts"` card *(TOEIC component `ExamOverviewComponent` only)*:
      - `"Select all"` / `"Deselect"` quick buttons.
      - `"Listening"` checkboxes (`P1 — Photos(6)`, `P2 — Question-Response(25)`, `P3 — Conversations(39)`, `P4 — Talks(30)`).
      - `"Reading"` checkboxes (`P5 — Incomplete Sentences(30)`, `P6 — Text Completion(16)`, `P7 — Reading Comprehension(54)`).
      - Live muted summary bar: when `selectedParts.length === 0` -> `"All 7 parts — 200 questions — 120 minutes"`; when `>= 1` selected -> `"{N} parts selected • {Q} questions • ~{M} min"`.
    - Notes block (`"Exam will be auto-submitted when time runs out"`, `"You can pause and resume later"`).
    - Primary CTA button (`"Start Exam"`, `"Resume Exam"`, or `"Unlock"` Pro button).
- **Bottom Section**: `ExamComments` card (`Comments ({total})`, single-line text input `"Write a comment..."` `maxLength=1000`, Send button, comment list with user avatar, `Lv.{level}`, streak icon if present, username/displayName, `"Score {datetime}"` system tag + `"Band ..."` / score text, pagination `← {page} / {totalPages} →`).

---

## 2. Interactive States Matrix

| Component / Action | Default / Idle State | Hover / Active / Modified State | Auth / Pro / Error / Empty States |
| :--- | :--- | :--- | :--- |
| **Mode Selector** (`Test Mode` / `Practice Mode`) | `"Test Mode"` active (`border-primary bg-primary/10 text-primary`) | Clicking `"Practice Mode"` highlights it; in TOEIC, user can also mix parts independently of mode | Observed in `ev_a327...` (`Practice Mode` active alongside 7 checkboxes) |
| **TOEIC Part Checkboxes** (`Select Parts`) | All unchecked (`selectedParts = []` = full 7-part 200Q / 120m test) | Checking parts recalculates `totalQuestions` & `estimatedMinutes` via lookup tables `C` & `Z`; `"Select all"` selects `[1..7]`; `"Deselect"` clears `[]` | Unchecking all reverts summary to `"All 7 parts — 200 questions — 120 minutes"` |
| **Start CTA** | Green `"duo-success"` button `"Start Exam"` (enabled) | Shows spinner (`animate-spin`) & disables button while `startSession` POST is in flight | **Guest (`ev_4141...`)**: opens `"Welcome Back"` Login Modal; **Pro test & free user**: renders `"duo-pro"` `"Unlock"` button opening Premium Modal; **`in_progress` session**: renders `"Resume Exam"` |
| **Comment Input & Submit** | `"Write a comment..."` empty; Send button `[disabled]` | Non-empty text enables Send button; `Enter` key or click submits | **Guest click**: opens Login Modal (`9444 -> ExamComments`); **Empty thread**: renders `"comments.empty"` |
| **Comments Pagination** | `←` disabled on page `1`; displays `1 / {totalPages}` (e.g., `1 / 234`) | Clicking `→` increments page and re-fetches paginated comments | Only shown when `totalPages > 1` |
| **History & Analytics Pages** | Authenticated shows score trend Recharts graph, 4 stat cards, weak areas, and session cards (`Resume`/`View Result`/`Abandon`) | Clicking page arrows fetches `page ± 1` (`limit=20`) | **Guest / No data (`ev_69f7...`, `ev_9702...`)**: Lottie empty illustration + `"You haven't taken any exams yet"` / `"Take some exams to see your analytics"` |
| **Exam Set / Exam Detail Loading & Missing** | Animated Parroto Lottie mascot (`FullPageLoading`, `min-h-[300px]`) | Hydrates when API finishes | Unknown slug renders `ExamEmptyState` (`"errors.examSetNotFound"` / `"errors.examNotFound"`) |
