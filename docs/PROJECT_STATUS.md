# LinguaCraft Independent Platform — Project Status

**Reference Target**: `https://parroto.app/` (publicly observable behavior only)  
**Active Directive Baseline**: `PHASE 0` REA MCP Verification (`2026-11-24`)  
**Workspace Packages**: `@linguacraft/contracts`, `@linguacraft/web` (Next.js 15), `@linguacraft/api` (NestJS 11 + Prisma 6 + BullMQ)

---

## 1. Current Phase & Artifact Inventory

| Directive Phase | Status | Primary Deliverables |
| :--- | :--- | :--- |
| **Phase 0 — REA MCP Verification** | **Completed & Re-Verified (`2026-11-24`)** | Verified live REA MCP server (`inspect_analysis_settings`), audited web/CDP/JS/network tool schemas (`C:\Users\ACER\.gemini\antigravity\mcp\rea\*.json`), tested CDP target reachability (`list_browser_targets`). |
| **Phase 1 — Website Recon** | Artifacts present | `research/website/*` (overview, page inventory, navigation map, auth boundaries, UI components). |
| **Phase 2 — JS, API & Audio Recon** | Artifacts present | `research/javascript/*`, `research/api/*`, `research/audio/*`, `research/modules/ielts-toeic-exams/*`. |
| **Phase 3 — System & AI Architecture** | **Completed** | `docs/architecture/*`, `docs/database/database-schema.md`, `docs/api/api-specification.md`, `docs/ai/*`. |
| **Phase 4 — Web & Backend Modules** | **Completed (Core 13 Web + 13 API Modules)** | `apps/web` (all 13 modules implemented & built), `apps/api` (13 NestJS modules + SQL migrations + Swagger OpenAPI `docs/api/openapi.json`). |
| **Phase 5 — AI Integration Layer** | **Completed (Code + Docs)** | Multi-provider ports (`Azure Speech`, `Deepgram Nova-3`, `@google/genai` `gemini-3.8-flash`), circuit breakers, consent + S3 deletion. |
| **Phase 6 — QA & Audits** | **Completed (Automated Suites)** | `docs/qa/*` (`15` web Vitest suites / `29` tests, `8` API Supertest suites / `16` tests, `14` Playwright E2E Chrome/Edge tests, Lighthouse audits). |
| **Phase 7 — Production Deployment** | **Pending Infrastructure** | `docker-compose.yml` authored; live Docker Postgres/Redis/MinIO container soak, live vendor keys, and Firefox/WebKit CI runners pending. |

---

## 2. REA MCP Phase 0 Verification Evidence (`2026-11-24`)

- **MCP Runtime Inspection (`inspect_analysis_settings`)**: Succeeded (`revision: 0`, response limit `REA_MCP_MAX_RESPONSE_BYTES = 10485760`, `javascript.analysis_timeout_ms = 300000`, `javascript.max_heap_mb = 1024`, `capture.decoder_old_generation_mib = 192`).
- **Loopback Chrome CDP Discovery Probe (`list_browser_targets`)**: Returned `provider_unavailable` / `endpoint_unreachable` for `http://127.0.0.1:9222` (no browser instance currently launched with `--remote-debugging-port=9222`).
- **Verified Web/JS/Network Schema Capabilities**:
  1. **CDP Browser Observation**: `list_browser_targets`, `observe_web_session`, `observe_web_execution`, `capture_web_screenshot`, `compare_web_captures`, `compare_web_screenshots`.
  2. **Passive Web Inspection**: `inspect_web_page`, `inspect_web_event_listeners`, `discover_webmcp_tools`.
  3. **Controlled Browser Scenarios**: `capture_browser_scenario` (launches isolated browser or attaches to CDP, supports `actions`, `secrets` redaction, scoped `storage`).
  4. **JavaScript Bundle & Runtime Analysis**: `analyze_web_bundle`, `export_web_scripts`, `recover_javascript_sources` (Linux x64 `Wakaru`), `trace_web_module_imports`, `trace_web_source_location`, `analyze_javascript_application`, `list_javascript_runtime_targets`, `observe_javascript_runtime`.
  5. **Network Capture Inspection**: `inspect_web_network_capture` (HAR 1.2, mitmproxy, Fiddler SAZ, qlog — never replays live URLs or exposes credentials).
