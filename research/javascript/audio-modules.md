# Parroto Audio, Speech & Media Modules

**Target**: `https://parroto.app/` (and same-origin lesson/speaking chunks)  
**Evidence References**:
- `ev_4635258668499ca1fe6fb26d31c8a16faeb07b8df08f0f35624f96b297335960` (`export_web_scripts` from `/`)
- `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f` & `steps/313` (dictation lesson runtime + exported scripts)
- `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371` & `steps/342` (shadowing lesson runtime + exported scripts)

---

## 1. Audio & Speech Architecture Overview

Parroto implements a **hybrid client-side speech recognition + IPA phonetic scoring + multi-transport media playback** pipeline in the browser, backed by encrypted/API submission endpoints for lesson grading.

| Capability | Library / Browser API | Chunk Location | Confidence & Evidence Type |
| :--- | :--- | :--- | :--- |
| **Microphone Capture** | `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder` (`Blob(..., { type: "audio/mp3" })`, `URL.createObjectURL`) | `2260-8606587551610c04.js` (module `85957`, `useSpeechToText`) | Observed (Static in Shadowing bundle) |
| **Client-Side Speech-to-Text (ASR)** | `@xenova/transformers` (`pipeline("automatic-speech-recognition", ...)`) running **`Xenova/whisper-tiny.en`** or **`Xenova/whisper-base.en`** (ONNX quantized models) | `4edc0919-d55dcbafd0fe3126.js` (`WhisperTokenizer`, `decode_asr`), `2260-8606587551610c04.js` (`useWhisperModel`) | Observed (Static + **Runtime** HTTP fetches to `huggingface.co/Xenova/whisper-base.en` after `/models/...` 404 in `ev_0b6d4927...` & `ev_ee5f8906...`) |
| **ONNX Runtime** | `ort.*` references | `2660-41d7304a948cdf63.js` | Observed (Static) |
| **IPA Phonemization & Articulatory Scoring** | `phonemize` (dynamically imported via `a.e(5468)`, `a.e(864)`, `a.e(9850)`) + custom IPA feature table (`lookupPhoneme`, `phonemicEditDistance`, `compareWords`) | `307-dab1b7ab94ce73b7.js` (modules `70225`, `80307`), `2260-8606587551610c04.js` (module `97398`) | Observed (Static) |
| **YouTube Video Playback** | `window.YT.Player` via `//www.youtube.com/iframe_api` | `3913-5640c94532bb9bfa.js` | Observed (Static) |
| **HTML5 Audio/Video & SFX Cache** | `<video>`/`<audio>` element ref wrapper + `new Audio(src)` (`volume = 0.7`, `currentTime = 0`, `play()`, `playbackRate`) | `5385-7aaddadba7a78fea.js` (`SpeedSelector`, media wrapper) | Observed (Static) |
| **Word / Dictionary Pronunciation Audio** | `new Audio(url).play()` | `5615-fc5d6acc47af4adf.js`, `6974-0a132f4da287f64b.js`, `7963-72e37807b81c48fb.js` | Observed (Static) |
| **Grading / Submission APIs** | `POST /sentences/submit`, `POST /sentences/submit-shadowing`, `POST sentences/review/submit-shadowing` | `_app-7c4028110a8b19a9.js` (`gradeSentence`, `gradeShadowingSentence`) | Observed (Static) |

---

## 2. Detailed Technical Findings

### A. Client-Side Microphone & Whisper ASR (`2260-8606587551610c04.js`, `4edc0919-d55dcbafd0fe3126.js`)
1. **Model Selection & Loading**:
   - `useWhisperModel` calls `@xenova/transformers` (`pipeline("automatic-speech-recognition", modelId)`), selecting `"Xenova/whisper-tiny.en"` when device-capability flags `(0, i.Dt)() || (0, i.gn)()` evaluate true (e.g., constrained/mobile devices), and `"Xenova/whisper-base.en"` otherwise.
   - At runtime (`ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f` and `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371`), the browser first checks `https://parroto.app/models/Xenova/whisper-base.en/*` (`404`), then falls back to `https://huggingface.co/Xenova/whisper-base.en/resolve/main/*` (`307` → `200` resolved cache).
2. **Recording & Transcription Lifecycle (`useSpeechToText`)**:
   - Requests microphone access via `navigator.mediaDevices.getUserMedia({ audio: true })` (maps failure to `"permissionError"`).
   - Captures audio chunks with `MediaRecorder`, packages them into `new Blob(chunks, { type: "audio/mp3" })`, creates an object URL, and passes it to the Whisper pipeline with `{ task: "transcribe", chunk_length_s: 30 }`.
   - Supports keyboard shortcut `shift+backquote` to toggle recording (`"idle"` → `"recording"` → `"transcribing"` → `"idle"`).

### B. Client-Side IPA Phonetic Comparison (`307-dab1b7ab94ce73b7.js`, `2260-8606587551610c04.js`)
- `307-dab1b7ab94ce73b7.js` implements:
  - **Text normalization** (`normalizeSentenceForPhonetics`): expands contractions (`won't` → `will not`), units (`km`, `mph`), currency symbols, weekdays, timezones, and strips filler words (`hmm`, `uh`, `um`, `ah`, `er`).
  - **Lazy phonemizer loading** (`preloadPhonetics`): dynamically fetches chunks `5468`, `864`, and `9850` (`module 69850` `toIPA`) with an in-memory `Map` cache.
  - **Articulatory Feature Edit Distance (`phonemicEditDistance`)**: Scores vowel substitution using `height`, `backness`, `rounded`, and `rhotic` features; scores consonant substitution using `place`, `manner`, and `voiced` features; assigns custom indel costs (`ə: 0.4`, `ɚ: 0.5`, `ʔ: 0.3`, `ɫ: 0.5`, `h: 0.6`).
- `compareWords` (`2260`, module `97398`) aligns expected vs. Whisper-transcribed words (including `merge1toN` and `mergeNto1` up to 5 tokens) and labels each word `"correct"`, `"similar"` (distance `<= 0.34`, with `vowel_off` / `consonant_slip` hints), `"missing"`, or `"extra"`.

### C. Playback & Sound Effects (`3913`, `5385`, `5615`)
- **Video/Audio Lessons**: Uses `window.YT.Player` (`3913-5640c94532bb9bfa.js`) for YouTube-sourced lessons and HTML5 media bindings (`5385-7aaddadba7a78fea.js`) for direct audio/video, providing unified `playVideo()`, `seekTo()`, `setVolume()`, and `setPlaybackRate()` (`SpeedSelector`) controls.
- **UI Sound Effects & Word Audio**: Both `5385` (cached `Map` of `new Audio(l[e])` at `volume = 0.7`) and `5615` / `6974` / `7963` (`new Audio(url).play()`) use standard `HTMLAudioElement` playback.

---

## 3. Coverage Limitations & Unobserved Audio Areas

- **Unobserved Authenticated Voice Chat (`/practice-english-speaking`)**: The public `/practice-english-speaking` chunk (`practice-english-speaking-4f5de74a05cee57d.js`) only renders the lobby UI and `"Please log in to use Voice Chat."` gate. No `RTCPeerConnection` or WebRTC/LiveKit/Agora signaling code was present in the 46 homepage chunks or unauthenticated lesson chunks; real-time voice-room transport libraries (if dynamically imported after login) remain **unobserved (`unknown`)**.
- **Web Speech API Absence**: Neither `SpeechRecognition` / `webkitSpeechRecognition` nor `window.speechSynthesis` appeared in any inspected chunk; Parroto relies on `MediaRecorder` + Transformers.js Whisper (`Xenova/whisper-*`) for speech recognition and pre-hosted audio/MP3 URLs (`HTMLAudioElement`) for playback.
- **Server-Side Grading**: While `gradeSentence` and `gradeShadowingSentence` post encrypted payloads (`o.$`) to `/sentences/submit` and `/sentences/submit-shadowing`, server-side scoring rules are outside client visibility.
