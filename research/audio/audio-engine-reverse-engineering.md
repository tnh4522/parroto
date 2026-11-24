# Parroto Audio Engine Reverse Engineering & Independent Architecture

**Target**: `https://parroto.app/`  
**Primary Runtime Evidence**:
- Dictation (`first-class-upgrade-perks`): `ev_0b6d49270985540f55205125e0008a77ae50401118c6bfab0c0e98484c18898f`, `ev_4ae88ff23a424f8ea0751233672c4adf3d68d3bf44aa2a9d259e7d64cfc6d54f`
- Shadowing (`first-class-upgrade-perks`): `ev_ee5f8906c47e9ee6d6f20f47717903905071fd67024597fa7a31bd57125d9371`, `ev_5f450bc17d9ed4c19fa576e17a2505d174366a8ba517f451b5a00b528357a0a1`
- Story Reader (`cinderella`): `ev_f807f230f0b81e52b238691d3b93357fc9af03f74428fb9e76b61c6d4cfa0ab6`
- Voice Chat Lobby (`/practice-english-speaking`): `ev_327c02ec17735661d062e8955cf84a2a0506593a5e31e51ca9eee32fcdcaccb6`

**Scope Disclaimer**: Findings come strictly from unauthenticated public runtime captures and same-origin client JavaScript bundles. Server-side grading logic (`/sentences/submit`, `/sentences/submit-shadowing`), authenticated Voice Chat real-time transport (`/practice-english-speaking`), and exam audio sessions (`/exams/{ielts,toeic}/session/*`) are unobservable without authentication and are explicitly marked as limitations.

---

## Part 1. Per-Operation Technical Breakdown (All 13 Scope Areas)

### 1. Audio / Video Playback

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Clicking `"Start"` on Dictation/Shadowing lesson, selecting `"Listen & read"` on Stories (`cinderella`), clicking a word's US/UK speaker button in Dictionary/Vocabulary tooltips, or answering correctly (UI SFX). |
| **Browser API / library** | **Polymorphic `Player` adapter** (`5385` -> `AudioPlayer`, `2142` -> `VideoPlayer`, `72705` -> `YoutubeVideoPlayer` wrapping `3913` / `window.YT.Player` via `//www.youtube.com/iframe_api`). Story reader (`StoryAudioBar`) renders a hidden native `<audio preload="metadata">`; Dictionary/Word cards and `useSound` (`5385 -> 87769`) use `new Audio(url)` (`HTMLAudioElement`). |
| **Input / output format** | Streaming MP3 via HTTP `206 Partial Content` (`lesson-*.mp3`, `audio-*.mp3`), MP4/HTML5 `<video playsInline>`, YouTube iframe streams, and cached UI SFX MP3s (`correct.mp3`, `complete.mp3`, `notice.mp3`) at `volume = 0.7`. |
| **Timing & sync** | Adapts native `<audio>`/`<video>` (`currentTime` in seconds, `playbackRate`) and YouTube `getCurrentTime()` into one ref contract (`{ playVideo, pauseVideo, seekTo, getCurrentTime, getDuration, setPlaybackRate, playerInfo }`). |
| **Network dependencies** | `https://assets.parroto.app/assets/{lessons,stories}/.../*.mp3` (`GET 206` observed at runtime in `ev_4ae8...`, `ev_5f45...`, `ev_f807...`); `https://assets.parroto.app/sounds/*.mp3`; `https://www.youtube.com/iframe_api` (`3913`). |
| **Error & permission states** | `.play().catch(...)` catches autoplay-policy blocks cleanly (`console.warn` / `console.error`); `!playerReady` shows centered spinner/play overlay; `YoutubeVideoPlayer` unmounts cleanly via try/catch around `pauseVideo()`. |
| **Frontend modules** | `5385-7aaddadba7a78fea.js` (`15175`, `2142`, `72705`, `87769`), `3913-5640c94532bb9bfa.js`, `pages/lessons/dictation/[lessonSlug]-01fe17e6d24da86f.js`, `pages/lessons/shadowing/[lessonSlug]-7c8d157924f8ffda.js`, `pages/stories/[slug]-c7207fa305da9b42.js`, `5615-fc5d6acc47af4adf.js`. |
| **Evidence & confidence** | **High** (Runtime HTTP `206` MP3 fetches in `ev_4ae8...`, `ev_5f45...`, `ev_f807...` + static adapter source). |

---

### 2. Play / Pause

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Clicking `"Start"`, `"Play"`, `"Pause"` button; pressing `Tab` shortcut (`enableOnFormTags: true` in Dictation); clicking Story central play button; tapping native `<audio controls>`/`<video controls>`. |
| **Browser API / library** | Calls `playerRef.current.playVideo()` / `pauseVideo()`, backed by `HTMLMediaElement.play()` / `.pause()` or `YT.Player.playVideo()` / `pauseVideo()`. Keyboard bindings via hotkey hook (`20927`). |
| **Input / output format** | Control signal only; media state reflected via native `onPlay`/`onPause` events and YouTube `onStateChange` (`1` = playing, `2`/`0` = paused/ended). |
| **Timing & sync** | Smart resume logic in `handlePlayPause` (`Dictation`, `Shadowing`): when resuming (`!isPlaying`), checks `1000 * getCurrentTime() < segment.end_ms`; if true, resumes current segment, else calls `playSegment(segments[activeIndex + 1])`. |
| **Network dependencies** |Triggers buffered HTTP `206` range requests if media isn't buffered yet. |
| **Error & permission states** | Guards execution on `playerReady && playerRef.current`; catches promise rejections from browser autoplay restrictions (`StoryAudioBar`: `e.play().catch(()=>{})`). |
| **Frontend modules** | `pages/lessons/dictation/[lessonSlug]` (`LessonProvider`), `pages/lessons/shadowing/[lessonSlug]` (`ShadowingProvider`), `pages/stories/[slug]` (`StoryAudioBar`), `5385` (`AudioPlayer`, `VideoPlayer`, `YoutubeVideoPlayer`). |
| **Evidence & confidence** | **High** (Static source + runtime rendered `"Start"`, `"Play"`, `"Pause"` controls in `ev_4ae8...`, `ev_5f45...`, `ev_f807...`). |

---

### 3. Replay

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Clicking `"Replay"` control button or pressing configurable `replayShortcut` (default `"backquote"` / `` ` `` in settings `pages/_app`). |
| **Browser API / library** | `playerRef.current.seekTo(segment.start_ms / 1000, true)` -> sets `HTMLMediaElement.currentTime` or calls `YT.Player.seekTo(sec, true)` followed by `playVideo()`. |
| **Input / output format** | Seek timestamp in floating-point seconds derived from millisecond segment boundary (`start_ms / 1000`). |
| **Timing & sync** | Re-arms `Auto Stop` end-guard timer/rAF loop on `onPlay` and increments `segmentState[activeIndex].playCount` via `increaseReplayCount(timeMs)` whenever playback crosses `[start_ms, start_ms + 1000)` (or segment `0`). `replay_count` (`playCount - 1`) is tracked for submission metrics. |
| **Network dependencies** | Browser range seek (`206`) only if target byte offset is evicted/unbuffered; no API call on replay click itself. |
| **Error & permission states** | No-ops safely if `!playerRef.current` or `!segments[activeIndex]`. |
| **Frontend modules** | `Dictation` (`@39291`, `handleReplay`, `increaseReplayCount @40554`), `Shadowing` (`handleReplay`), `pages/_app` (default `replayShortcut: "backquote"`). |
| **Evidence & confidence** | **High** (Static source + runtime `"Replay"` controls visible in `ev_4ae8...`). |

---

### 4. Playback Speed

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Clicking `"1x"` speed button (`SpeedSelector` popover grid) in Dictation/Shadowing/Stories, or Watch-mode cycle button (`eI.find(rate => rate > currentRate)`). |
| **Browser API / library** | `playerRef.current.setPlaybackRate(rate)` -> mutates `HTMLMediaElement.playbackRate` or `YT.Player.setPlaybackRate(rate)`. Reads back changes via `onRateChange` / `onPlaybackRateChange`. |
| **Input / output format** | Discrete preset scale defined in `pages/_app` (`s.NW`): `0.25x`, `0.5x`, `0.75x`, `1x`, `1.25x`, `1.5x`, `1.75x`, `2x`. Browser pitch preservation relies on native media engine (`preservesPitch` default `true`). |
| **Timing & sync** | Changing playback speed dynamically scales segment auto-stop remaining wait: `remainingRealMs = (segment.end_ms - currentMs) / playbackRate` (`ShadowingProvider`, `Dictation`) so auto-stop continues landing accurately at `end_ms`. |
| **Network dependencies** | None (client-side only). |
| **Error & permission states** | Null-safe optional call `(playerRef.current?.setPlaybackRate) && setPlaybackRate(rate)`. Fallback display `"${rate}x"` if custom rate via native `<audio>` UI differs from presets. |
| **Frontend modules** | `5385 -> 1621` (`SpeedSelector`), `pages/_app` (`s.NW`), `Shadowing` (`eI`, `eR`), `Stories` (`StoryAudioBar`). |
| **Evidence & confidence** | **High** (Static source + runtime `"1x"` speed button in `ev_4ae8...`, `ev_5f45...`, `ev_f807...`). |

---

### 5. Segment Navigation

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Clicking `"Previous"` / `"Next"` buttons, pressing `previousShortcut` / `nextShortcut`, clicking any transcript row/sentence card, clicking Story `"back10"`/`"forward10"` (`±10000` ms) or scrubber `<input type="range" step="250">`, or `Auto Stop` disabled continuous advance. |
| **Browser API / library** | Calls `playSegment(targetSegment)`: `pauseVideo()` -> `setActiveIndex(target.id)` -> `seekTo(target.start_ms / 1000, true)` -> `playVideo()`. Story skip mutates `audio.currentTime = clamp(currentMs ± 10000, 0, durationMs) / 1000`. |
| **Input / output format** | Segment bounds `{ start_ms: number, end_ms: number, _id: string, text: string, words?: WordTiming[] }`. |
| **Timing & sync** | Clicking an active segment is a no-op (`if (segment.id === activeIndex) return`). Smooth-scrolls active card into container viewport (`scrollIntoView({ behavior: "smooth" })` or manual `scrollTop` delta on `mobile-segments-container`). Switching from `"watch"` to `"learn"` mode inspects current playback timestamp and optionally offers a `"resumeOfferIndex"` banner if the watched sentence differs from prior learn anchor. |
| **Network dependencies** | Triggers media range seek if unbuffered; switching segments clears `recentAudioUrl` in Shadowing (`clearRecentAudio()`). |
| **Error & permission states** | `"Previous"` disabled at `activeIndex === 0`; `"Next"` bounded at `segments.length - 1`; Story `-10s`/`+10s`/Play disabled until `playerReady`. |
| **Frontend modules** | `Dictation` (`playSegment`, `handleNextSegment`, `handlePrevSegment`), `Shadowing` (`ShadowingProvider`, `WatchControlBar`), `Stories` (`StoryAudioBar` `@11145`). |
| **Evidence & confidence** | **High** (Static source + runtime `"Previous" [disabled]` / `"Next"` controls in `ev_4ae8...`). |

---

### 6. Sentence Synchronization

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Automatic during media playback, active sentence auto-stop, Watch-mode caption tracking, and Story `"Listen & read"` playback. |
| **Browser API / library** | Three distinct client timing loops observed: (1) **Hybrid `setTimeout` + `requestAnimationFrame`** (`Dictation @66177`, `Shadowing @35800`), (2) **`setInterval(..., 300)`** (`5968 @20294` + `setInterval(..., 250)` in `WatchControlBar @36880` + `setInterval(..., 100)` in `YoutubeVideoPlayer` `72705`), (3) **Continuous `requestAnimationFrame`** (`Shadowing` word karaoke `@13155`, `Stories` active sentence `@4329`) + native `onTimeUpdate` in `StoryAudioBar`. |
| **Input / output format** | Millisecond timestamps (`start_ms`, `end_ms`) on `sentence_ids[]` and token `words[]` items. |
| **Timing & sync** | **Auto-Stop Guard**: Computes real wall-clock delay `(end_ms - currentMs) / playbackRate`. If `delay > 500` ms, sets `setTimeout(..., delay - 500)` before handing off to `requestAnimationFrame(checkTiming)` which pauses media when `end_ms - currentMs <= 50` ms (`tolerance = 50ms`). If `Auto Stop` is off, advances `setActiveIndex` to the next segment without pausing. |
| **Network dependencies** | None at runtime during playback (cues delivered encrypted inside initial lesson/story payload). |
| **Error & permission states** | All polling loops wrap `getCurrentTime()` in `try/catch` and cancel active `clearTimeout(window.segmentTimer)`, `cancelAnimationFrame(window.segmentAnimationFrame)`, and `clearInterval(...)` on unmount, pause, or mode switch. |
| **Frontend modules** | `pages/lessons/dictation/[lessonSlug]` (`@66177`), `pages/lessons/shadowing/[lessonSlug]` (`@13155`, `@35800`, `@36880`), `pages/stories/[slug]` (`@4329`, `@11500`), `5968-04e1b12249a4f619.js` (`@20294`), `5385` (`72705`). |
| **Evidence & confidence** | **High** (Exact `setTimeout(e-500)` + `requestAnimationFrame` `<= 50` ms logic observed in both Dictation and Shadowing bundles). |

---

### 7. Recording Lifecycle

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Clicking `"Record"` / `"Stop recording"` button in Shadowing bottom bar, or pressing `Shift + ` `` ` `` (`shift+backquote` hotkey, `enableOnFormTags: true, preventDefault: true`). |
| **Browser API / library** | `useSpeechToText` hook (`2260 -> 85957`): `navigator.mediaDevices.getUserMedia({ audio: true })` + `new MediaRecorder(stream)`. |
| **Input / output format** | State machine: `"idle"` -> `"recording"` -> `"transcribing"` -> `"idle"`. Collects binary `BlobEvent` chunks via `ondataavailable`. |
| **Timing & sync** | `onRecord` (`Shadowing @53170`) **explicitly pauses lesson media** (`playerRef.current?.pauseVideo()`) before invoking `startRecording()`. Stopping (`stopRecording` or hotkey) calls `recorder.stop()` and stops all `stream.getTracks()` immediately. Watch mode switches are blocked while `recorderBusyRef.current === true` (`"watchMode.finishRecordingFirst"`). |
| **Network dependencies** | None during capture itself; requires Whisper ASR model initialization beforehand (`!isModelReady` disables button with `"Loading model..."` spinner). |
| **Error & permission states** | Unmount/cleanup sets `cancelRef = true`, stops active `MediaRecorder` (`state !== "inactive"`), and releases mic tracks (`track.stop()`). Canceling mid-stream discards chunks and resets to `"idle"`. |
| **Frontend modules** | `2260-8606587551610c04.js` (`85957`, `useSpeechToText`), `5385` (`48600`, `SpeechToTextButton`), `pages/lessons/shadowing/[lessonSlug]` (`@53170`, `@55500`). |
| **Evidence & confidence** | **High** (Static source + runtime `"Start"` / Shadowing controls captured in `ev_5f45...`). |

---

### 8. Microphone Permissions

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Triggered **on demand** only when user clicks `"Record"` / presses `Shift + ` `` ` `` (never auto-prompted on page mount). |
| **Browser API / library** | `await navigator.mediaDevices.getUserMedia({ audio: true })` inside `try/catch` in `useSpeechToText`. |
| **Input / output format** | Audio-only `MediaStream` (`{ audio: true }`; no explicit sampleRate/echoCancellation constraints passed). |
| **Timing & sync** | Awaits OS/browser prompt asynchronously before entering `"recording"` state (`n.start(); l("recording")`). |
| **Network dependencies** | None. |
| **Error & permission states** | Any rejection (`NotAllowedError`, `NotFoundError`, insecure origin) sets `errorState = "permissionError"`. `Shadowing` watches `errorState` and fires a destructive toast (`speechToText.microphonePermissionRequired` + `microPhonePermissionDescription`), deduplicated via `lastErrorRef`; `SpeechToTextButton` (`5385`) also supports `ErrorPopoverContent`. |
| **Frontend modules** | `2260` (`85957`), `5385` (`48600`), `pages/lessons/shadowing/[lessonSlug]` (`@53300`). |
| **Evidence & confidence** | **High** (Verified directly in source). |

---

### 9. Audio Encoding

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Automatic inside `MediaRecorder.ondataavailable` and `MediaRecorder.onstop` when recording finishes. |
| **Browser API / library** | Browser-native `MediaRecorder(stream)` (no `mimeType` or `audioBitsPerSecond` options specified; defaults to browser codec, e.g., WebM/Opus on Chromium). On `onstop`, chunks are combined via `new Blob(chunks, { type: "audio/mp3" })` -> `URL.createObjectURL(blob)`. |
| **Input / output format** | Browser default container bytes labeled with Blob MIME `"audio/mp3"` and exposed as `blob:https://parroto.app/...` object URL. |
| **Timing & sync** | Chunks accumulate per browser timeslice (`e.data.size > 0`) until `stop()`, then assemble synchronously in memory. |
| **Network dependencies** | None. |
| **Error & permission states** | Non-empty check on `e.data.size > 0`; if cancelled (`cancelRef.current`), Blob creation and transcription are skipped. *(Note: Labelling non-MP3 MediaRecorder bytes as `audio/mp3` relies on browser `<audio>` and Web Audio `decodeAudioData` sniffing.)* |
| **Frontend modules** | `2260-8606587551610c04.js` (`85957 -> onstop`). |
| **Evidence & confidence** | **High** (Observed verbatim in `2260`: `new Blob(m.current, { type: "audio/mp3" })`). |

---

### 10. Playback of User Recordings

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Clicking `"Play recorded audio"` icon button (`83268`) adjacent to `"Record"`, or pressing `Space` (`playRecordedAudioShortcut`, configurable in `5385`). |
| **Browser API / library** | `PlayRecordedVoice` (`83268`): creates `new Audio(recentAudioUrl)` (`HTMLAudioElement`), attaches `"ended"`, `"play"`, and `"pause"` event listeners. |
| **Input / output format** | Plays back `recentAudioUrl` (`blob:` URL from local `MediaRecorder` Blob). |
| **Timing & sync** | Toggles playing/paused icon state cleanly; pauses and disposes listener references when `recentAudioUrl` changes, segment changes (`clearRecentAudio()` runs on `activeIndex` change), or component unmounts. Previous object URL is freed via `URL.revokeObjectURL(recentAudioUrl)`. |
| **Network dependencies** | None (`blob:` memory URL only). |
| **Error & permission states** | Button `disabled` whenever `!recentAudioUrl`. `.play().catch(...)` logs `"Failed to play audio:"` without crashing UI. |
| **Frontend modules** | Module `83268` (`PlayRecordedVoice`, captured inside `steps/589`), `2260` (`clearRecentAudio`), `5385` (`playRecordedAudioShortcut`). |
| **Evidence & confidence** | **High** (`83268` source + runtime `"Play recorded audio"` button in `ev_5f45...`). |

---

### 11. Upload Behavior

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Passing a Shadowing segment (`score >= 80`), skipping a Shadowing segment, or passing a Dictation sentence (`answerCorrectness === "correct"`). |
| **Browser API / library** | Axios `POST` in `pages/_app` (`gradeSentence @298298`, `gradeShadowingSentence @298400`) encoding JSON payload via client encoder `o.$`. |
| **Input / output format** | **No raw audio Blob or WAV/MP3 upload occurs during Dictation or Shadowing.** Shadowing posts `{ data: encoded({ sentence_id, attempts: [{ accuracy }] }) }` to `POST /api/sentences/submit-shadowing`. Dictation posts `{ data: encoded({ mistakes, replay_count, sentence_id }) }` to `POST /api/sentences/submit`. *(Static note: `missions/shadowing/submit` in `7963` references `postWithFormData`, unused in lesson pages.)* |
| **Timing & sync** | Only triggered if `isAuthenticated === true` (`u && gradeSentence(...)`) when a sentence is completed (`accuracy >= 80` in Shadowing) or skipped. |
| **Network dependencies** | `https://api.parroto.app/api/sentences/submit` and `/sentences/submit-shadowing` (both auth-gated, not executed as guest). **Note on Voice Chat (`/practice-english-speaking`)**: Auth-gated lobby (`ev_327c...`) leaves real-time voice upload/WebRTC signaling unobserved (`unknown`). |
| **Error & permission states** | Unauthenticated guests after 5 attempts are nudged via `openEncourageLoginModal()` (`encourage_login_shown` cookie); network errors catch cleanly in `try/catch`. |
| **Frontend modules** | `pages/_app` (`@298298`), `Shadowing` (`@16800`), `Dictation` (`@39291`), `7963` (`missions`). |
| **Evidence & confidence** | **High** for local-only audio processing & JSON-only submission in lessons; **Unobserved (Auth-Gated)** for Voice Chat transport. |

---

### 12. Speech Recognition

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Model downloads **automatically on lesson mount** (`Dictation` & `Shadowing` `useEffect([])`); inference executes automatically on `MediaRecorder.onstop`. |
| **Browser API / library** | `@xenova/transformers` (`pipeline("automatic-speech-recognition", modelId)` in `2260`, `4edc0919-d55dcbafd0fe3126.js` `WhisperTokenizer`, `2660` ONNX Runtime `ort.*`). **No `SpeechRecognition` / `webkitSpeechRecognition` or `speechSynthesis` is used.** |
| **Input / output format** | **Model**: `"Xenova/whisper-tiny.en"` when mobile/low-spec checks `(i.Dt() || i.gn())` return true, else `"Xenova/whisper-base.en"` quantized ONNX encoder/decoder (`encoder_model_quantized.onnx`, `decoder_model_merged_quantized.onnx`). Passes `recentAudioUrl` with `{ task: "transcribe", chunk_length_s: 30 }`. |
| **Timing & sync** | Module-level singleton promises (`l`, `a` in `2260`) prevent duplicate downloads across re-mounts. During transcription (`state === "transcribing"`), input UI disables (`setIsInputDisabled(true)`) and spinner shows `"processing"`. |
| **Network dependencies** | **Verified Runtime (`ev_0b6d...`, `ev_ee5f...`, `ev_4ae8...`, `ev_5f45...`)**: Probes `https://parroto.app/models/Xenova/whisper-base.en/*` (`GET 404`) first, then fetches from `https://huggingface.co/Xenova/whisper-base.en/resolve/main/*` (`307` -> `200` `api/resolve-cache`). |
| **Error & permission states** | Post-processes `result.text` (`cleanText` strips regex markers `c.uV`, rejects `[BLANK_AUDIO]` / `[...]` via `isInvalidTranscription` or empty text -> `"transcriptionError"`). Model load failures set `"modelError"`. Errors surface via toast & popover. |
| **Frontend modules** | `2260-8606587551610c04.js`, `4edc0919-d55dcbafd0fe3126.js`, `2660-41d7304a948cdf63.js`. |
| **Evidence & confidence** | **High** (Runtime HTTP 404/307/200 fetches + verbatim source). |

---

### 13. Pronunciation Feedback

| Dimension | Observed Implementation |
| :--- | :--- |
| **Triggering UI action** | Automatically runs inside `onTranscriptUpdate` after Whisper transcription returns text (`ShadowingProvider -> handleCheckAnswer`), comparing transcript against `segments[activeIndex].text`. |
| **Browser API / library** | Pure JS/IPA pipeline: `phonemize` (lazy dynamic chunks `5468`, `864`, `9850`, cached in `Map`) + `307-dab1b7ab94ce73b7.js` (`normalizeSentenceForPhonetics`, `phonemicEditDistance`) + `2260` (`compareWords`) + `59338` (`calculateScore`, pass threshold `80`) + UI `PronunciationChip` (`11971`). |
| **Input / output format** | Takes `(recordedTranscript, expectedText)` -> expands contractions/numbers/units & strips fillers (`hmm, uh, um, ah, er`) -> converts to IPA -> outputs per-word result `{ word, status: "correct"\|"similar"\|"missing"\|"extra", similarity: 0..1, expectedIpa, recordedIpa, reason?: "vowel_off"\|"consonant_slip" }`. |
| **Timing & sync** | Runs synchronously in JS right after Whisper resolves (no extra backend round-trip required for visual feedback). Plays `correct.mp3` chime (`playCorrect()`) and submits `/sentences/submit-shadowing` if score `>= 80`. |
| **Network dependencies** | Lazy chunk fetches for `phonemize` dictionary (`5468`, `864`, `9850`) on first preload (`preloadPhonetics()`). |
| **Error & permission states** | Unknown words fall back to exact lowercase string equality (`0` or `1`). DP alignment supports `1-to-N` and `N-to-1` compound/split word merges up to 5 tokens. **Limitation**: Proprietary server-side aggregation inside `sentence_score` (returned by `POST /sentences/submit-shadowing`) is unobservable. |
| **Frontend modules** | `307-dab1b7ab94ce73b7.js`, `2260-8606587551610c04.js`, `59338` (in `5615`), `11971` (in captured `steps/589`), `pages/lessons/shadowing/[lessonSlug]`. |
| **Evidence & confidence** | **High** for client-side IPA alignment & UI feedback; **Unobserved** for server-side score persistence logic. |

---

## Part 2. Independent Browser-Native Audio Engine Architecture

The architecture below provides a clean, modular replacement built exclusively on standard Web APIs (`HTMLMediaElement`, `Web Audio API`, `MediaDevices`, `MediaRecorder`, `AudioWorklet`, Web Workers) without copying Parroto's minified glue or assuming inaccessible backend scoring/WebRTC internals.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UI Presentation & Hotkeys Layer                      │
│  Transport Controls · Speed Control · Transcript Sync · Mic Button · Chips  │
└───────────────┬─────────────────────────────────────────┬───────────────────┘
                │ Commands / State Snapshots              │ Capture Commands
                ▼                                         ▼
┌───────────────────────────────┐         ┌───────────────────────────────────┐
│   MediaTransportController    │         │       CapturePipelineEngine       │
│  Unified Adapter Interface:   │         │  - getUserMedia({ audio: {        │
│   · HTML5AudioAdapter (<audio>)│        │      echoCancellation: true,      │
│   · HTML5VideoAdapter (<video>)│        │      noiseSuppression: true }})   │
│   · EmbeddedIframeAdapter(YT) │         │  - AudioWorklet (VU meter + PCM)  │
│  SegmentSyncEngine:           │         │  - MediaRecorder (detected MIME:  │
│   · rAF cue tracker (<16ms)   │         │    audio/webm;codecs=opus | mp4)  │
│   · Rate-scaled Auto-Stop     │         │  - ObjectURL lifecycle registry   │
└───────────────┬───────────────┘         └─────────────────┬─────────────────┘
                │                                           │ 16kHz Float32 PCM
                │                                           ▼
                │                         ┌───────────────────────────────────┐
                │                         │     SpeechWorker (Web Worker)     │
                │                         │  - Off-main-thread WASM/WebGPU    │
                │                         │    ASR (e.g., Whisper ONNX Worker)│
                │                         │  - Pluggable Fallback (Cloud STT) │
                │                         └─────────────────┬─────────────────┘
                ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AudioContext SFX & Pronunciation Scorer                   │
│  - Pre-decoded Web Audio AudioBuffer SFX pool (zero-latency chimes)         │
│  - Word/Phoneme Alignment Engine (customizable pass threshold & feedback)   │
│  - Optional Backend Telemetry Client (submits summary metrics or audio)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Improvements Over Observed Behavior

1. **Web Worker Offloading for ASR & Phonetics**:
   - Observed Parroto runs Transformers.js inference via Blob URLs; an independent engine should stream **raw `16 kHz` mono `Float32Array` PCM** directly from an `AudioContext` / `AudioWorkletNode` into a dedicated **Web Worker** hosting ONNX Runtime Web (WebGPU with WASM fallback), keeping UI rendering at 60 FPS and enabling real-time microphone VU waveform feedback.
2. **Negotiated `MediaRecorder` Container Integrity**:
   - Instead of tagging arbitrary `MediaRecorder` chunks as `"audio/mp3"`, probe `MediaRecorder.isTypeSupported(...)` in priority order (`audio/webm;codecs=opus`, `audio/mp4;codecs=mp4a.40.2`, `audio/ogg;codecs=opus`), attach the actual negotiated `mimeType` to the `Blob`, and decode reliably via `AudioContext.decodeAudioData()` or `<audio>`.
3. **Single Unified Synchronization Clock**:
   - Consolidate Parroto's three separate timing loops (`setTimeout + rAF` + `setInterval(300)` + `rAF`) into one `SegmentClock` driven by `requestAnimationFrame` while playing (`paused === false`) using binary search over sorted `[start_ms, end_ms]` cues (`O(log N)` per frame), pausing cleanly within 1 frame of `end_ms` when `autoStop` is active and tearing down cleanly on visibility loss or unmount.
4. **Zero-Latency Web Audio SFX Pool**:
   - Replace per-element `new Audio(url)` SFX reuse with a single lazy-resumed `AudioContext` + pre-fetched `AudioBuffer` map (`correct`, `complete`, `notice`), avoiding Safari/iOS HTMLAudio concurrency limits when lesson playback, recording playback, and chimes overlap.
5. **Explicit Adapter & Permission State Machine**:
   - Separate `RecordingState` (`idle | requesting_mic | recording | processing | ready | error`) and map DOMExceptions (`NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`) to actionable recovery prompts.
6. **Extensible Grading & Voice Transport Boundary**:
   - Isolate scoring behind an async `PronunciationEvaluator` interface (`local_phoneme_aligner` default; optional server-assisted evaluator when authenticated) and reserve an abstract `RealtimeVoiceTransport` slot (`WebRTC` / SFU SDK) for authenticated conversation rooms without assuming Parroto's uninspected backend protocol.
