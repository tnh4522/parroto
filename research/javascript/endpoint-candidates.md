# Parroto API Endpoint Candidates (Static & Runtime)

**Target**: `https://parroto.app/`  
**Primary API Origin**: `https://api.parroto.app/api` (configured as Axios `baseURL` with `timeout: 30000` and `fetch` keepalive beacons in `pages/_app-7c4028110a8b19a9.js`).  
**Scope Disclaimer**: All static endpoint candidates below are derived strictly from client-side JavaScript bundles; **no claims are made regarding backend implementation, server internals, or unvisited authenticated responses**.

---

## 1. Runtime-Observed API Transactions (High Confidence — Runtime Evidence)

| Method & Status | URL | Origin Context | Evidence Reference |
| :--- | :--- | :--- | :--- |
| `GET 200` | `https://api.parroto.app/api/promo/active` | Active promotion banner / pricing | `ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c` (`/topics`), `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f` (`/lessons/dictation/...`), `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371` (`/lessons/shadowing/...`) |
| `GET 200` | `https://api.parroto.app/api/lessons/68888f358aa91b55140c337d/comments?page=1&limit=10` | Lesson comments feed | `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f`, `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371` |
| `GET 200` | `https://parroto.app/_next/data/hUvNpCe7E_Hr-Ai_sSmoX/en/*.json` | Next.js SSG/SSR page data payloads | `ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c` |
| `POST 204` | `https://parroto.app/cdn-cgi/rum?` | Cloudflare Web Analytics RUM | `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f` |

---

## 2. Static API Endpoint Candidates Extracted from Exported Bundles

*Confidence: **Medium–High (Static Call-Site Literals)** from Axios/fetch calls in `ev_4635258668499ca1fe6fb26d31c8a16faeb07b8df08f0f35624f96b297335960` and `ev_cf679c41eb6197ca02b716eacdc752468a9bc323e27a53bc72f18f2fb1ff2288`. Dynamic path segments (concatenated IDs/slugs) are shown with trailing `/` or parameter hints as observed in source.*

### A. User, Auth & Notifications (`_app-7c4028110a8b19a9.js`)
- `GET /user/info`, `GET /user/info/`
- `GET /user/stats`, `GET /user/ranking-history`, `GET /user/completed-sentences/`
- `GET /user/username/check?username=`
- `PUT /user/username`, `PUT /user/birthday`, `PUT /user/selected-item`
- `POST /user/lesson-progress`
- `GET /user/vocabulary-review?page=`, `POST /user/vocabulary-review`, `DELETE /user/vocabulary-review/`
- `GET /notifications`, `GET /notifications/stats`, `DELETE /notifications/`, `DELETE /notifications/read-all`

### B. Lessons, Sentences & Learning Time (`_app-7c4028110a8b19a9.js`, `5968-04e1b12249a4f619.js`)
- `GET /lessons`, `GET /lessons/daily`, `GET /lessons/progress`, `GET /lessons/suggest`
- `POST /lessons/complete`, `POST /lessons/reset`
- `GET /sentences/review`
- `POST /sentences/submit` *(body wrapped via client encoder `o.$`)*
- `POST /sentences/submit-shadowing` *(body wrapped via client encoder `o.$`)*
- `POST sentences/review/submit-shadowing` *(body wrapped via client encoder `o.$`)*
- `POST /learning-time/start`, `POST /learning-time/heartbeat`, `POST /learning-time/end` *(via `fetch(..., { keepalive: true })`)*

### C. Vocabulary & Dictionary (`5554`, `6974`, `7963`, `_app`, `vocabulary`)
- `GET /vocabulary/enc/public`, `GET /vocabulary/enc/public/`, `GET /vocabulary/enc/public/by-slug/`, `GET /vocabulary/enc/public/user-published` *(supports `x-bypass-rate-limit` when `API_KEY` env is present; `enc` responses decrypted client-side via AES-GCM)*
- `POST /vocabulary/` *(start study)*
- `GET /learning-vocabulary/cards`, `GET /learning-vocabulary/enc/due`, `GET /learning-vocabulary/enc/new`, `GET /learning-vocabulary/groups-progress/`, `GET /learning-vocabulary/session/current`, `GET /learning-vocabulary/session/history`, `GET /learning-vocabulary/stats`
- `POST /learning-vocabulary/session/start`, `POST /learning-vocabulary/submit`, `POST /learning-vocabulary/cards/remove`, `POST /learning-vocabulary/cards/reset`
- `PUT /learning-vocabulary/card/`, `DELETE /learning-vocabulary/card/`, `DELETE /learning-vocabulary/deck/`, `DELETE /learning-vocabulary/group/`
- `GET /user/vocabulary/decks`, `GET /user/vocabulary/decks/`, `POST /user/vocabulary/decks`, `POST /user/vocabulary/decks/`, `PUT /user/vocabulary/decks/`, `DELETE /user/vocabulary/decks/`
- `GET /user/vocabulary/groups/`, `POST /user/vocabulary/groups`, `PUT /user/vocabulary/groups/`, `DELETE /user/vocabulary/groups/`
- `GET /user/vocabulary/cards/`, `POST /user/vocabulary/cards`, `POST /user/vocabulary/cards/import`, `PUT /user/vocabulary/cards/`, `DELETE /user/vocabulary/cards/`, `GET /user/vocabulary/search`
- `GET /dictionary/search`, `GET /dictionary/word/` (`7963-72e37807b81c48fb.js`)

### D. Exams (IELTS & TOEIC) (`5554`, `8184`)
- `GET /exams/published/`, `GET /exams/published/sets`
- `GET /exams/`, `POST /exams/`
- `GET /exams/comments/replies/`, `DELETE /exams/comments/`
- `GET /exams/sessions/`, `POST /exams/sessions/`, `POST /exams/sessions/start`, `PUT /exams/sessions/`
- `GET /exams/sessions/analytics`, `GET /exams/sessions/history`

### E. Grammar, Stories, Gamification, Missions & Leaderboard (`3480`, `5554`, `7963`, `ev_cf679c41...`)
- `GET /level`, `GET /level/config`, `GET /level/milestones`, `POST /level/milestones/`
- `GET /streak`, `GET /streak/config`, `GET /streak/calendar`, `GET /streak/milestones`, `POST /streak/checkin`, `POST /streak/freeze/buy`, `POST /streak/milestones/`
- `GET /wallet`
- `GET /missions/config`, `GET /missions/today`, `GET /missions/feed`, `POST /missions/`, `POST /missions/dictation/submit`, `POST /missions/vocabulary/submit` (and `/missions/shadowing/submit` seen in path literals)
- `GET /leaderboard/home?`, `GET /leaderboard/monthly?`
- Grammar & Stories static path candidates (`ev_cf679c41...`): `/grammar/`, `/grammar/progress`, `/grammar/progress/batch/`, `/grammar/review/due`, `/grammar/syllabus/`, `/stories/`, `/stories/favorites`
- Shop static path candidates (`ev_cf679c41...`): `/shop/items`, `/shop/items/purchased`, `/shop/items/purchased/by-type`

### F. Community, Chat & Friends (`8506`, `9009`, `_app`)
- `GET /friends?page=`, `GET /friends/requests/incoming?page=`, `GET /friends/search?q=`, `GET /friends/status/`, `POST /friends/request`, `POST /friends/accept/`, `POST /friends/reject/`, `DELETE /friends/`
- `GET /private-chat/`, `GET /private-chat/conversations?page=`, `GET /private-chat/unread-count`, `GET /private-chat/block?page=`, `GET /private-chat/block/check/`, `POST /private-chat`, `POST /private-chat/`, `POST /private-chat/messages`, `POST /private-chat/block`, `DELETE /private-chat/block/`, `DELETE /private-chat/messages/`
- `POST /community-chat`, `PATCH /community-chat/`, `POST /community-chat/ban/`, `POST /community-chat/unban/`
- `POST /posts/reports`

### G. Billing, Promo, Activation & Affiliate (`_app-7c4028110a8b19a9.js`)
- `GET /prices`, `GET /promo/active`, `POST /promo/validate`
- `POST /activation-codes/activate`
- `POST /webhooks/sepay/generate-code`, `GET /webhooks/sepay/payment-status?code=`
- `GET /affiliate/me`, `GET /affiliate/packages`, `GET /affiliate/commissions`, `GET /affiliate/payout-profile`, `PUT /affiliate/payout-profile`, `GET /affiliate/payouts`, `POST /affiliate/payouts`, `GET /affiliate/referrals`, `POST /affiliate/code`, `POST /affiliate/prepare-paddle-checkout`

---

## 3. Coverage Limitations

- **Static vs. Runtime**: Only `/api/promo/active` and `/api/lessons/{id}/comments` were observed executing at runtime in unauthenticated guest captures; the remaining ~95+ endpoints are static call-site candidates from client bundles.
- **Authenticated / Feature-Specific Chunks**: Endpoints implemented solely inside unvisited dynamic chunks (e.g., voice-chat room signaling inside authenticated `practice-english-speaking` sessions, or specific exam-submission endpoints inside `session/[sessionId]`) may not appear above.
- **No Backend Visibility**: Request/response schemas, server authorization logic, and database behavior on `api.parroto.app` are outside client-side scope.
