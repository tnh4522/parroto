# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are Vietnamese and international English learners (CEFR B1–C1 and IELTS/TOEIC exam candidates) studying independently on desktop and mobile web browsers. They switch between focused audio-input drills (dictation, shadowing), rapid daily vocabulary reviews (SM-2 flashcards), timed exam simulations, and live speaking practice rooms.

## Product Purpose

LinguaCraft (Parroto) helps learners build active English listening, pronunciation, vocabulary retention, and exam readiness in one integrated web workspace. Success means completing daily micro-drills with low friction, retaining vocabulary through spaced repetition, and receiving honest, actionable feedback on pronunciation and test performance.

## Positioning

Unlike generic flashcard or LLM-wrapper apps, LinguaCraft combines millisecond-synchronized media segment drills, deterministic SM-2 spaced repetition, IELTS/TOEIC Test & Practice engines, and capability-honest AI speech telemetry—strictly reporting transcript-only alignment when no acoustic phoneme/prosody engine is active rather than fabricating scores.

## Operating Context

- **Marketing entry (`/`) & Auth (`/login`, `/auth/callback`, `/auth/verify`)**: Guest discovery, magic-link and OAuth sign-in, and learner onboarding.
- **Core learning workspace**: `/dashboard`, `/lessons`, `/dictation/[slug]`, `/shadowing/[slug]`, `/vocabulary/[slug]`, `/flashcards`, `/exams/[track]`, `/speaking`, `/analytics`, and `/settings`.
- **Audio & media workflows**: Browser-native media playback, microphone recording with explicit consent (`audioConsentAt`), and S3/MinIO object deletion preserving non-audio assessment scores.
- **Multi-theme & bilingual context**: Supports light and dark themes (`:root` / `.dark`) and user-selectable UI/translation language preferences (e.g., `en` UI with `vi` translation support).

## Capabilities and Constraints

- **Web & API contract sync**: Frontend `@linguacraft/web` (Next.js 15 App Router, React 19, Tailwind CSS v4) shares strict Zod schemas via `@linguacraft/contracts` with `@linguacraft/api` (NestJS 11 + Prisma 6 + BullMQ).
- **Capability-honest AI boundaries**: `measurementTier` distinguishes acoustic engines from transcript-only DP word alignment; `phonemes` and `prosody` remain `null` unless produced by an acoustic engine; IELTS/TOEIC AI feedback carries `isOfficialScore: false`.
- **Known current boundaries** (from [docs/KNOWN_LIMITATIONS.md](../../docs/KNOWN_LIMITATIONS.md)): `SpeakingLobbyView` implements REST room creation/joining without live client `RTCPeerConnection` media mesh binding yet; `MediaPlayerSurface` YouTube embeds seek to cue start without IFrame frame-exact auto-stop hooks; Admin UI pages are deferred.
- **Automated quality gates**: Existing RTL/Vitest unit specs, Supertest API specs, and Playwright desktop/mobile E2E selectors (`data-testid`, ARIA roles/labels) must remain intact.

## Brand Commitments

- **Product identity**: LinguaCraft (workspace repo `parroto`), using the existing clean, focused educational product tone without fabricated testimonials, benchmarks, or inflated score claims.
- **Privacy & consent**: Explicit recording consent gate (`AUDIO_CONSENT_REQUIRED`) and user-controlled recording deletion must stay transparent in UI copy and controls.

## Evidence on Hand

- Architecture, database, API (`docs/api/openapi.json`), AI schema, and QA reports live in `docs/`.
- Existing web UI modules, shared primitives (`apps/web/src/shared/ui/`), and 15 Vitest + 7 E2E scenario suites exist in `apps/web/src/` and `e2e/`.
- No customer testimonials, external case studies, or press quotes exist in the repository; marketing surfaces must not fabricate them.

## Product Principles

1. **Practice First, Zero Clutter**: Keep active listening, typing, recording, and exam runners focused and scannable on both desktop and mobile viewports.
2. **Honest Telemetry & Disclaimers**: Never present simulated or transcript-only scores as acoustic phoneme analysis or official IELTS/TOEIC scores.
3. **Consent & Control**: Make microphone permissions, cloud audio consent, and recording deletion explicit and recoverable.
4. **Consistent Cross-Mode Mental Model**: Share typography, feedback states (loading, empty, error, success), and navigation patterns across all learning modules.
