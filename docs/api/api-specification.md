# REST API & WebSocket Specification (`/api/v1`)

**Server**: NestJS + Zod DTO Validation + Swagger/OpenAPI · **Base Path**: `/api/v1`  
**Auth Header**: `Authorization: Bearer <accessToken>` (plus `HttpOnly` refresh cookie on `/auth/*`)  
**Standard Error Envelope**:
```json
{
  "statusCode": 403,
  "code": "ENTITLEMENT_REQUIRED",
  "message": "Active PRO or LIFETIME entitlement is required",
  "traceId": "uuid"
}
```

---

## 1. Identity & Authentication (`/auth`, `/users`)

| Method & Path | Auth | Request Shape | Response Shape | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `POST /auth/oauth/{provider}/exchange` | Public | `{ code, codeVerifier, redirectUri }` | `{ accessToken, user }` + `Set-Cookie` refresh | Google / Apple PKCE exchange |
| `POST /auth/magic-link` | Public | `{ email }` | `{ sent: true }` | 10-min single-use Redis token |
| `POST /auth/magic-link/verify` | Public | `?token=` or `{ token }` | `{ accessToken }` + `Set-Cookie` refresh | Consumes Redis token, creates refresh family |
| `POST /auth/refresh` | Cookie | *(HttpOnly refresh cookie)* | `{ accessToken }` + rotated cookie | Reuse revokes token family |
| `POST /auth/logout` | Bearer | `{}` | `204 No Content` | Revokes refresh family |
| `GET /users/me` | Bearer | — | `{ id, email, username, displayName, role, entitlementTier, ageVerified, stats }` | Full profile & stats |
| `PATCH /users/me/onboarding` | Bearer | `{ username, birthDate?, preferredTranslateLang? }` | `{ user }` | Enforces unique `username` |
| `PATCH /users/me/preferences` | Bearer | `{ displayName?, preferredUiLocale?, preferredTranslateLang?, birthDate? }` | `{ user }` | Updates profile display & learning defaults |
| `POST /users/me/audio-consent` | Bearer | `{ accepted: true, policyVersion? }` | `{ consented: true, consentedAt }` | Required before cloud recording upload |

---

## 2. Media, Dictionary & AI Endpoints (`/media`, `/dictionary`, `/audio`)

| Method & Path | Auth | Request Shape | Response Shape | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `POST /media/presign-upload` | Bearer | `{ purpose, mimeType, contentLength, consentAccepted? }` | `{ assetId, uploadUrl, expiresAt }` | `contentLength <= 25 MB`, requires consent |
| `POST /media/{assetId}/confirm` | Bearer | — | `{ assetId, status }` | `HeadObject` verification |
| `GET /media/{assetId}/stream-url` | Optional/Pro | — | `{ signedUrl, expiresAt }` | Enforces `isPro` lesson/exam check |
| `DELETE /media/{assetId}` | Bearer | Owner check | `{ deleted: true, assetId }` | Deletes S3 object & scrubs audio refs |
| `GET /dictionary/search?q=&locale=en` | Public | Query `q` (1–64 chars) | `{ items: [{ word, phonetic, partOfSpeech, shortMeaning }] }` | Cached in Redis |
| `GET /dictionary/words/{word}` | Public | — | `{ word, phonetics: [{ locale, ipa, audioUrl }], meanings[] }` | Cached `24h` |
| `POST /audio/transcribe-fallback` | Bearer | `{ assetId, language }` | `{ text, segments[] }` | Rate-limited cloud STT fallback |
| `POST /ai/speech-assessments` | Bearer | `{ assetId, mode, language?, referenceText?, ieltsPart?, promptQuestion? }` | `202 Accepted { assessmentId, status }` | Queues `speech-assessment` worker |
| `GET /ai/speech-assessments/{id}` | Bearer | Owner check | `{ assessment }` (`measurementTier`, `acousticMetrics`, `llmCoachingFeedback`) | Separates acoustic facts from LLM coaching |
| `POST /ai/vocabulary/explain` | Bearer | `{ word, cefrLevel?, contextSentence? }` | `{ explanation }` | Redis cached & Zod structured JSON |
| `POST /ai/toeic/explain` | Bearer | `{ transcript, questionPrompt, options[], correctAnswer }` | `{ explanation }` | TOEIC Listening/Speaking coaching JSON |

---

## 3. Lessons (Dictation, Shadowing, Grammar, Stories)

| Method & Path | Auth | Request Shape | Response Shape | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET /lessons?topic=&level=&mode=&page=&limit=` | Public | Query pagination | `{ items: LessonSummary[], pagination }` | Strips transcript for `isPro` if guest |
| `GET /lessons/daily` | Public | — | `{ dateKey, items: LessonSummary[] }` | Daily spotlight |
| `GET /lessons/{slug}` | Optional | — | `{ lesson, signedMediaUrl?, sentences? }` | `sentences` omitted when locked (`403` on unlock trigger) |
| `POST /lessons/{lessonId}/attempts` | Bearer | `{ sentenceId, mode, accuracyScore, mistakesCount, replayCount }` | `{ passed, sentenceScore, diamondsEarned, streakUpdated }` | Server validates ranges & ledger idempotency |
| `POST /lessons/import-youtube` | Pro | `{ youtubeUrl, topicIds? }` | `202 Accepted { jobId, lessonId }` | Queues `media-ingestion` |
| `GET /grammar?level=A1` | Public | Query CEFR level | `{ items: GrammarTopic[] }` | Public catalog |
| `GET /stories?level=&collection=&sort=&page=` | Public | Query filters | `{ items: StorySummary[], pagination }` | Story catalog |
| `GET /stories/{slug}` | Optional | — | `{ story, signedAudioUrl?, scenes[] }` | `Listen & read` sync cues |
| `POST /comments` | Bearer | `{ targetType, targetId, content, parentId? }` | `{ comment }` | Length `1..1000`, rate-limited |
| `GET /comments?targetType=&targetId=&page=&limit=20` | Public | Query params | `{ items: Comment[], pagination }` | Public thread reads |

---

## 4. Vocabulary & Spaced Repetition (`/vocabulary`, `/srs`)

| Method & Path | Auth | Request Shape | Response Shape | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET /vocabulary/decks?visibility=&q=&page=` | Public | Query filters | `{ items: VocabDeck[], pagination }` | Canonical slug routing |
| `POST /vocabulary/decks` | Bearer | `{ title, description?, cefrLevel, visibility, cards[] }` | `201 { deck }` | Personal deck & card creation |
| `GET /vocabulary/decks/{slug}` | Optional | — | `{ deck, previewCards[24], totalCards }` | `isPro` blocks full deck unless entitled |
| `GET /srs/due?limit=20` | Bearer | Query `limit` | `{ dueCount, cards: VocabCardWithSchedule[] }` | Indexed query `nextReviewAt <= now()` |
| `POST /srs/reviews` | Bearer | `{ cardId, rating: 1\|2\|3\|4 }` | `{ nextReviewAt, intervalDays, easeFactor, state }` | SM-2 schedule calculation server-side |

---

## 5. IELTS & TOEIC Exams (`/exams`)

| Method & Path | Auth | Request Shape | Response Shape | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `GET /exams/sets?track=IELTS\|TOEIC` | Public | Query `track` | `{ sets: ExamSet[] }` | Cached in Redis |
| `GET /exams/sets/{setSlug}` | Public | — | `{ examSet, exams: ExamSummary[] }` | Sorted free-first then `sortOrder` |
| `GET /exams/{slug}` | Public | — | `{ exam, parts[], userInProgressSessionId? }` | Zero audio URLs exposed publicly |
| `POST /exams/sessions/start` | Bearer | `{ examId, mode: "TEST"\|"PRACTICE", parts?: number[] }` | `201 { session }` | Validates `isFree`/Pro entitlement; enforces 1 active session per exam |
| `GET /exams/sessions/{id}/questions?part=` | Bearer | Owner check | `{ parts[], groups: [{ ..., audioSignedUrl?, questions[] }] }` | Strips `correctAnswer` & `explanation` while `IN_PROGRESS` |
| `PUT /exams/sessions/{id}/answers` | Bearer | `{ answers: [{ questionNumber, selectedValue, isFlagged? }] }` | `{ savedCount, updatedAt }` | Batch idempotent upsert; rejects if expired `TEST` deadline |
| `GET /exams/sessions/{id}/check/{qn}` | Bearer | `mode === PRACTICE` | `{ isCorrect, correctAnswer, explanationHtml }` | Blocked in `TEST` mode (`403`) |
| `POST /exams/sessions/{id}/submit` | Bearer | — | `{ sessionResult }` | Locks under Redis mutex, grades answers, computes band/scaled score |
| `POST /exams/sessions/{id}/abandon` | Bearer | — | `{ status: "ABANDONED" }` | Cancels active attempt |
| `GET /exams/sessions/{id}/result` | Bearer | Completed owner check | `{ session, answersMap, groups, parts }` | Includes full explanations & weak-area breakdown |
| `GET /exams/history?track=&page=` | Bearer | Query filters | `{ items: ExamSessionSummary[], pagination }` | User history |
| `GET /exams/analytics?track=` | Bearer | Query `track` | `{ summary, scoreTrend[], topWeakAreas[] }` | Derived from completed sessions |

---

## 6. Gamification, Billing & Realtime WebSockets

| Method / Event | Auth | Payload / Behavior |
| :--- | :--- | :--- |
| `GET /leaderboard/monthly?month=202611` | Public | Redis ZSET + cached reward tier config |
| `POST /streak/checkin` | Bearer | Idempotent daily check-in (`diamond_ledger` credit) |
| `GET /shop/items` & `POST /shop/purchase` | Public / Bearer | Atomic Postgres transaction debiting `diamond_ledger` -> inserting `user_inventory` |
| `GET /billing/plans` & `POST /billing/checkout` | Public / Bearer | Returns provider checkout session / VietQR payload |
| `POST /webhooks/{paddle\|stripe\|vietqr}` | HMAC Signature | Verifies signature -> idempotent `payment_transactions` -> grants `EntitlementGrant` + affiliate commission |
| `GET /speaking/rooms?cefrLevel=&topic=` | Public | Returns `{ items: SpeakingRoom[] }` listing active community speaking rooms |
| `POST /speaking/rooms` | Bearer (`ageVerified`) | `{ name, topic, cefrLevel, maxParticipants: 2..5, isPrivate }` -> `201 { room }` (age-verified boundary) |
| **WS `/ws/community`** (`Socket.IO`) | Bearer JWT handshake | Events: `chat:send`, `chat:message`, `speaking:join`, `speaking:signal` (WebRTC ICE/SDP), `battle:match` |
