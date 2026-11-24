# IELTS & TOEIC Exams — Data Model Requirements

**Feature**: IELTS & TOEIC Practice Exams  
**Methodology**: Part A reflects domain entities verified in captured runtime payloads and client TypeScript-transpiled bundles (`5554`, `8184`, `2323`, `9444`, `1855`, `5702`). Part B specifies an **independent data model** for uncaptured authenticated session/grading internals without claiming identity with Parroto's backend database.

---

## Part A. Client-Observed Public & Session Read Entities

1. **`ExamType`** (`exam_type_id` on sets & exams):
   - `_id: string`, `code: "IELTS" | "TOEIC"`, `name: LocalizedString ({en, vi})`
   - `parts: Array<{ part_number: number, section: "listening" | "reading", name: string, question_count: number }>` (observed in `9444` TOEIC overview)
2. **`ExamSet`** (SSG `initialExamSets` & `2323 -> ExamSetDetail`):
   - `_id: string`, `slug: string`, `exam_type_id: ExamType | string`, `name: LocalizedString`, `description?: LocalizedString`
   - `source: string` (`"parroto"`, `"TOEIC"`, etc.), `year: number`, `thumbnail?: string`, `total_exams: number`, `order: number`, `is_active: boolean`, `deleted_at: null | string`
   - `exams?: ExamSummary[]` (hydrated inside set detail response)
3. **`ExamSummary / ExamOverview`** (`2323 -> ExamCard`, `9444 -> IeltsExamOverview` / `ExamOverviewComponent`):
   - `_id: string`, `slug: string`, `title: LocalizedString`, `description?: LocalizedString`, `is_free: boolean`, `order: number`
   - `section?: "listening" | "reading"` *(IELTS skill tag)*
   - `total_questions: number` (`40` IELTS, `200` TOEIC), `total_duration_seconds: number` (`2400` / `3600` / `7200`), `attempt_count: number`
4. **`ExamComment`** (`ev_4141...`, `ev_a327...`):
   - `_id`, `exam_id`, `author_id`, `content`, `parent_comment_id`, `child_count`, `is_system: boolean`, `session_id`, `created_at`, `updated_at`, `last_activity_at`, `deleted_at`
   - Embedded `author` (`uid`, `username`, `displayName`, `photoURL`, `level`, `premium`, cosmetics) & `replies[]`
5. **`ExamSessionSummary` & `ExamAnalytics`** (`5702 -> SessionCard`, `1855 -> ExamAnalyticsView`):
   - Session: `_id`, `exam_id` (populated title), `mode: "test" | "practice"`, `practice_parts?: number[]`, `status: "in_progress" | "completed" | "abandoned"`, `started_at`, `completed_at?`, `time_spent_seconds`
   - Result summary: `total_correct`, `total_questions`, `band_score?` (IELTS `0.0–9.0`), `total_scaled?` (TOEIC `/990`)
   - Analytics: `summary` (`total_exams`, `best_band|best_score`, `avg_band|avg_score`, `latest_band|latest_score`, `band_trend[]` / `score_trend[]`), `topWeakAreas[]` (`{area, count}`)
6. **Question Group / Completion Reference (`5554`, `5702 -> 38569`)**:
   - `groups[]` & `questions[]` joined via `group_id === group._id` and sorted by `order`
   - Question fields observed in `38569`: `question_number`, `answer_format` (`"single" | "text" | ...`), `choices[]` vs `group.options[]` (`{label, text}`), `max_words?`, completion HTML markers (`[[N]]`, `{{N}}`, `(N)`, `____`, `....`).

---

## Part B. Independent Implementation Data Model (Test Runner & Scoring Spec)

Because the backend grading engine, question bank storage, and active session internals are inaccessible without authentication:

1. **Normalized Question & Stimulus Media Tables**:
   - `exam_parts` (`id`, `exam_id`, `part_number`, `skill` [`listening`\|`reading`], `title`, `instructions_html`, `audio_asset_url?`, `audio_duration_sec?`)
   - `question_groups` (`id`, `part_id`, `order_index`, `stimulus_html?`, `stimulus_image_urls[]`, `audio_start_sec?`, `audio_end_sec?`, `shared_options?`)
   - `questions` (`id`, `group_id`, `question_number`, `order_index`, `answer_format` [`single_choice`\|`multi_choice`\|`gap_fill_text`\|`gap_fill_select`\|`matching`], `prompt_html`, `choices_json`, `max_words?`, `skill_tag` [for `topWeakAreas`], `correct_answer_canonical`, `explanation_html`)
2. **Session & Persistence Model (Independent Clock & Auto-Save)**:
   - `exam_sessions` (`id`, `user_id`, `exam_id`, `mode` [`test`\|`practice`], `selected_parts[]`, `status` [`in_progress`\|`completed`\|`abandoned`], `started_at`, `last_active_at`, `deadline_at`, `elapsed_active_seconds`)
   - `session_answers` (`session_id`, `question_number`, `selected_value`, `is_flagged`, `is_checked_in_practice`, `is_correct_cached?`, `updated_at`) — indexed on `(session_id, question_number)` unique constraint so rapid debounced `PUT` calls remain idempotent.
3. **Deterministic Scoring Tables**:
   - **IELTS Conversion**: Official raw-to-band lookup (`0–40` -> `1.0–9.0` in `0.5` increments), case-insensitive & trimmed multi-variant matching (`"24 / twenty-four"`) for `gap_fill_text` with `max_words` validation.
   - **TOEIC Conversion**: Separate Listening (`0–100` raw -> `5–495` scaled) and Reading (`0–100` raw -> `5–495` scaled) lookup curves summed to `total_scaled` (`10–990`); bypassed in partial `practice` mode (raw accuracy percentage only).
