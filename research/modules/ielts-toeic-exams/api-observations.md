# IELTS & TOEIC Exams — API Observations

**Feature**: IELTS & TOEIC Practice Exams (`https://parroto.app/exams/ielts` & `/exams/toeic`)  
**Capture Policy**: Unauthenticated guest browser scenarios (`request_body: false`, `response_body: true`, `header_values: false`). Zero tokens, cookies, or authorization header values stored or replayed.  
**Initiator Limitation**: Playwright `capture_browser_scenario` exposes `resource_type` and step sequence, not CDP call stacks; static JS initiator locations are cross-referenced from loaded webpack chunks (`5554`, `8184`, `2323`, `4242`, `9444`).

---

## 1. Runtime-Observed API & Data Requests (Exam Module)

| Method & Status | Origin & Redacted Path | Resource Category | Content Type & Size | Static JS Initiator Location | Triggering Action | Evidence Reference | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET 200` | `https://parroto.app/_next/data/{buildId}/en/exams/ielts.json` | `fetch` | `application/json` (`46,620` B) | Next.js Router `x-nextjs-data` / SSG hydration | Load `/exams/ielts` or prefetch | `ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c`, `ev_8e64...` | Static guest catalog only (`initialExamSets[]`). |
| `GET 200` | `https://parroto.app/_next/data/{buildId}/en/exams/toeic.json` | `fetch` | `application/json` (`47,212` B) | Next.js Router `x-nextjs-data` / SSG hydration | Load `/exams/toeic` or prefetch | `ev_d706...`, `ev_a402...` | Static guest catalog only (`initialExamSets[]`). |
| `GET 200` | `https://api.parroto.app/api/exams/published/sets?exam_type_code={IELTS\|TOEIC}` | `xhr` | `application/json; charset=utf-8` (`17,992` B TOEIC) | `5554-67f09283b16fe43c.js @1902` (`getPublishedSets`) | Hydrate `/exams/ielts` or `/exams/toeic` (`scenario_start`) | `ev_8e64fd1dacd27fadb326d85e2e68dbf78dc4cfdfa905c34580a6dff913125dd0`, `ev_a40238fa0c4f32566481589c36d60d03f19c60204f730dc960bb7bc6c70a6ae5` | Encrypted wire envelope (`{"encrypted":"boolean","data":"string"}`); IELTS body uncaptured in `ev_8e64...`. |
| `GET 200` | `https://api.parroto.app/api/exams/published/sets` | `xhr` | `application/json; charset=utf-8` (`37,988` B) | `5554` (`getPublishedSets()` with no `exam_type_code` filter) via `4242`/`2323` `useExamSets` | Load `/exams/ielts/sets/{setSlug}` or `/exams/toeic/sets/{setSlug}` | `ev_6c50e7a91dd3aed69b70e500546a1af753ae65832edf7ac9293e59e14b9fe1a5`, step `538` | Encrypted wire envelope (`{"encrypted":"boolean","data":"string"}`); fetches all sets across exam types when opened on set detail page. |
| `GET 200` | `https://api.parroto.app/api/vocabulary/enc/public?page=1&limit=12&search={ielts\|toeic}` | `xhr` | `application/json; charset=utf-8` (`31,476` B) | `5554-67f09283b16fe43c.js` (`module 85149 -> getDecks`) | Hydrate `"Keep improving"` decks on `/exams/ielts` & `/exams/toeic` | `ev_8e64...`, `ev_a402...` | Encrypted wire envelope (`{"encrypted":"boolean","data":"string"}`). |
| `GET 200` | `https://api.parroto.app/api/lessons?limit=4&sort_by=order&topic_slug={ielts-listening\|toeic-listening}&page=1` | `xhr` | Not retained (`body` undefined in step exit) | `pages/_app-7c4028110a8b19a9.js @297979` (`generateKey: true`) | Hydrate `"Keep improving"` listening strip on `/exams/ielts` & `/exams/toeic` | `ev_8e64...`, `ev_a402...` | Response body not retained at step end. |
| `GET 200` | `https://api.parroto.app/api/exams/published/{examSlug}` *(IELTS Reading, IELTS Listening, TOEIC Test 3)* | `xhr` | `application/json; charset=utf-8` (`1,068` B / `1,080` B / `2,408` B) | `5554-67f09283b16fe43c.js @2058` (`getExamOverview`) | Load `/exams/{ielts\|toeic}/{slug}` | `ev_332e7c82...`, `ev_4141d4b7...`, `ev_a32785d2...` | Encrypted wire envelope (`{"encrypted":"boolean","data":"string"}`). |
| `GET 200` | `https://api.parroto.app/api/exams/{examId}/comments?page=1&limit=20` | `xhr` | `application/json; charset=utf-8` (`15,296–16,550` B) | `5554-67f09283b16fe43c.js @4711` (`getExamComments`) | Load exam overview page comments thread | `ev_332e7c82...`, `ev_4141d4b7...`, `ev_a32785d2...`, `ev_b14d2af0...` | Plain JSON shape captured; pagination `page > 1` UI verified statically (`useExamComments`). |
| `GET 200` | `https://api.parroto.app/api/promo/active` | `xhr` | `application/json; charset=utf-8` (`487` B) | `pages/_app-7c4028110a8b19a9.js @302500` | App layout mount on every exam route | `ev_8e64...`, `ev_69f7...`, `ev_9702...` | Shared global promo banner feed. |

---

## 2. Observed Response Schemas (Value-Free)

### 2.1 `GET /_next/data/{buildId}/en/exams/{ielts,toeic}.json` (`ev_d706...`, `ev_8e64...`, `ev_a402...`)
```json
{
  "pageProps": {
    "initialExamSets": [
      {
        "_id": "string",
        "exam_type_id": {
          "_id": "string",
          "code": "string",
          "name": {"en": "object", "vi": "object"}
        },
        "name": {"en": "string", "vi": "string"},
        "slug": "string",
        "source": "string",
        "year": "number",
        "total_exams": "number",
        "order": "number",
        "is_active": "boolean",
        "deleted_at": "null",
        "description": {}
      }
    ],
    "_nextI18Next": "{initialI18nStore,initialLocale,userConfig}"
  },
  "__N_SSG": "boolean"
}
```

### 2.2 Encrypted Exam & Suggestion Envelopes (`ev_a402...`, `ev_4141...`, `ev_a327...`)
Returned by `GET /api/exams/published/sets`, `GET /api/exams/published/{examSlug}`, and `GET /api/vocabulary/enc/public`:
```json
{
  "encrypted": "boolean",
  "data": "string"
}
```

### 2.3 `GET /api/exams/{examId}/comments?page=1&limit=20` (`ev_4141...`, `ev_a327...`, `ev_332e...`)
```json
{
  "status": "string",
  "message": "string",
  "data": {
    "comments": [
      {
        "_id": "string",
        "exam_id": "string",
        "author_id": "string",
        "content": "string",
        "parent_comment_id": "null",
        "child_count": "number",
        "is_system": "boolean",
        "session_id": "string",
        "deleted_at": "null",
        "created_at": "number",
        "updated_at": "number",
        "last_activity_at": "number",
        "author": {
          "uid": "string",
          "username": "string|null",
          "displayName": "string",
          "photoURL": "string",
          "selected_avatar_frame": "null",
          "selected_background": "null",
          "selected_badge": "null",
          "level": "number",
          "premium": {
            "status": "object",
            "is_lifetime": "object",
            "expires_at": "object",
            "activated_at": "object",
            "price_id": "object",
            "total_months": "object"
          },
          "role": "null"
        },
        "replies": ["array(empty)"]
      }
    ],
    "total": "number",
    "page": "number",
    "limit": "number",
    "totalPages": "number"
  }
}
```

---

## 3. Authenticated Endpoints Observed Statically Only (`5554 -> 18997`)

Not executed at runtime (auth-gated); documented strictly as **static candidates**:
- **Session Lifecycle**: `POST /exams/sessions/start` (body `{exam_id, mode, parts?}`), `GET /exams/sessions/{id}`, `POST /exams/sessions/{id}/abandon`, `POST /exams/sessions/{id}/submit`, `GET /exams/sessions/{id}/result`
- **Questions & Answer Persistence**: `GET /exams/sessions/{id}/questions?part={part}` (or omitted for IELTS), `PUT /exams/sessions/{id}/answer`, `PUT /exams/sessions/{id}/answers`, `PUT /exams/sessions/{id}/flag` (`{question_number}`), `GET /exams/sessions/{id}/check/{questionNumber}`
- **Analytics & History**: `GET /exams/sessions/history?page=&limit=&exam_type_code=`, `GET /exams/sessions/analytics?exam_type_code=`
- **Comment Mutations**: `POST /exams/{examId}/comments`, `GET /exams/comments/replies/{commentId}`, `DELETE /exams/comments/{commentId}`
- **Catalog Filter**: `GET /exams/published?exam_set_id={setId}` (`pages/_app @404262`)
