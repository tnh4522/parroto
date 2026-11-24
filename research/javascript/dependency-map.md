# Parroto Frontend Dependency & Module Map

**Target**: `https://parroto.app/`  
**Evidence References**:
- `ev_4635258668499ca1fe6fb26d31c8a16faeb07b8df08f0f35624f96b297335960` (46 scripts from `/`)
- `steps/313` & `steps/342` (exported scripts from dictation & shadowing lesson pages)
- `ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c` & `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f` (runtime network captures)
- `ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1` (storage & DOM inspection)

---

## 1. Core Framework, Language & State Libraries

| Dependency / Library | Evidence Location (Chunk / Runtime) | Confidence | Role in Application |
| :--- | :--- | :--- | :--- |
| **Next.js (Pages Router)** | `main-0f4aa6f53e4508ff.js`, `webpack-d140553eb18671df.js`, `_buildManifest.js`, `_ssgManifest.js` | Observed (Static + Runtime) | SSR/SSG routing, `next/router`, `_next/data` JSON prefetching, i18n rewrites (17 locales). |
| **React / `react-dom`** | `framework-fee8a7e75612eda8.js` (module `67294`) | Observed (Static + Runtime) | Component rendering & hooks (`ev_f125b2014834abf44f3c5e72b72b6290308b18fcac856ed6dbec2ec40dd5a7e9`). |
| **`next-i18next` / `i18next` / `react-i18next`** | `_app-7c4028110a8b19a9.js` (`appWithTranslation`) | Observed (Static) | Multi-language UI localization (17 languages observed in runtime UI). |
| **Immer** | `1394-dfac6f36c0d7180f.js` (`Symbol.for("immer-nothing")`) | Observed (Static) | Immutable state updates in lesson/editor flows. |
| **SWR** | `_app-7c4028110a8b19a9.js` (`"paddle-prices"` SWR hook with `revalidateOnFocus: !1`) | Observed (Static) | Data fetching & cache revalidation. |
| **Axios** | `_app-7c4028110a8b19a9.js` (`AxiosHeaders`, `this.api = a.Z.create({baseURL: "https://api.parroto.app/api", timeout: 3e4})`) | Observed (Static + Runtime) | Primary HTTP client with Bearer token injection, 401 token-refresh queue, and JWE/AES-GCM payload decryption. |
| **Zod** | `_app-7c4028110a8b19a9.js` | Observed (Static) | Schema validation. |

---

## 2. Authentication, Security & Cryptography

| Dependency / Module | Evidence Location | Confidence | Role & Observable Details |
| :--- | :--- | :--- | :--- |
| **Firebase JS SDK** (`@firebase/app`, `@firebase/auth`, plus bundled `@firebase/*` modules in `_app`) | `_app-7c4028110a8b19a9.js`; IndexedDB `firebaseLocalStorageDb` & `firebase-heartbeat-database` (`ev_7a1e7660783ab55108f78dea50b311774befc6c7e49719b526dc00e6cc1622b1`) | Observed (Static + Runtime Storage) | Authentication providers: `GoogleAuthProvider`, `OAuthProvider` (Apple), `FacebookAuthProvider`, `sendSignInLinkToEmail` / `signInWithEmailLink`, `signInWithPopup`, `onAuthStateChanged`, `getIdToken`. |
| **`jose` + Web Crypto (`crypto.subtle`)** | `_app-7c4028110a8b19a9.js` (`JOSEError`, `JWEDecryptionFailed`, `AES-GCM`, `HMAC SHA-256`) | Observed (Static) | Decrypts encrypted API responses (`e.data.encrypted === !0 && e.data.data`) and signs/encodes request payloads (`(0, o.$)(e)` in `/sentences/submit`, `/sentences/submit-shadowing`). |
| **Google reCAPTCHA v2** | Chrome target iframe `https://www.google.com/recaptcha/api2/aframe` (`task` step 30); `grecaptcha`/`recaptcha` refs in `_app-7c4028110a8b19a9.js` | Observed (Static + Runtime) | Bot/abuse protection on auth/protected flows. |

---

## 3. UI, Styling & Animation Libraries

| Dependency / Library | Evidence Location | Confidence | Role |
| :--- | :--- | :--- | :--- |
| **Tailwind CSS** | `/_next/static/css/a39a06b1590f397c.css`, class names across `_app` & page chunks | Observed (Static + Runtime) | Utility styling with custom tokens (`rounded-duo`, `shadow-duo-sm`, `sm+:`). |
| **`@radix-ui` Primitives** | `5374-0cc2ed3bb5c95890.js`, `2660-41d7304a948cdf63.js`, `470-d5d834a042ca0541.js`, `_app-7c4028110a8b19a9.js` | Observed (Static) | Accessible dialogs, dropdown menus, checkboxes, focus scopes, popovers. |
| **`lucide-react`** | `_app-7c4028110a8b19a9.js`, `9392-e4b06fb7223c3b34.js`, `6472-38287347e01c51f0.js`, `practice-english-speaking-4f5de74a05cee57d.js` | Observed (Static) | Vector icon components (`ArrowLeft`, `Volume2`, `GripVertical`, `CircleAlert`, etc.). |
| **`classnames` & `clsx`** | `1637.79c31f3048ff8c09.js` (`Jed Watson` MIT banner), `_app-7c4028110a8b19a9.js` | Observed (Static) | Conditional CSS class merging (`cn` helper). |
| **`@lottiefiles/toolkit-js` / Lottie** | `_app-7c4028110a8b19a9.js`, `7868-43cb24d6f649ac49.js`, `4653-c05b7b55e7de1656.js`, `8433-a492ea69acf4e208.js` | Observed (Static) | Vector animations. |
| **`@rive-app/canvas@2.32.0`** | Runtime fetch `https://unpkg.com/@rive-app/canvas@2.32.0/rive.wasm` (`ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f`); `rive` refs in `_app` | Observed (Static + Runtime) | Interactive Rive canvas mascot/feedback animations. |
| **Toast Notifications** | `2355-bf15048847443db8.js` (`ToastProvider`) | Observed (Static) | Global toast queue in `Notifications (F8)` region. |

---

## 4. Speech, Audio, Media & NLP Libraries

| Dependency / Library | Evidence Location | Confidence | Role |
| :--- | :--- | :--- | :--- |
| **`@xenova/transformers` (Transformers.js + ONNX)** | `4edc0919-d55dcbafd0fe3126.js` (`WhisperTokenizer`, `https://github.com/xenova/transformers.js`), `2260-8606587551610c04.js`, runtime requests to `huggingface.co/Xenova/whisper-base.en` (`ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f`) | Observed (Static + Runtime) | Client-side speech-to-text (`Xenova/whisper-tiny.en` / `Xenova/whisper-base.en`) for shadowing/voice input. |
| **`phonemize` + Custom IPA Engine** | `307-dab1b7ab94ce73b7.js` + dynamic chunks `5468`, `864`, `9850` + `2260-8606587551610c04.js` (`compareWords`) | Observed (Static) | Converts words to IPA and computes articulatory phonemic edit distance for pronunciation feedback. |
| **YouTube IFrame Player (`youtube-player` / `react-youtube`)** | `3913-5640c94532bb9bfa.js` (`window.YT.Player`, `//www.youtube.com/iframe_api`) | Observed (Static) | Video lesson playback, seek, volume, and playback-rate events. |
| **`compromise` NLP** | `9392-e4b06fb7223c3b34.js` (`lexicon`, `preTagger`, `chunker`, `ProperNoun`, `Acronym`) | Observed (Static) | Client-side English tokenization/POS tagging. |

---

## 5. Billing, Analytics & Advertising

| Service / SDK | Evidence Location | Confidence | Role |
| :--- | :--- | :--- | :--- |
| **Paddle Billing v2 & ProfitWell** | `_app-7c4028110a8b19a9.js` (`paddle.js`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`); runtime fetches `cdn.paddle.com/paddle/v2/paddle.js` & `public.profitwell.com/js/profitwell.js` (`ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f`) | Observed (Static + Runtime) | International card checkout & subscription metrics. |
| **SePay (Domestic Bank QR)** | `_app-7c4028110a8b19a9.js` (`/webhooks/sepay/generate-code`, `/webhooks/sepay/payment-status`, `https://qr.sepay.vn/img?acc=933618618&bank=MBBank...`) | Observed (Static) | Vietnamese domestic bank transfer checkout (`Domestic Banking` tab). |
| **Amplitude Analytics** | `_app-7c4028110a8b19a9.js` (`amplitude`) | Observed (Static) | Product analytics. |
| **Google Analytics (`gtag`) & Google AdSense** | Runtime fetches `googletagmanager.com/gtag/js?id=G-XT7YM63MNV` and `googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8370399241480974` (`ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c`) | Observed (Static + Runtime) | Traffic analytics & display ads (disabled for Premium per `/pricing`). |
| **Cloudflare Web Analytics** | Runtime `static.cloudflareinsights.com/beacon.min.js` + `POST /cdn-cgi/rum?` (`ev_d70629d2c51d537ea29e7cfb0000c21a2efecd89b62243928706855c0eac1d2c`) | Observed (Runtime) | Real User Monitoring (RUM). |

---

## 6. Feature-to-Module Mapping Summary

| User-Facing Feature | Primary JS Chunks / Modules |
| :--- | :--- |
| Global Shell, Auth, Billing, Encryption | `pages/_app-7c4028110a8b19a9.js`, `8874` (Marketing Header/Footer), `7963` (App Sidebar), `2355` (Toasts) |
| Homepage (`/`) | `pages/index-6f4afc05d397fa22.js`, `6684`, `1934`, `1594`, `3288` |
| Topics, Dictation & Shadowing Browsers | `pages/topics-8eab54cdd5a6edc5.js`, `pages/dictation-5bd8446c3c4c540b.js`, `pages/shadowing-d0d09eb12a7e8226.js`, `6069`, `5968` |
| Dictation / Shadowing Lesson Players & AI Scoring | `pages/lessons/dictation/[lessonSlug]`, `pages/lessons/shadowing/[lessonSlug]`, `3913` (YouTube), `5385` (Media/SFX), `6472` (Split Pane), `4edc0919` (Transformers/Whisper), `2260` (`useSpeechToText`/`compareWords`), `307` (IPA Distance), `5277` (Comments) |
| Dictionary Lookup | `7963-72e37807b81c48fb.js`, `5615-fc5d6acc47af4adf.js` |
| Vocabulary & User Decks | `pages/vocabulary-0103bec48bb01aab.js`, `5554-67f09283b16fe43c.js`, `6974-0a132f4da287f64b.js` |
| Speaking Practice (1-on-1 Lobby) | `pages/practice-english-speaking-4f5de74a05cee57d.js` |
| IELTS / TOEIC Exams | `pages/exams/ielts-8c78eb4d13213b8d.js`, `8184-55d271d923284738.js`, `5554-67f09283b16fe43c.js` |
| Community, Chat, Feedback, Friends | `9009-431205ee31c8ff05.js`, `8506-9e16008f47955a81.js` |
| Gamification (Level, Streak, Wallet, Missions) | `3480-3c37c1ac30021006.js`, `7963-72e37807b81c48fb.js` |

---

## 7. Coverage Limitations

- **Minified Bundle Identification**: Without source maps, package identities are established from preserved runtime/error strings, copyright banners, webpack module names, and runtime CDN URLs (`@rive-app/canvas@2.32.0`, `paddle.js`, `Xenova/whisper-base.en`). Versions for internal npm packages without embedded version strings (e.g., exact React/Next/Axios minor versions) remain unconfirmed (`unknown`).
- **Authenticated Runtime Modules**: Any lazy-loaded chunks exclusively fetched after signing in (such as WebRTC/voice-room transport inside an active speaking room, if dynamically imported) were not observed under unauthenticated testing.
