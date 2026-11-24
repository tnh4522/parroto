# LinguaCraft QA Known Issues & Environment Gaps

All items below reflect directly observed behavior, open architectural boundaries, or unexecuted live-environment dependencies as of `2026-11-24`.

---

## 1. Environment & Live Infrastructure Constraints

1. **Docker PostgreSQL 16, Redis 7, and MinIO Not Running Locally (`Env Gap — Medium`)**
   - **Observation**: `docker ps` could not connect to Docker Desktop Linux engine (`npipe:////./pipe/dockerDesktopLinuxEngine` unavailable).
   - **Impact**: Real SQL execution of `prisma/migrations/` against live PostgreSQL, real Redis distributed locking across API + Worker containers, and live MinIO `PUT`/`HeadObject`/`DeleteObject` calls were not executed end-to-end against live containers.
   - **Mitigation**: Both initial and incremental Prisma migrations (`20261124000000_init`, `20261124000001_ai_speech_consent`) validated cleanly with `prisma validate`; API Supertest integration suites exercised HTTP routing, guards, validation pipes, cryptographic HMAC/JWT flows, and error filters using stateful in-memory doubles. Live container tests remain pending in CI/staging.

2. **Live External AI / Payment / OAuth Vendor Sandboxes (`Env Gap — Medium`)**
   - **Observation**: No production/sandbox vendor secrets (`AZURE_SPEECH_KEY`, `DEEPGRAM_API_KEY`, `GEMINI_API_KEY`, Google/Apple OAuth client secrets) are configured in local `.env`.
   - **Impact**: Azure Speech Pronunciation Assessment phoneme responses, Deepgram Nova-3 live latency, and Gemini `gemini-3.8-flash` live JSON generation were not hit over public internet; test coverage ran against deterministic local adapters and simulated provider timeout fallback.

3. **Firefox & WebKit Native Engine Runs Pending (`Compatibility Gap — Low`)**
   - **Observation**: Playwright executed cleanly on Chromium engines (`Google Chrome` desktop & `Microsoft Edge` mobile emulation), while `firefox` and `webkit` Playwright browser binaries were not downloaded.
   - **Recommendation**: Enable `chromium`, `firefox`, and `webkit` matrix in GitHub Actions CI before release, especially to test iOS WebKit `MediaRecorder` `audio/mp4` codec fallback.

---

## 2. Functional & Minor UI Audit Observations

1. **Speaking Rooms WebRTC Client Socket.IO Subscription (`Feature Gap — Low/Medium`)**
   - **Observation**: Backend exposes `CommunityGateway` WebSocket events (`speaking:join`, `speaking:signal`, `chat:send`) on `/ws/community` and REST room CRUD (`GET/POST /speaking/rooms`), while frontend [SpeakingLobbyView.tsx](file:///d:/parroto/apps/web/src/features/speaking/components/SpeakingLobbyView.tsx) renders live room controls without instantiating a live Socket.IO + `RTCPeerConnection` mesh yet.
   - **Recommendation**: Wire `socket.io-client` and peer signaling hooks cleanly once STUN/TURN (`coturn`) credentials are provisioned.

2. **YouTube IFrame Auto-Stop Precision (`Architectural Limit — Low`)**
   - **Observation**: [MediaPlayerSurface.tsx](file:///d:/parroto/apps/web/src/features/lessons/components/MediaPlayerSurface.tsx) provides exact `requestAnimationFrame` (`SegmentClock`) auto-stop for self-hosted/signed `AUDIO` and `VIDEO` streams, whereas `YOUTUBE` lessons render via `youtube-nocookie.com` iframe embed where segment start seeks work but auto-stop at `endMs` is not attached to YouTube IFrame Player `onStateChange`.

3. **Lighthouse Minor Score Deductions (`Best Practices: 96`, `/login` Accessibility: `96`) (`Cosmetic — Low`)**
   - **Observation**: Lighthouse scored `/login` Accessibility at `96` and Best Practices at `96` (on localhost HTTP audit).
   - **Recommendation**: Inspect [lighthouse-login.json](file:///d:/parroto/docs/qa/artifacts/lighthouse-login.json) before launch to resolve any minor contrast/aria attribute check on `/login` and verify production HTTPS + CSP headers push Best Practices to `100`.
