# Parroto Script & Resource Inventory

**Target**: `https://parroto.app/` (and approved same-origin JavaScript resources observed on `parroto.app`)  
**Investigation Date**: 2026-11-24  
**Primary Evidence Sources**:
- **Static & Passive CDP Inspection (`https://parroto.app/`)**:
  - `ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1` (`inspect_web_page` on `/`)
  - `ev_e91159153b34407b1155375327160d8eac29e959b0cc65d5be4480caeae86342` (`inspect_web_page` with `include_script_sources: true`)
  - `ev_4635258668499ca1fe6fb26d31c8a16faeb07b8df08f0f35624f96b297335960` (`export_web_scripts`, 46 exported JS scripts from `/`)
  - `ev_1dc77cbcbcb2c41259a42a427276fb24aad86410276ffa1009d9f7be6e3b92c7` / `ev_cf679c41eb6197ca02b716eacdc752468a9bc323e27a53bc72f18f2fb1ff2288` (`analyze_web_bundle` on `/`)
  - `ev_c358b0d5443b536c6bac1785bbd89463e773ac82ba4069d0cc575b44e58491ba` / `ev_3277b1bf658d97077907a12de9fa2b5d047230c18dc61762d2a2b13364c49736` (`analyze_javascript_application` on 9 core/page chunks)
- **Runtime Execution & Network Captures**:
  - `ev_f125b2014834abf44f3c5e72b72b6290308b18fcac856ed6dbec2ec40dd5a7e9` (`observe_web_execution` on `/` — 2,000 ms V8 precise coverage window)
  - `ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c` (`capture_browser_scenario` network capture on `/topics`, 445 events)
  - `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f` (`capture_browser_scenario` network capture on `/lessons/dictation/first-class-upgrade-perks`, 540 events) + `steps/313` (`export_web_scripts`, 31 exported scripts incl. `_buildManifest.js`, `_ssgManifest.js`, `4edc0919`, `3913`, `5385`, `307`, `5615`)
  - `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371` (`capture_browser_scenario` network capture on `/lessons/shadowing/first-class-upgrade-perks`, 484 events) + `steps/342` (`export_web_scripts`, 32 exported scripts incl. `2260`, `5277`, `9260`)

---

## 1. Homepage (`https://parroto.app/`) Script & Resource Summary

### A. Passive Inspection Totals (`ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1`)
- **Same-origin script entries listed**: **49** (`46` Next.js chunk URLs + `/` inline document scripts + `_buildManifest.js` + `_ssgManifest.js`).
- **Exported same-origin scripts via `export_web_scripts`**: **46** (`ev_4635258668499ca1fe6fb26d31c8a16faeb07b8df08f0f35624f96b297335960`).
- **Excluded cross-origin / unattributed items in passive CDP capture** (policy-filtered to `https://parroto.app`):
  - `scripts`: `11` (`disallowed_origin`), `2` (`unattributed_origin`), `4` (`unsupported_url`)
  - `resources`: `32` (`disallowed_origin`), `1` (`unsupported_url`)
  - `metadata`: `54` (`disallowed_origin`), `7` (`unsupported_url`)
- **Same-origin resource entries retained**: **57** resources in `inspect_web_page` (`ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1`), plus CSS (`/_next/static/css/a39a06b1590f397c.css`), 7 WOFF2 fonts (`/_next/static/media/*.woff2`), and `/favicon/96x96.png` confirmed at runtime (`ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c`).
- **Source Map Declarations**: **0** (`source_map_url: null` on all 46 exported scripts, and `0` `//# sourceMappingURL=` directives inside exported JS bytes).

---

## 2. Complete Inventory of 46 Same-Origin JS Chunks Exported from `https://parroto.app/`

*Source: `ev_4635258668499ca1fe6fb26d31c8a16faeb07b8df08f0f35624f96b297335960` (`manifest.json`). Confidence: **Observed** (verified SHA-256 and byte sizes).*

| File / Chunk Path (under `/_next/static/chunks/`) | Bytes | SHA-256 (prefix) | Source Map | Primary Observed Role |
| :--- | ---: | :--- | :--- | :--- |
| `pages/_app-7c4028110a8b19a9.js` | 1,211,713 | `b4a20d64abc9` | None | App root shell, Axios API client, Firebase Auth/App, JWE/AES-GCM (`jose`), i18next, Amplitude, Paddle/SePay checkout UI, global providers |
| `9392-e4b06fb7223c3b34.js` | 362,350 | `5c97bc47970e` | None | `compromise` English NLP library + Lucide icons (`ArrowLeft`, `Volume2`, etc.) |
| `framework-fee8a7e75612eda8.js` | 141,044 | `304d105df6f6` | None | React / `react-dom` production runtime (`unavailable` in `analyze_web_bundle` due to AST/size guard, exported intact by `export_web_scripts`) |
| `main-0f4aa6f53e4508ff.js` | 133,945 | `23a1411503e2` | None | Next.js Pages Router client runtime (`next/router`, hydration, script/route loader) |
| `6974-0a132f4da287f64b.js` | 92,190 | `dbff2d265017` | None | User vocabulary decks/cards/groups API client & UI (`new Audio`) |
| `9103-a8bc09a4214c0bf4.js` | 88,187 | `41673da75bbb` | None | SVG / UI component bundle |
| `5374-0cc2ed3bb5c95890.js` | 84,824 | `70575d661fb4` | None | `@radix-ui` primitives (`FocusScope`, `CollectionProvider`) |
| `7868-43cb24d6f649ac49.js` | 78,977 | `5d185a99ad24` | None | Lottie animation runtime/assets |
| `4653-c05b7b55e7de1656.js` | 73,082 | `e28b500809d6` | None | Lottie animation runtime/assets |
| `8433-a492ea69acf4e208.js` | 57,694 | `6b66cecc8104` | None | Lottie animation runtime/assets |
| `9009-431205ee31c8ff05.js` | 51,991 | `511d2a96e94c` | None | Community chat, feedbacks, and post-reporting APIs/UI |
| `1637.79c31f3048ff8c09.js` | 49,380 | `c5c1f8b6aba5` | None | `classnames` + shared UI helpers |
| `pages/vocabulary-0103bec48bb01aab.js` | 45,710 | `04c9627b8c92` | None | `/vocabulary` page bundle |
| `pages/index-6f4afc05d397fa22.js` | 36,081 | `f7bb243f4afe` | None | `/` homepage bundle (prefetched / active on `/`) |
| `7963-72e37807b81c48fb.js` | 33,406 | `4d4ccfbbf38f` | None | App sidebar shell, Dictionary lookup, Daily Missions client (`new Audio`) |
| `3480-3c37c1ac30021006.js` | 31,582 | `86f668d84321` | None | Gamification client: Level, Streak, Check-in, Wallet, Freeze |
| `8184-55d271d923284738.js` | 31,393 | `76f2b5d920d3` | None | IELTS/TOEIC Exams service & UI components |
| `8874-7b57f02823aad1f8.js` | 29,562 | `bc203ff684f5` | None | Marketing Top Header & Global Footer navigation |
| `2355-bf15048847443db8.js` | 28,238 | `dbf8e2390b87` | None | Toast notification provider (`ToastProvider`) |
| `2660-41d7304a948cdf63.js` | 27,754 | `a0a7d7e5447b` | None | `@radix-ui` floating/positioning (`getBoundingClientRect`) |
| `2084-9b8f3bf972f6f34e.js` | 27,293 | `425fb4e8e9a6` | None | UI positioning / prop-types helper |
| `pages/practice-english-speaking-4f5de74a05cee57d.js` | 24,248 | `1da7413207c0` | None | `/practice-english-speaking` page bundle |
| `9382-fbff972019d7d0db.js` | 20,463 | `a4fb7c30076d` | None | Shared UI / lesson helpers |
| `5554-67f09283b16fe43c.js` | 20,156 | `2b146af23b8f` | None | Public Vocabulary, Exams, and Leaderboard API client |
| `3288.50b343afd6b55f89.js` | 19,583 | `adb35439bf24` | None | Branding/promo assets (`logo.png`) |
| `470-d5d834a042ca0541.js` | 16,531 | `462079bab3ad` | None | `@radix-ui` Checkbox provider |
| `6069-cf4376d08c21dfe7.js` | 16,222 | `c6b5b2414375` | None | Topic tag/slug filter components |
| `8936-3a34213d72055cff.js` | 14,870 | `a9e8fa812c61` | None | Language/locale avatar selector |
| `1934-4e2d0e4dc3adc811.js` | 13,893 | `44f131736162` | None | Mobile app / asset badge components |
| `6684-7cc117f9b15cc499.js` | 13,263 | `5d32a671c992` | None | Schema.org JSON-LD SEO metadata & App Store/Play badges |
| `7696-f225f2046893aad7.js` | 11,928 | `0f00bf3e1d0d` | None | Shared UI utilities |
| `9751-ceaf66ba5d7ae0ca.js` | 11,256 | `d25a703712a1` | None | Shared UI helpers |
| `896-d854acb62b505c33.js` | 10,901 | `6b7f35321604` | None | Shared UI / YouTube helpers |
| `9951-0438c4df723a4fcf.js` | 10,840 | `2e707419730b` | None | Head/favicon/SEO metadata |
| `541-f14e2d0b93f07708.js` | 9,570 | `c238eb1dcccf` | None | Shared UI helpers |
| `8506-9e16008f47955a81.js` | 9,527 | `c866288663ef` | None | Friends API client (`/friends/*`) |
| `webpack-d140553eb18671df.js` | 7,054 | `20d5bde57def` | None | Webpack runtime bootstrap (`self.webpackChunk_N_E`) + chunk/CSS manifest |
| `pages/topics-8eab54cdd5a6edc5.js` | 6,911 | `e83aee8039f1` | None | `/topics` page bundle |
| `9460-c7af310dc36b30fe.js` | 4,604 | `4ba8f1d7905d` | None | Shared UI helpers |
| `1594.980da426ab3ce945.js` | 4,359 | `9f85c7b7cafa` | None | App download banner component |
| `6197.4a604b8d99bc45fe.js` | 2,563 | `4b84c94adf7f` | None | Dynamic UI chunk |
| `1493.ffe151d17a98366b.js` | 1,155 | `d5591cd63b22` | None | Dynamic UI chunk |
| `pages/exams/ielts-8c78eb4d13213b8d.js` | 1,065 | `999fb345f0f5` | None | `/exams/ielts` thin page wrapper (prefetched) |
| `pages/dictation-5bd8446c3c4c540b.js` | 569 | `0d8227b55cfe` | None | `/dictation` thin page wrapper (prefetched) |
| `pages/shadowing-d0d09eb12a7e8226.js` | 569 | `f29da03808a5` | None | `/shadowing` thin page wrapper (prefetched) |

---

## 3. Additional Same-Origin Scripts Observed on Lesson Pages & Runtime Captures

*(Captured via `capture_browser_scenario` + `export_web_scripts` on `/lessons/dictation/first-class-upgrade-perks` and `/lessons/shadowing/first-class-upgrade-perks` — `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f`, `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371`)*

| Script / Manifest | Bytes | Evidence Reference | Observed Role |
| :--- | ---: | :--- | :--- |
| `/_next/static/hUvNpCe7E_Hr-Ai_sSmoX/_buildManifest.js` | 14,975 | `steps/313` / `steps/342` | Complete Next.js build manifest mapping 82 routes to chunk arrays |
| `/_next/static/hUvNpCe7E_Hr-Ai_sSmoX/_ssgManifest.js` | 1,833 | `steps/313` / `steps/342` | Complete set of 65 SSG routes |
| `4edc0919-d55dcbafd0fe3126.js` | 49,924 | `steps/313` / `steps/342` | `@xenova/transformers` (`WhisperTokenizer`, `decode_asr`) |
| `5385-7aaddadba7a78fea.js` | 38,078 | `steps/313` / `steps/342` | Media player wrapper (`SpeedSelector`, `playbackRate`, `new Audio` SFX cache) |
| `5968-04e1b12249a4f619.js` | 32,008 | `steps/313` / `steps/342` | Lesson API service (`/lessons/*`) |
| `6472-38287347e01c51f0.js` | 30,057 | `steps/313` / `steps/342` | Resizable split-pane dictation/shadowing workspace |
| `3913-5640c94532bb9bfa.js` | 18,534 | `steps/313` / `steps/342` | YouTube IFrame API wrapper (`YT.Player`) |
| `5277-56b17c8e461aa064.js` | 15,507 | `steps/342` | `CommentSection` component |
| `9260.d3494c8d34e5a12a.js` | 9,432 | `steps/342` | Dynamic UI widget |
| `307-dab1b7ab94ce73b7.js` | 9,001 | `steps/313` / `steps/342` | Articulatory IPA phoneme table, edit-distance scorer, `phonemize` chunk loader |
| `5615-fc5d6acc47af4adf.js` | 9,736 | `steps/313` / `steps/342` | Dictionary word audio player (`new Audio(e).play()`) |
| `1394-dfac6f36c0d7180f.js` | 8,784 | `steps/313` / `steps/342` | `immer` state helper |
| `2260-8606587551610c04.js` | 8,143 | `steps/342` | `useSpeechToText` (`getUserMedia`, `MediaRecorder`, `Xenova/whisper-*`) + `compareWords` |

---

## 4. Runtime Execution Coverage vs. Static Inventory (`observe_web_execution`)

- **Runtime Evidence** (`ev_f125b2014834abf44f3c5e72b72b6290308b18fcac856ed6dbec2ec40dd5a7e9`, 2,000 ms armed window on idle `https://parroto.app/`):
  - Only **3 scripts** recorded V8 function executions during the 2-second idle window:
    1. `framework-fee8a7e75612eda8.js` (`17/19` reported functions executed, `17/19` ranges)
    2. `pages/_app-7c4028110a8b19a9.js` (`10/11` reported functions executed — IndexedDB `DBPromise` / `_openDb` / `_poll`)
    3. Third-party AdSense `reactive_library.js` (`1/1` function executed)
  - The remaining preloaded/prefetched page chunks (`pages/topics`, `pages/dictation`, `pages/shadowing`, `pages/vocabulary`, `pages/practice-english-speaking`, `pages/exams/ielts`) had `0` function invocations during the idle homepage window.

---

## 5. Coverage Limitations & Confidence

- **Confidence**: **High / Observed** for all 46 homepage scripts, 32 shadowing/dictation scripts, `_buildManifest.js`, and runtime network traces.
- **Limitations**:
  - `analyze_web_bundle` marked `framework-fee8a7e75612eda8.js` as `unavailable` for route extraction (`45/46` parsed), though `export_web_scripts` exported its complete `141,044` bytes.
  - `analyze_javascript_application` timed out (>3 min) when asked to build full semantic ASTs across all 46 files simultaneously; bounded `source_paths` analysis succeeded on 9 core/page chunks (`ev_c358b0d5443b536c6bac1785bbd89463e773ac82ba4069d0cc575b44e58491ba`, with `max_semantic_nodes_per_file: 20000` ceiling reached on 1 large chunk).
  - Third-party origins (`googleads`, `googletagmanager`, `paddle`, `profitwell`, `huggingface`, `cloudflareinsights`) were excluded by origin policy during passive same-origin CDP inspection and observed via runtime network transactions only.
  - Additional lazy chunks (e.g. `31d4e3d1-c3f7373f76701d78.js`, `e2fde11a-70c14ec041a2cc54.js`, `79fd8960-2fbe2c777c681d7c.js`, and `phonemize` chunks `5468`, `864`, `9850`) were observed in network requests/references but their bytes were not retained in the bounded `capture_browser_scenario` response-content export.
