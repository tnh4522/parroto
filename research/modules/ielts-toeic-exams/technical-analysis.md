# IELTS & TOEIC Exams — Technical Analysis

**Feature**: IELTS & TOEIC Practice Exams (`https://parroto.app/exams/ielts` & `/exams/toeic`)

---

## 1. Page Chunks & Shared Module Architecture

| Route | Next.js Render Mode | Page Chunk | Shared Feature Chunks Imported |
| :--- | :--- | :--- | :--- |
| `/exams/ielts` | `__N_SSG` (`_next/data/.../en/exams/ielts.json`) | `pages/exams/ielts-8c78eb4d13213b8d.js` | `5554` (API client), `8184` (`ExamsLanding`, `ExamSeoContent`), `7696` |
| `/exams/toeic` | `__N_SSG` (`_next/data/.../en/exams/toeic.json`) | `pages/exams/toeic-5c4c5af36cc054b4.js` | `5554`, `8184`, `7696` |
| `/exams/ielts/sets/[setSlug]` | `__N_SSP` (`getServerSideProps` runtime) | `pages/exams/ielts/sets/%5BsetSlug%5D-d2840b00d471072f.js` | `2323-487ef62d1fd678e4.js` (`ExamSetDetail`, `ExamCard`, `42` SWR hooks) |
| `/exams/toeic/sets/[setSlug]` | `__N_SSP` (`getServerSideProps` runtime) | `pages/exams/toeic/sets/%5BsetSlug%5D-f3b735a9126d865c.js` | `2323-487ef62d1fd678e4.js` |
| `/exams/ielts/[slug]` | `__N_SSP` | `pages/exams/ielts/%5Bslug%5D-8041903b66f8f501.js` | `4242-df5a1bae87681b65.js` (hooks + icons), `9444-138c98935ace4...js` (`ExamOverviewContent`, `IeltsExamOverview`, `ExamComments`) |
| `/exams/toeic/[slug]` | `__N_SSP` | `pages/exams/toeic/%5Bslug%5D-fe8283850b3d4af9.js` | `4242`, `9444` (`ExamOverviewContent`, `ExamOverviewComponent`, `ExamComments`) |
| `/exams/ielts/analytics` | `__N_SSG` (`noIndex: true`) | `pages/exams/ielts/analytics-c339812a36582ce4.js` | `5554`, `1855` (`ExamAnalyticsView`), lazy chunks `4132` & `3272` (`ScoreTrendChart`) |
| `/exams/ielts/history` | `__N_SSG` (`noIndex: true`) | `pages/exams/ielts/history-18a48321520a0118.js` | `5702` (`ExamHistoryView`, `SessionCard`, `38569` question/band helpers) |

---

## 2. Core Client Libraries & Logic Observed

1. **Routing Base-Path Polymorphism (`useExamBasePath`, `49737`)**:
   - Inspects `useRouter().pathname`: returns `"/exams/ielts"`, `"/exams/toeic"`, or fallback `"/exams"`. Allows `ExamSetDetail`, `ExamOverviewContent`, `ExamHistoryView`, and `ExamAnalyticsView` to share identical code across both IELTS and TOEIC routes.
2. **SWR Data & Cache Layer (`80730`, duplicated across `4242`, `5702`)**:
   - `useExamSets(type, enabled, initialData)` (`dedupingInterval: 10000`, `revalidateOnFocus: false`)
   - `useExamOverview(slug)`
   - `useExamSession(sessionId)` (`revalidateOnFocus: true` for active timer/session sync)
   - `useExamResult(sessionId)`
   - `useExamHistory(params)` & `useExamAnalytics(examTypeCode)` — **strictly conditional on `isAuthenticated`** (passes `null` SWR key when guest).
   - `useExamComments(examId, page)`
3. **Client-Side Cryptography & Request Interceptors (`pages/_app-7c4028110a8b19a9.js @586897–588700`)**:
   - `Axios` (`baseURL: "https://api.parroto.app/api"`, `timeout: 30000`) automatically sets `X-User-Timezone`.
   - Exam listing (`/exams/published/sets`) and overview (`/exams/published/{slug}`) responses return `{"encrypted": true, "data": "<ciphertext>"}`. The response interceptor decrypts `data` transparently in memory via `u.ow(data, await d.tB())`.
   - `401` interceptor queues requests during Firebase `currentUser.getIdToken(true)` refresh; `403` handles `ACCOUNT_BANNED` and `USERNAME_REQUIRED` events.
4. **TOEIC Part Question & Time Estimation (`9444`, module `69444`)**:
   - Hardcoded lookup tables inside `ExamOverviewComponent`:
     - Estimated minutes per part `Z`: `{1: 3, 2: 10, 3: 18, 4: 15, 5: 20, 6: 12, 7: 42}` (sum = `120` min)
     - Question counts per part `C`: `{1: 6, 2: 25, 3: 39, 4: 30, 5: 30, 6: 16, 7: 54}` (sum = `200` questions)
5. **Question Completion & Band Helpers (`5702`, module `38569`)**:
   - `formatBand(e)` normalizes numeric IELTS bands (`8` -> `"8.0"`, `8.5` -> `"8.5"`, `null` -> `"-"`).
   - `buildCompletionHtml(html, questions, group)` parses inline markers `[[N]]`, `{{N}}`, `(N)` (or fallback underscores `_{2,}`, ellipses `\.{4,}` / `…+`) into `<input type="text" data-qn="..." class="ielts-gap" data-maxwords="...">` or `<select class="ielts-gap ielts-gap-select">` dropdowns using `resolveQuestionOptions(question, group)`.
   - `normalizeSession` (`5554 -> 18997`) indexes `answers[]` by `question_number` for O(1) lookup inside active test sessions.

---

## 3. Media, Audio & Asset Dependencies

| Asset / Media Type | Source Origin | Observed Runtime Usage on Public Exam Pages | Unobserved / Session-Only Behavior |
| :--- | :--- | :--- | :--- |
| **Audio Tracks (Listening MP3/stream)** | Not observed on public overview pages | **Zero `<audio>` elements or `.mp3`/`.wav` network requests** fired on IELTS Listening (`ev_4141...`) or TOEIC Test 3 (`ev_a327...`) overview pages. | Audio URLs are expected inside session/group data fetched via `GET /api/exams/sessions/{id}/questions` (not triggered as guest). |
| **Question Images (TOEIC Part 1 / Passages)** | Not observed on public overview pages | Zero exam-question images requested prior to starting a session. | Expected inside authenticated question groups returned by `/sessions/{id}/questions`. |
| **Deck & Lesson Thumbnails** | `https://assets.parroto.app/assets/{decks,categories}/...` (`.webp`, `.jpg`) | Loaded inside `"Keep improving"` suggestion cards on `/exams/ielts` & `/exams/toeic` (`ev_8e64...`, `ev_a402...`). | Rendered cleanly on `200 OK`. |
| **User Avatars** | `https://assets.parroto.app/assets/users/.../avatar_*.webp` and `https://lh3.googleusercontent.com/a/...` | Rendered in `ExamComments` threads (`ev_4141...`). | Google-hosted avatars vary across JPEG/PNG. |
| **Set Banner Images** | Optional `examSet.thumbnail` + fallback CSS gradients | Observed Parroto 2026/2025 & TOEIC sets have empty/null thumbnails on grid, rendering Tailwind gradients (`pickSetGradient`: blue/violet/etc.) + icon watermark (`setBannerIcon`). | `thumbnail` `<img>` rendered if populated. |
| **Lottie Animations** | Bundled JSON + dynamic Lottie player chunk (`69260`) | `FullPageLoading` & `ExamEmptyState` (`ev_69f7...`, `ev_9702...`). | Loaded dynamically with `ssr: false`. |

---

## 4. Error Handling & Edge Cases Observed

1. **Silent Client-Side Interception on Auth Failure**: Clicking `"Start Exam"` or submitting a comment while unauthenticated suppresses API requests and opens `"Welcome Back"` login modal (`ev_4141...`).
2. **Pro Tier Gating**: Attempting to open/start an exam with `is_free === false` while `!isPremium` suppresses navigation/session start and calls `openPremiumRequiredModal()` (`2323`, `9444`).
3. **Graceful Null Fallbacks in `18997` (`5554`)**: All exam GET wrappers wrap `try/catch` and return `[]`, `null`, or `false`, triggering `ExamEmptyState` (`"errors.examNotFound"` / `"errors.examSetNotFound"`) rather than throwing unhandled exceptions.
4. **Encrypted Decryption Fallback (`_app`)**: If client decryption of `data.encrypted` fails, `_app` logs `"Failed to decrypt response:"` and returns raw envelope (which fails null checks cleanly as empty/not-found).
5. **History/Analytics Unauthenticated Safety**: Passing `null` to SWR prevents spurious `401` calls and renders friendly empty illustrations (`ev_69f7...`, `ev_9702...`).
6. **TOEIC Partial Practice Mode Edge Case**: If a user selects `"Practice Mode"` and leaves **all 7 part checkboxes unchecked** (`Y.length === 0`), UI falls back to `"All 7 parts — 200 questions — 120 minutes"` and calls `onStart("practice")` with `parts: undefined` (`9444`).
