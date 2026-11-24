# Architectural & Technical Decisions Log

| Decision ID | Decision | Rationale |
| :--- | :--- | :--- |
| `TD-01` | **Strict Contract Sharing via `@linguacraft/contracts`** | Shared Zod schemas serve simultaneously as frontend response parsers, React form validators, and NestJS `ZodValidationPipe` DTO validators, eliminating schema drift. |
| `TD-02` | **npm Workspaces Monorepo** | Adopted npm workspaces (`apps/*`, `packages/*`) matching Windows host Node/npm tooling cleanly while maintaining isolated workspace typecheck/test/build scripts. |
| `TD-03` | **URI API Versioning (`/api/v1`) + Swagger/OpenAPI** | NestJS URI versioning paired with compiled `dist/scripts/generate-openapi.js` extraction exports [openapi.json](file:///d:/parroto/docs/api/openapi.json) with full `emitDecoratorMetadata` support. |
| `TD-04` | **SWC Transformer in Backend Vitest** | Configured `unplugin-swc` in `apps/api/vitest.config.ts` so TypeScript `design:paramtypes` decorator metadata is emitted in millisecond Vitest runs for real NestJS DI testing. |
| `TD-05` | **Capability-Honest AI Telemetry Boundaries** | Dedicated pronunciation engines (`AzurePronunciationAdapter`) vs word aligners (`Deepgram` / local DP aligner) vs LLM pedagogical coaching (`@google/genai` `gemini-3.8-flash`) are isolated behind `measurementTier`; `phonemes` and `prosody` remain strictly `null` unless produced by an acoustic phoneme/prosody engine. |
| `TD-06` | **Dual-Token Cookie Rotation + Reuse Family Revocation** | Short-lived JWT access tokens remain in client memory (`Zustand`), while `SHA-256`-hashed opaque refresh tokens rotate via `HttpOnly` cookies and cascade-revoke entire `familyId` chains on reuse detection. |
| `TD-07` | **Explicit Audio Consent & S3 Deletion Lifecycle** | Cloud recording presign requires `user.audioConsentAt` or `consentAccepted: true` (`403 AUDIO_CONSENT_REQUIRED`), and `DELETE /api/v1/media/:assetId` deletes S3 objects cleanly via `DeleteObjectCommand` while keeping non-audio assessment scores intact. |
