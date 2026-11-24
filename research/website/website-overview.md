# Parroto Website Overview

**Target**: `https://parroto.app/`  
**Operator / Legal Entity**: PARROTO COMPANY LIMITED (`© 2026 PARROTO CO., LTD. All rights reserved.`, founded 2025 — observed on `/about-us` and footer)  
**Investigation Date**: 2026-11-24  
**Primary Tooling**: REA MCP (`list_browser_targets`, `inspect_web_page`, `discover_webmcp_tools`, `capture_web_screenshot`, `analyze_web_bundle`, `inspect_analysis_view`, `export_web_scripts`, `capture_browser_scenario`)

---

## 1. Executive Summary (Verified Facts)

- **Platform Purpose**: Parroto is an English-learning web platform centered on real-world video **dictation** and **shadowing**, contextual **vocabulary** with spaced repetition, **grammar** lessons (A1–C2), **stories**, **1-on-1 community speaking practice**, **vocabulary games / PvP battles**, and **IELTS & TOEIC mock exams** (Listening and Reading).
- **Web Stack & Architecture** (observed via `inspect_web_page` `ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1` and `analyze_web_bundle` `ev_1dc77cbcbcb2c41259a42a427276fb24aad86410276ffa1009d9f7be6e3b92c7`):
  - **Next.js Pages Router** application (`/_next/static/chunks/pages/...`, `_buildManifest.js`, `_ssgManifest.js`).
  - **Client Storage & Auth Infrastructure Signals** (observed storage keys/DBs in `ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1`, values redacted):
    - IndexedDB: `firebase-heartbeat-database`, `firebaseLocalStorageDb`
    - LocalStorage: `google_adsense_settings`, `google_ama_config`
    - SessionStorage: `community_chat_initialized`
  - **Third-Party Integrations Observed in CDP Targets / DOM**:
    - Google AdSense / DoubleClick (`googleads.g.doubleclick.net`, `ca-pub-8370399241480974`) and `ep2.adtrafficquality.google` (observed in initial Chrome target list).
    - Google reCAPTCHA (`https://www.google.com/recaptcha/api2/aframe` iframe observed in Chrome target list).
    - Cross-promotion banner for `Baolingo` (`https://baolingo.app/`) observed on `/dashboard` (`ev_6d4ee75bc4876e06f08adda2876af4dec58519a76f129860b5455726d4248442`).
  - **WebMCP Discovery**: `discover_webmcp_tools` (`ev_768c0af38c73a5947699a7fdb473f0b2c9ae9b0b35ad3aeb4878d38c970d9d5d`) confirmed `0` page-registered WebMCP tools on `https://parroto.app/`.
- **Two Distinct Shell Layouts**:
  1. **Marketing / Informational / Auth Top-Navbar Shell**: Used by `/`, `/login`, `/pricing`, `/about-us`, `/about-us/advisors`, `/authors`, `/blog`, `/privacy-policy`, `/terms-of-service`, `/contact-us`, `/my-notes`, `/my-vocabulary`, and the `404` error page. Features a horizontal top `<header>` (`banner`) and full `<footer>` (`contentinfo`).
  2. **Application Sidebar Shell**: Used by `/dashboard`, `/topics`, `/dictation`, `/shadowing`, `/vocabulary`, `/vocabulary/[slug]`, `/vocabulary/word-rain`, `/grammar`, `/grammar/[slug]`, `/practice-english-speaking`, `/exams/ielts`, `/exams/ielts/sets/[slug]`, `/exams/ielts/[slug]`, `/exams/toeic`, `/games`, `/vocab-battle`, `/stories`, `/stories/[slug]`, `/review`, `/community`, `/leaderboard`, `/chat`, `/feedbacks`, `/shop`, `/affiliate`, `/profile`, and `/lessons/dictation/[slug]`. Features a collapsible left `<aside>` (`complementary`), compact top search/settings bar (`Search dictionary`, `Translation Language`, theme toggle, UI language selector), and no footer.
  3. **Full-Screen Vertical Feed Layout**: `/shorts` uses a dedicated distraction-free vertical media layout without `<main>` or the standard `<aside>` sidebar.

---

## 2. Target Discovery & Environment Baseline

| Step | REA Operation | Outcome & Key Facts | Evidence Reference |
| :--- | :--- | :--- | :--- |
| 1 | `list_browser_targets` (`http://127.0.0.1:9222`) | Discovered Chrome `157.0.8103.79` page target `9DC1E0447EC14B975766AC131D8826F0` at `https://parroto.app/` (`10` non-page targets excluded, e.g. ad/reCAPTCHA iframes and extension SWs). | `ev_5081508685dc1cd8e48382960f495914d80e1043d382505109d7e4e53eefa916` |
| 2 | `inspect_web_page` | Captured 1,520 accessibility nodes, DOM node tree, 49 script references, and storage inventory on `/`. | `ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1` |
| 3 | `capture_web_screenshot` | Captured desktop `1280x720` PNG viewport of `/`. | `ev_ea2ef4ec7ac8e2fd9c91009e76ea59eaf37baaf47449b7db46ced66a59ffe15a` |
| 4 | `analyze_web_bundle` + `inspect_analysis_view` | Analyzed 46 retained JS chunks (`45` complete, `1` unavailable `framework-fee8a7e75612eda8.js`); extracted 74 static route/endpoint string candidates (`211` occurrences). | `ev_1dc77cbcbcb2c41259a42a427276fb24aad86410276ffa1009d9f7be6e3b92c7` / `ev_cf679c41eb6197ca02b716eacdc752468a9bc323e27a53bc72f18f2fb1ff2288` |
| 5 | `export_web_scripts` | Exported 46 captured scripts and digest-verified `manifest.json`. | `ev_4635258668499ca1fe6fb26d31c8a16faeb07b8df08f0f35624f96b297335960` |
| 6 | `capture_browser_scenario` (28+ runs) | Verified live navigation, desktop (`1280x720`) & mobile (`390x844`) responsive behavior, interactive UI controls, auth boundaries, PRO gates, loading/error/404 states across 45 routes/URLs. | Individual `ev_*` IDs cited per route |

---

## 3. Public Learning Categories & Content Overview

Based on direct page observations across `/`, `/topics`, `/dictation`, `/shadowing`, `/vocabulary`, `/grammar`, `/practice-english-speaking`, `/exams/ielts`, `/exams/toeic`, `/games`, `/stories`, and `/shorts`:

1. **Listening & Pronunciation (`Dictation` & `Shadowing`)**:
   - Real-world YouTube/audio clips organized by level (`Beginner` / `Advanced` toggle; CEFR tags `A1`–`C2`) and 25+ hashtag categories (`#movie`, `#daily`, `#learning`, `#shadowing`, `#ielts`, `#entertainment`, `#kids`, `#songs`, `#toeic`, `#voa`, `#bbc`, `#toefl`, `#science`, `#fairy-tale`, `#podcast`, `#ipa`, `#food`, `#tutorial`, `#news`, `#vietnam`, `#ted`, `#travel`, `#animals`, `#story`, `#business`, plus `More`).
   - Example category observed: `Movie short clip (157 lessons)` (`ev_e7406c1fac39de6df8cef364bcd9ee1bb4046b80986235e54ab844a8c7de3ba6`).
   - Mix of free lessons (fully interactive dictation player without login) and `PRO` lessons (`ev_bf3a3c3e8c37c1389d45ed0eac66e341e82ddbb9ddc1fa1387f6abd09e04d432`, `ev_87e6cc2275dda71b25029a54b450d5a5b9cb990f268a0a63468f905c13b33a6a`).
2. **Vocabulary & Spaced Repetition (`/vocabulary`)**:
   - Curated & community vocabulary decks (e.g., `600 Basic IELTS Vocabulary`, `IELTS Band 4-5 Vocabulary`, `600 Essential Words for the TOEIC`) plus `PRO` decks (`IELTS Band 6-7 Vocabulary`, `IELTS Band 8-9 Vocabulary`, `ETS TOEIC Vocabulary`, `Common TOEIC Idioms`).
   - Public pages display a 24-word preview table for free decks, while flashcard study and spaced-repetition review (`/review`) require login (`ev_ab4119e816060ee9e9f16070058b093cf38a7beec06cb3cd49bd421dd03aafd7`, `ev_32070082b86a94057828e407349c777abea31cd2b9faccedb01cfa4c611e97d4`).
3. **English Grammar (`/grammar`)**:
   - Structured A1–C2 syllabus with interactive lessons (audio examples, explanations, structures) accessible publicly (`ev_a8b0559cbb28098e8012e27a12df8028d82c66550033bdc8cc5156027e776901`, `ev_50fb38ef50ff4bbe0afa1d125d96239def8a49b42f63c3ad75a41e53717c55ff`).
4. **English through Stories (`/stories`)**:
   - Graded classic and original tales (`Brothers Grimm`, `H. C. Andersen`, `Aesop's Fables`, `Charles Perrault`, `Parroto Originals`) across `A1`–`C2` with `Listen & read` / `Read only` modes and inline vocabulary highlights (`ev_7eadb7ead3791439fe974ffe88e6482ff17b1f53bb98324a52907accac3bbd7f`, `ev_7400c07565be5656bf2324ef63adc261c40dea66fd57fb6a3059a7197fbcb0ab`).
5. **IELTS & TOEIC Mock Exams (`/exams/ielts`, `/exams/toeic`)**:
   - Full-length IELTS Listening & Reading sets (`Parroto IELTS 2026`, `Parroto IELTS 2025` — 20 tests each) and TOEIC Listening & Reading sets (`Parroto TOEIC Practice Vol. 1`, `TOEIC 2026`, `TOEIC 2024`, `TOEIC 2023` — 10 tests each). Browsing exam structure and comments is public; clicking `Start Exam` triggers the login modal (`ev_f064a605f24b055ef731d2d89abbc883c1835d694a4f4684ea9516de53bef5ad`, `ev_ccbd1b372ab96c9602e7d38f947642d1d416b8ab221c8273c27c2cd0c4794f47`, `ev_ff319840f3f63f374f8d48466d5e598e111fd6b372af2ea525fe5240df03334d`).
6. **Vocabulary Games & PvP (`/games`, `/vocab-battle`)**:
   - 11 vocabulary games listed on `/games` (e.g., `Vocab Battle` PvP, `Word Shooter`, `Word Rain`, `Spelling Bee`, `Fruit Toss`, `Sky Runner`, `Bridge Builder`). Single-player game pages load publicly; `Vocab Battle` matchmaking requires login (`ev_203d2b21e3fe17494e648968f1e931473ce195dfcc384e6358d0be45781d21f3`, `ev_6df3a4e49dbe4df3e8059dca6959a1e64fb76be87853dbec1d8f76b8b159807c`).
7. **Community Speaking & Social (`/practice-english-speaking`, `/community`, `/chat`, `/leaderboard`, `/feedbacks`, `/shorts`)**:
   - Public read access to `Community` forum, `Community Chat` stream, `Monthly Leaderboard`, `Community Message` feedback list, and `Shorts` vertical feed; interactive voice rooms, posting, and personalized stats require authentication.
8. **Blog & Information (`/blog`, `/about-us`, `/about-us/advisors`, `/authors`, `/pricing`, `/contact-us`, `/privacy-policy`, `/terms-of-service`)**:
   - Publicly accessible editorial, team/advisor profiles, legal policies, and plan comparison pages.

---

## 4. Verified Facts vs. Assumptions & Limitations

- **Verified**: All 45 directly visited URLs/routes, their rendered headings/components, auth modals, PRO paywalls, and desktop/mobile layouts are directly backed by `capture_browser_scenario` and `inspect_web_page` Evidence IDs.
- **Unverified Static Candidates (Assumptions / Separate API Paths)**: `analyze_web_bundle` extracted 74 static path strings from loaded JS chunks (`ev_cf679c41eb6197ca02b716eacdc752468a9bc323e27a53bc72f18f2fb1ff2288`). Several appear to be backend REST API path fragments rather than user-facing browser routes (e.g., `/affiliate/commissions`, `/exams/published/sets`, `/grammar/progress/batch/`, `/shop/items/purchased/by-type`, `/vocabulary/enc/public/by-slug/`). They are explicitly listed separately as unverified static candidates in `page-inventory.md` and were not invented as confirmed pages.
- **Unauthenticated Scope**: Per investigation rules, no login credentials were used and no access restrictions were bypassed; authenticated-only views behind `/login`, `/dashboard` personalized data, `/profile`, `/affiliate`, `/my-notes`, `/my-vocabulary`, `/review`, and `/exams/sessions/*` remain uninspected beyond their public shell / auth boundary.
