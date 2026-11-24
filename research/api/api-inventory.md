# Parroto API and Network Inventory

**Target**: `https://parroto.app/`  
**API Origin**: `https://api.parroto.app/api` (configured via Axios `baseURL` with `timeout: 30000` in [`pages/_app-7c4028110a8b19a9.js`](file:///C:/Users/ACER/.gemini/antigravity/brain/c6777a06-cf29-47e9-8c66-437cec9d2936/scratch/exported_scripts/files/origins/037181f0183da17c994732f4219d14ad0cb0b5c9bb4dffbd54bf2a9d84252a00/_next/static/chunks/pages/_app-7c4028110a8b19a9.js) `@586897`)  
**Capture Policy**: Unauthenticated public guest observation using `capture_browser_scenario` with `request_body: false`, `response_body: true`, and `header_values: false`. No cookies, access tokens, authorization header values, or private account data were captured or stored.  
**Candidate Status Rule**: Runtime-observed transactions are listed in Sections 1–3; unexecuted endpoints discovered in JavaScript bundles remain **static candidates** until observed at runtime (summarized per feature in [`api-feature-matrix.md`](file:///d:/parroto/research/api/api-feature-matrix.md) and [`endpoint-candidates.md`](file:///d:/parroto/research/javascript/endpoint-candidates.md)).

---

## 1. Runtime-Observed First-Party API Requests (`https://api.parroto.app`)

> **Initiator Limitation Note**: Playwright scenario captures (`capture_browser_scenario`) expose `resource_type` (`xhr`/`fetch`) and scenario step receipt order, **not** CDP JavaScript call-stack initiators. Where exact client call sites were located in exported static webpack chunks, both the runtime request mechanism and the static JS initiator location are listed below.

### 1.1 `GET https://api.parroto.app/api/promo/active`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/promo/active`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`487` bytes)
- **Request initiator**: Client-side Axios XHR during React layout/app mount (`header_names`: `accept, accept-language, referer, sec-ch-ua, sec-ch-ua-mobile, sec-ch-ua-platform, user-agent, x-user-timezone`)
- **JavaScript initiator location**: `pages/_app-7c4028110a8b19a9.js @302500` (`a.E.get("/promo/active"...)`)
- **Schema shape status**: Captured (value-free schema in [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L33))
- **Triggering user action**: `scenario_start` / initial page hydration across `/topics`, `/`, `/pricing`, `/leaderboard`, `/stories`, `/shop`, `/community-lessons`, `/lessons/...`, `/exams/...`
- **Evidence reference**: `ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c`, `ev_61f1a86e9a35a4cbc2c5c3ba3dd2b250fdeab06532d1d3597df202456abc1089`, `ev_3c26affad61bcf5504f05972a49f6144c2d6bcda7d900214de89cc65cc463791`, `ev_89cd5c4c38845f11ce3d6c1a9ad11cb7691ee30d42c60301a2f865d777442102`
- **Coverage limitations**: Playwright does not expose CDP stack frames; verified in guest state only (query param variants for authenticated users not exercised).

### 1.2 `GET https://api.parroto.app/api/lessons/daily`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/lessons/daily`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`2,704` bytes)
- **Request initiator**: Client-side Axios XHR on homepage mount (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `pages/_app-7c4028110a8b19a9.js @299135` (`getDailyLessons`)
- **Schema shape status**: Captured (see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L50))
- **Triggering user action**: `scenario_start` / homepage load at `https://parroto.app/`
- **Evidence reference**: `ev_61f1a86e9a35a4cbc2c5c3ba3dd2b250fdeab06532d1d3597df202456abc1089`
- **Coverage limitations**: Guest view only; user-specific completion state not populated.

### 1.3 `GET https://api.parroto.app/api/lessons?limit=500&sort_by=order&topic_slug={topicSlug}&page=1`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/lessons?limit=500&sort_by=order&topic_slug={topicSlug}&page=1` (observed with `topic_slug=ielts-listening`)
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: Not retained (`unavailable(body-size-limit)`, `observed_bytes: 570,192`)
- **Request initiator**: Client-side Axios XHR on topic detail page hydration (`header_names`: `accept, accept-language, authorization, referer, ..., x-user-timezone` — `authorization` present because `generateKey: true` attaches a client-generated ephemeral Bearer key even for guests; value redacted)
- **JavaScript initiator location**: `pages/_app-7c4028110a8b19a9.js @297979` (`a.E.get("/lessons", d, e, !0)`) and `_app @587093` (`generateKey` interceptor)
- **Schema shape status**: **Unavailable** (`570,192` bytes exceeded the `65,536`-byte `max_network_body_bytes` limit during capture)
- **Triggering user action**: `scenario_start` / page load at `https://parroto.app/topics/ielts-listening`
- **Evidence reference**: `ev_22f2e4ef2689404827de30ad04183e688a4a196e0ea9c1192e436e5da4ed3e1b`
- **Coverage limitations**: Response body truncated due to `body-size-limit` (`570,192 > 65,536`); exact wire `content-type` header not retained (`header_values: false`).

### 1.4 `GET https://api.parroto.app/api/lessons/{lessonId}/comments?page=1&limit=10`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/lessons/{lessonId}/comments?page=1&limit=10`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`8,080` bytes)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `5277-56b17c8e461aa064.js @12836` (`basePath(e)` + `/comments`)
- **Schema shape status**: Captured (see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L73))
- **Triggering user action**: `skip-modal` click (`Skip` button on learning setup modal) on `/lessons/dictation/first-class-upgrade-perks` and `/lessons/shadowing/first-class-upgrade-perks`
- **Evidence reference**: `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f`, `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371`
- **Coverage limitations**: Only page `1` (`limit=10`) observed; reply expansion (`replies`), `POST` create, and `DELETE` endpoints were not triggered as guest.

### 1.5 `GET https://api.parroto.app/api/dictionary/search?word={query}&locale=en`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/dictionary/search?word={query}&locale=en` (observed query `word=apple`)
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: Not retained (`no-body` — Playwright scenario ended during follow-up `wait_for` timeout)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `7963-72e37807b81c48fb.js @568` (`searchWords`)
- **Schema shape status**: **Unavailable** (response body event not retained in `ev_eefb...`)
- **Triggering user action**: `open-dict` (click `"Search dictionary"` button) followed by `search-apple` (`fill` `"apple"` into `"Search a word..."` textbox) on `/topics`
- **Evidence reference**: `ev_eefb01d45f08e2d97c86fefe6db7c23a9e293739540a8a06b85298c80e32907a`
- **Coverage limitations**: Response schema not captured because subsequent wait step timed out before body settlement (`completeness.missing_sections: ["action", "events"]`); follow-up `/api/dictionary/word/{word}` click was not reached.

### 1.6 `GET https://api.parroto.app/api/prices`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/prices`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`3,691` bytes)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `pages/_app-7c4028110a8b19a9.js @453387` (`getAllPaddlePricesApi`)
- **Schema shape status**: Captured (Paddle catalog + price overrides; see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L106))
- **Triggering user action**: `scenario_start` / pricing page mount (`https://parroto.app/pricing`)
- **Evidence reference**: `ev_3c26affad61bcf5504f05972a49f6144c2d6bcda7d900214de89cc65cc463791`
- **Coverage limitations**: Only public Paddle price catalog observed; `POST /promo/validate`, Sepay QR generation, and Paddle/Stripe checkout mutations not triggered.

### 1.7 `GET https://api.parroto.app/api/leaderboard/monthly?month={yyyymm}`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/leaderboard/monthly?month={yyyymm}` (observed `month=202611`)
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`39,466` bytes)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `5554-67f09283b16fe43c.js @5384` (and SWR key factory `pages/_app-7c4028110a8b19a9.js @403446`)
- **Schema shape status**: Captured (see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L139))
- **Triggering user action**: Page load / leaderboard mount (`https://parroto.app/leaderboard`)
- **Evidence reference**: `ev_e9d03dda025dad15e499af4697737a23d1c8015201635fdd01999c36b5580fed`
- **Coverage limitations**: Only monthly leaderboard captured (`sortBy=vocabulary` and `/leaderboard/home` variants not triggered in scenario).

### 1.8 `GET https://api.parroto.app/api/exams/published/{examSlug}`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/exams/published/{examSlug}` (observed `parroto-ielts-2026-reading-test-1`)
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`1,068` bytes)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `5554-67f09283b16fe43c.js @2058` (`getExamOverview`)
- **Schema shape status**: Captured (encrypted wrapper: `{"encrypted":"boolean","data":"string"}`; decrypted client-side in `_app @587617`)
- **Triggering user action**: Page load at `https://parroto.app/exams/ielts/parroto-ielts-2026-reading-test-1`
- **Evidence reference**: `ev_332e7c82b29005b7c582886e499f5cfa2e29b6dd040f330c0f9c87b8bfab64d5`
- **Coverage limitations**: Response payload is encrypted on the wire; plaintext inner object schema is not exposed in raw network evidence without inspecting runtime decrypted memory or source-derived types.

### 1.9 `GET https://api.parroto.app/api/exams/{examId}/comments?page=1&limit=20`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/exams/{examId}/comments?page=1&limit=20`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`16,089` bytes)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `5554-67f09283b16fe43c.js @4711` (`getExamComments`)
- **Schema shape status**: Captured (see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L179))
- **Triggering user action**: Page load / hydration at `https://parroto.app/exams/ielts/parroto-ielts-2026-reading-test-1`
- **Evidence reference**: `ev_332e7c82b29005b7c582886e499f5cfa2e29b6dd040f330c0f9c87b8bfab64d5`
- **Coverage limitations**: Only page `1` (`limit=20`) captured; comment replies, posting, and exam session start/answer endpoints require authentication (`select-practice-mode` did not start a session as guest).

### 1.10 `GET https://api.parroto.app/api/shop/items?limit=100&isApproved=true&locale=en`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/shop/items?limit=100&isApproved=true&locale=en`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`18,733` bytes)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `pages/shop-d9b6f1f47f87e12b.js @1675` (`getShopItemsApi`) and key factory `pages/_app-7c4028110a8b19a9.js @401676`
- **Schema shape status**: Captured (see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L214))
- **Triggering user action**: Shop page load (`wait-shop-item` `"Harvard"` / hydration at `https://parroto.app/shop`)
- **Evidence reference**: `ev_13a05aa667760cef065cbe1fe117fb587f0e5096dd0acca2aecb919fafb63c1e`
- **Coverage limitations**: Unauthenticated catalog read only; `/shop/items/purchased` and purchase/equip mutations require sign-in.

### 1.11 `GET https://api.parroto.app/api/streak/config`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/streak/config`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`1,190` bytes)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `3480-3c37c1ac30021006.js @571` (`getConfig`) and key factory `pages/_app-7c4028110a8b19a9.js @404940`
- **Schema shape status**: Captured (see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L244))
- **Triggering user action**: Page hydration (`https://parroto.app/shop`)
- **Evidence reference**: `ev_13a05aa667760cef065cbe1fe117fb587f0e5096dd0acca2aecb919fafb63c1e`
- **Coverage limitations**: Static milestone/freeze config only; user streak state (`/streak`, `/streak/calendar`, `/streak/checkin`, `/streak/freeze/buy`) is auth-gated.

### 1.12 `GET https://api.parroto.app/api/stories?sort=popular&page=1&limit=18`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/stories?sort=popular&page=1&limit=18`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`61,517` bytes)
- **Request initiator**: Client-side Axios/SWR XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: Key factory `pages/_app-7c4028110a8b19a9.js @401847` (`stories` SWR key invoked from `pages/stories-cda1559f8626b4b7.js`)
- **Schema shape status**: Captured (see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L261))
- **Triggering user action**: Stories catalog page load (`https://parroto.app/stories` -> `wait-first-story`, `wait-stories-resp`)
- **Evidence reference**: `ev_5432320bf196de1e62450eb7aa245ec3edf27c3955f48215cd6e9a90b205809d` (also seen incomplete without body in `ev_38851335ac159d78f75831f55170780df4036e6fd121b6ee688b74aec1206b2e`)
- **Coverage limitations**: Only `sort=popular&page=1&limit=18` captured; favorite/progress endpoints (`/stories/favorites`, `/stories/{id}/progress`) are auth-gated.

### 1.13 `GET https://api.parroto.app/api/community-lessons?limit=24`
- **HTTP method**: `GET`
- **Origin & redacted path**: `https://api.parroto.app/api/community-lessons?limit=24`
- **Resource category**: `xhr`
- **Status code**: `200`
- **Content type**: `application/json; charset=utf-8` (`25,220` bytes)
- **Request initiator**: Client-side Axios XHR (`header_names`: `accept, accept-language, referer, ..., x-user-timezone`)
- **JavaScript initiator location**: `5247-0206db5333cd284f.js @790` (`getCommunityLessons`)
- **Schema shape status**: Captured (see [`api-data-contracts.md`](file:///d:/parroto/research/api/api-data-contracts.md#L298))
- **Triggering user action**: Community lessons page load (`https://parroto.app/community-lessons` -> `wait-cl-load`)
- **Evidence reference**: `ev_89cd5c4c38845f11ce3d6c1a9ad11cb7691ee30d42c60301a2f865d777442102`
- **Coverage limitations**: Only public feed (`limit=24`) observed; authenticated actions (`from-youtube`, `mine`, `quota`, `submit`) were not invoked.

---

## 2. Same-Origin Next.js SSG Data & Asset Requests (`https://parroto.app`)

| Method & Status | Origin & Redacted Path | Category | Content Type & Size | Initiator & Trigger | Evidence Reference | Coverage Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET 200` / `301` | `https://parroto.app/{route}` | `document` | `text/html; charset=utf-8` (`91 KB–3.17 MB`, `301` redirect `/vocabulary/68fb9444c82801c32077e73e` -> `/vocabulary/ielts-600`) | Browser navigation on `scenario_start` | `ev_d706...`, `ev_1548...`, `ev_89cd...` | HTML bodies > `65,536` bytes mostly marked `body-size-limit` unless raised (`107,741` captured on `ev_89cd...`). |
| `GET 200` | `https://parroto.app/_next/data/{buildId}/en/lessons/{mode}/{lessonSlug}.json?lessonSlug={lessonSlug}` | `fetch` | `application/json` (`51,018` bytes) | Next.js Router `x-nextjs-data` fetch during lesson hydration (`dictation`, `shadowing`) | `ev_0b6d...`, `ev_ee5f...` | Returns encrypted `pageProps.payload` (`string`); inner lesson structure not plain JSON on wire. |
| `GET 200` | `https://parroto.app/_next/data/{buildId}/en/exams/ielts.json` and `/en/exams/toeic.json` | `fetch` | `application/json` (`46,620` / `47,212` bytes) | Next.js Link prefetch on `/topics`, `/stories`, `/exams/...` | `ev_d706...`, `ev_332e...` | Value-free schema captured (`pageProps.initialExamSets[]`). |
| `GET 200` | `https://parroto.app/_next/data/{buildId}/en/grammar.json` | `fetch` | `application/json` (`49,005` bytes) | Next.js Link prefetch on `/topics`, `/shop`, `/stories` | `ev_d706...`, `ev_13a0...`, `ev_3885...` | Value-free schema captured (`pageProps.initialItems[]`). |
| `GET 200` | `https://parroto.app/_next/data/{buildId}/en/community-lessons/channels.json` | `fetch` | `application/json` (`65,426` bytes) | Next.js Link prefetch on `/community-lessons` | `ev_89cd...` | Value-free schema captured (`pageProps.channels[]`). |
| `GET 200` | `https://parroto.app/_next/data/{buildId}/en/{topics,shadowing,dictation,vocabulary}.json`, `/stories/{slug}.json` | `fetch` | Not captured (`unavailable(body-size-limit)`, `98 KB–408 KB`) | Next.js Link prefetch from sidebar / cards | `ev_d706...`, `ev_5432...` | Exceeded `65,536`-byte default retained body cap. |
| `GET 404` | `https://parroto.app/models/Xenova/whisper-base.en/{tokenizer,config,preprocessor_config,generation_config}.json` & `.onnx` | `fetch` | `unavailable(body-size-limit)` / `response-unfinished` (`68,526` bytes HTML 404) | Transformers.js local-first model probe (`2260-8606587551610c04.js @5331`) on dictation/shadowing load | `ev_0b6d...`, `ev_ee5f...` | Intentional local-path miss before falling back to `huggingface.co`. |
| `POST 204` | `https://parroto.app/cdn-cgi/rum?` | `xhr` | `text/plain` (`204 No Content`) | Cloudflare Insights beacon (`beacon.min.js`) after load/navigation | `ev_24ef...`, `ev_1548...`, `ev_554f...` | `request_body: false`; telemetry payload not inspected. |

---

## 3. Third-Party CDN, Billing, ML Model & Analytics Requests

| Method & Status | Origin & Redacted Path | Category | Content Type | JS Initiator / Triggering Action | Evidence Reference | Coverage Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `GET 307` -> `200` | `https://huggingface.co/Xenova/whisper-base.en/resolve/main/*` -> `https://huggingface.co/api/resolve-cache/models/Xenova/whisper-base.en/...` | `fetch` | `text/plain; charset=utf-8` (configs `339–2,202` B; `tokenizer.json` `2.12 MB` `body-size-limit`) | Fallback after local `/models/...` 404 in `2260-8606587551610c04.js @5331` on dictation (`start-dictation`) / shadowing | `ev_0b6d...`, `ev_ee5f...` | Large `.onnx` model weights still downloading or unfinished at step exit (`response-unfinished`). |
| `GET 200` | `https://unpkg.com/@rive-app/canvas@2.32.0/rive.wasm` | `fetch` | `unavailable(body-size-limit)` (`1,452,489` bytes) | `@rive-app/canvas` runtime initialization (`skip-modal` on `/lessons/dictation/...`) | `ev_0b6d...` | Binary WASM > `65 KB` limit; exact JS call offset inside Rive vendor chunk not enumerated. |
| `GET 200` | `https://cdn.paddle.com/paddle/v2/paddle.js` & `assets/css/paddle.css` | `script`, `stylesheet` | `text/javascript` (`58,160` B), `text/css` (`4,564` B) | Global billing loader `pages/_app-7c4028110a8b19a9.js @429722` across public pages | `ev_d706...`, `ev_332e...`, `ev_5432...` | Passive SDK bootstrap only; checkout overlay requires billing trigger / login. |
| `GET 200` | `https://public.profitwell.com/js/profitwell.js?auth=[REDACTED_PUBLIC_TOKEN]` | `script` | `text/javascript` (`51,238` B) | Loaded alongside Paddle SDK on page hydration (`/topics`, `/stories`, `/exams/...`) | `ev_5432...`, `ev_22f2...`, `ev_d09c...` | Public query token redacted; no subscription mutation executed. |
| `GET 200` / `POST 204` | `https://www.googletagmanager.com/gtag/js?id=G-XT7YM63MNV`, `https://analytics.google.com/g/collect?...` | `script`, `fetch` | `unavailable(body-size-limit)` / `text/plain` (`204`) | `GoogleAnalytics` component in `pages/_app-7c4028110a8b19a9.js @584429` | `ev_d706...`, `ev_332e...`, `ev_13a0...` | Analytics beacon only. |
| `GET 200` / `POST 204` | `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8370399241480974`, `https://ep1.adtrafficquality.google/getconfig/sodar`, `https://fundingchoicesmessages.google.com/el/[REDACTED_TOKEN]` | `script`, `xhr`, `fetch` | Ad scripts / `204` beacons | AdSense / FundingChoices loader in `pages/_app-7c4028110a8b19a9.js @515118` | Across guest routes (`ev_d706...`, etc.) | Third-party ad/CMP telemetry; opaque path tokens redacted. |
| `GET 200` | `https://assets.parroto.app/assets/...` & `https://lh3.googleusercontent.com/a/...` | `image` | `image/jpeg`, `image/png`, `image/svg+xml` | Lesson thumbnails, UI badges/flags, and Google profile avatars on comment/feedback feeds | `ev_d706...`, `ev_24ef...` | Static CDN assets only (`thumbnail-*.jpg` returned `text/html` fallback in some headless responses). |
