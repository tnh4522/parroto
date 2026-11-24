# Parroto API Coverage Report

**Target**: `https://parroto.app/`  
**Phase**: 2.2 — API and Network Investigation

---

## 1. Executive Coverage Summary

- **Public Runtime Scenario Runs Analyzed**: 30 `capture_browser_scenario` captures (guest state, `request_body: false`, `response_body: true`, `header_values: false`) plus 1 passive CDP check (`ev_fbdd2c02167c7a8879d606b206eb77d8a2a5ab49861b1a1deae802d095be6fee` on `/pricing`).
- **Observed `api.parroto.app` Endpoints**: **13** distinct endpoints executed at runtime under guest browsing:
  - **11 with value-free JSON response schemas captured** (10 plaintext schemas: `promo/active`, `lessons/daily`, `lessons/{id}/comments`, `prices`, `leaderboard/monthly`, `exams/{id}/comments`, `shop/items`, `streak/config`, `stories`, `community-lessons`; plus 1 encrypted JSON wrapper: `exams/published/{slug}`)
  - **2 with HTTP metadata/status observed but response body uncaptured**:
    1. `GET /api/lessons?limit=500&sort_by=order&topic_slug=ielts-listening&page=1` (`200 OK`, `570,192` bytes, `unavailable(body-size-limit)`, `ev_22f2...`)
    2. `GET /api/dictionary/search?word=apple&locale=en` (`200 OK`, `no-body` because `wait-dict-results` failed and ended scenario before response retention settled, `ev_eefb...`)
- **Additional Non-API Channels Observed**:
  - Next.js SSG `_next/data/{buildId}/en/*.json` (4 distinct JSON payload shapes captured cleanly; larger files `98 KB–408 KB` hit the `65,536`-byte default retained body cap).
  - Client-side ML & rendering assets (`@rive-app/canvas@2.32.0/rive.wasm`, local `/models/Xenova/whisper-base.en/*` `404` -> `huggingface.co` `307`/`200`).
  - Billing, analytics, and ad/CMP scripts (`cdn.paddle.com`, `public.profitwell.com`, `googletagmanager.com`, `analytics.google.com`, `static.cloudflareinsights.com`, `/cdn-cgi/rum`, `googlesyndication.com`, `fundingchoicesmessages.google.com`).

---

## 2. Coverage by Functional Area (11 Areas)

| Area | Runtime Coverage | Key Verified Behavior | Known Gaps & Why |
| :--- | :--- | :--- | :--- |
| 1. Authentication | Static only | Firebase Auth + Bearer token cookie/localStorage injection + `401` refresh queue in `pages/_app` | No credentials or test login used; auth flows & `/user/info` not executed at runtime. |
| 2. User profile | Partial (embedded) | Author objects returned inside leaderboard, comments, and community lessons | Personal profile mutations (`/user/info`, `/username`, `/birthday`, `/notifications*`) auth-gated. |
| 3. Lessons & content | High (reads) | `/lessons/daily`, `/lessons?...` (`200`), `/lessons/{id}/comments`, `/stories`, `/grammar.json` observed | `/lessons?...` body > `65 KB` omitted (`570,192` B); write endpoints (`complete`, `reset`, `lesson-progress`, `sentence-notes`) auth-gated. |
| 4. Dictation | Partial | SSG encrypted lesson load, lesson comments, Rive WASM, Whisper `404` -> HuggingFace fallback | `POST /sentences/submit` (`o.$` encrypted body) & `/learning-time/*` not exercised as guest. |
| 5. Shadowing | Partial | Same encrypted SSG lesson + comments + Whisper probe | `POST /sentences/submit-shadowing` & microphone evaluation require active interactive audio flow / user session. |
| 6. Vocabulary | Partial | `GET /api/dictionary/search` (`200`), `/vocabulary/ielts-600` (`301` redirect), `_next/data/en/vocabulary.json` (`249 KB`) | `dictionary/search` body not retained due to scenario timeout; `dictionary/word/{word}` & `/learning-vocabulary/*` & `/user/vocabulary/*` not triggered. |
| 7. Spaced repetition | Static only | Endpoint contract table mapped in `pages/_app` (`64473`) and chunk `5554` | SRS review queues (`/user/vocabulary-reviews`, `/sentences/review/*`, `/learning-vocabulary/cards/due`, `/grammar/review/due`) require authenticated learning state. |
| 8. Learning statistics | Partial | `GET /api/leaderboard/monthly` & `GET /api/streak/config` (`200` + schemas) | Personal stats, streak calendar/check-in, wallet, XP level, and exam analytics auth-gated. |
| 9. Community | Partial | `GET /api/community-lessons?limit=24`, `/community-lessons/channels.json`, lesson & exam comments | `/community` and `/feedbacks` loaded without client `api.parroto.app` XHRs (SSR/SSG rendered or gated interactions); chat, friends, reports, and YouTube imports require auth. |
| 10. IELTS/TOEIC | Moderate (reads) | Exam sets SSG (`ielts.json`, `toeic.json`), encrypted `GET /exams/published/{slug}`, `GET /exams/{id}/comments` | Encrypted exam response plaintext not decoded from wire evidence; test session endpoints (`/exams/sessions/*`) require login / timed mode entry. |
| 11. Subscription | Moderate (catalog) | `GET /api/promo/active`, `GET /api/prices`, `GET /api/shop/items`, Paddle & ProfitWell scripts | Payment writes (`/webhooks/sepay/generate-code`, `/promo/validate`, `/activation-codes/activate`, `/affiliate/*`, `/shop` purchases) excluded by non-bypass & guest rules. |

---

## 3. Technical & Methodological Limitations

1. **No CDP Initiator Stacks in Scenario Events**: `capture_browser_scenario` uses Playwright and explicitly reports *"Playwright scenario events do not expose request initiator stacks"*. Initiator JS locations in [`api-inventory.md`](file:///d:/parroto/research/api/api-inventory.md) combine Playwright's `resource_type` / header names with static webpack chunk inspection (`exported_scripts`, `exported_dictation_scripts`, `exported_shadowing_scripts`, and step `446`/`479` captured chunks).
2. **Passive CDP `inspect_web_page` Attachment Timing**: Passive attachment (`ev_fbdd2c02...`) after `/pricing` had already finished loading recorded zero in-flight `network.requests` (`prior_activity_available: false`).
3. **Payload Size & Event Retention Caps**: Default Playwright scenario caps (`max_network_body_bytes: 65536`, `max_events`) truncated HTML documents, `_next/data/en/{topics,shadowing,dictation,vocabulary}.json`, Whisper `tokenizer.json` (`2.12 MB`), `rive.wasm` (`1.45 MB`), and `GET /api/lessons?...` (`570,192` bytes).
4. **Encrypted Request & Response Payloads**: `/api/exams/published/{slug}` and SSG lesson `pageProps.payload` return AES-GCM encrypted strings (`{"encrypted":true,"data":"string"}`); write mutations (`/sentences/submit`, `/sentences/submit-shadowing`, `/lessons/complete`) similarly encode payloads via client helper `o.$`.
5. **Unauthenticated & Non-Bypass Boundaries**: All scenarios executed as an unauthenticated guest without cookies or tokens; ~85+ authenticated, Pro-gated, or mutation endpoints documented statically in [`endpoint-candidates.md`](file:///d:/parroto/research/javascript/endpoint-candidates.md) were intentionally left unexercised at runtime.
