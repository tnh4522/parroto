# AI Provider Capability & Cost Evaluation (`2025–2026`)

**Purpose**: Objective engineering and cost evaluation before implementing LinguaCraft's decoupled AI & Speech Assessment layer.  
**Core Principle**: Speech-to-Text (STT), forced acoustic phoneme alignment, and Large Language Model (LLM) pedagogical coaching solve fundamentally different problems and must never be conflated.

---

## 1. Provider Capability Matrix

| Provider / Engine | Word Timestamps | Forced Reference Alignment | Acoustic Phoneme Scoring | Acoustic Prosody / Stress / Intonation | IELTS Coaching & Vocab Explanations (Structured JSON) | Credential / Hosting Model |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Azure AI Speech (Pronunciation Assessment)** | Yes | Yes (Scripted & Unscripted) | **Yes** (Native IPA / SAPI phonemes + miscues: omission, insertion, mispronunciation) | **Yes** (Enhanced Prosody add-on: stress, intonation, rhythm, break accuracy) | No (Acoustic telemetry only) | Backend Azure Subscription Key + Region |
| **Deepgram (`Nova-2` / `Nova-3`)** | Yes (`timestamps=true`) | Transcript comparison only | **No** | **No** | No | Backend API Key |
| **OpenAI (`gpt-transcribe` / Whisper)** | Select tiers (`whisper-1` / `timestamp_granularities`) | Transcript comparison only | **No** | **No** | Yes via separate LLM (`gpt-4o` / `gpt-5` family) | Backend API Key |
| **Google Gemini (`gemini-3.8-flash` via `@google/genai` Interactions API)** | Segment-level / prompt-derived | Audio-to-text understanding (not frame-exact forced alignment) | **No** *(Must NOT fabricate frame-level phoneme scores)* | Qualitative observation only | **Yes** (Native multimodal audio input + `response_format` JSON Schema) | Backend Gemini API Key / Vertex AI IAM |
| **Self-Hosted Open Stack (`faster-whisper` + `WhisperX` / `MFA`)** | Yes (`wav2vec2` forced alignment) | Yes | Partial–Yes (`wav2vec2` / Kaldi GOP posteriors when deployed) | Pitch/energy F0 contour (`praat`/`parselmouth`) | Requires separate LLM | Private GPU/CPU container cluster |

> [!IMPORTANT]
> Only **Azure AI Speech Pronunciation Assessment** (commercial) or a dedicated **forced phoneme aligner + GOP acoustic model** (self-hosted Kaldi/wav2vec2) produces true acoustic phoneme-level accuracy and prosody/stress measurements. Calling a general STT model (Deepgram/Whisper) or multimodal LLM (Gemini) and presenting guessed IPA errors as "acoustic phoneme scores" is misleading and strictly prohibited by LinguaCraft's schema contracts.

---

## 2. Verified Cost & Quota Comparison (Public Pay-As-You-Go Reference)

| Workload | Provider & Tier | Unit Price Reference | Effective Cost per **1,000 mins** (~16.7 hrs) | Monthly Free / Sandbox Allowance |
| :--- | :--- | :--- | :--- | :--- |
| **Full Phoneme + Prosody Pronunciation Assessment** | **Azure AI Speech Standard + Prosody Add-on** | `$1.00 / hr` base STT + `$0.30 / hr` prosody = **`$1.30 / audio hour`** (`$0.0217 / min`) | **`$21.67`** | `5 audio hours / month` free tier |
| **High-Volume Batch STT & Word Timestamps (YouTube/Media Ingestion & Fallback)** | **Deepgram Nova-3 (Pre-recorded)** | **`$0.0043 – $0.0066 / min`** | **`$4.30 – $6.60`** | Promotional credit tiers |
| **Batch STT Alternative** | **OpenAI `gpt-transcribe` (Files)** | **`$0.0045 / min`** (`$0.27 / hr`) | **`$4.50`** | None on paid API |
| **Streaming Realtime STT** | **Deepgram Nova-3 (Streaming)** | **`$0.0077 / min`** | **`$7.70`** | Usage-based |
| **IELTS Speaking Coaching, Transcript Enrichment & Vocabulary Explanations** | **Google Gemini Flash Tier (`gemini-3.8-flash` / `3.5-flash-lite`; benchmark ref: `$0.30/$1.00/$2.50` per 1M)** | Text In `$0.30 / 1M`, Audio In `$1.00 / 1M` (`~25 tok/s` -> `~$0.0015 / min`), Out `$2.50 / 1M` | **`~$1.50` audio input** + `~$0.0025` per `1k` output tokens (`~$4.00` total with rich JSON feedback) | Google AI Studio prototype rate-limited free tier |
| **Browser Client-First Shadowing (Free Tier Default)** | **Browser Web Speech / Local Alignment Worker** | `$0.00` marginal API cost | **`$0.00`** | Unlimited |

---

## 3. Recommended Multi-Tier Routing Strategy

1. **Free Learner Routine Shadowing (`$0` Marginal Cost)**:
   - Runs client-side alignment first (`PhonemeAligner` + browser speech recognition) with no cloud upload unless consent + cloud verification is triggered.
   - Cloud STT fallback (`POST /api/v1/audio/transcribe-fallback`) routes to **Deepgram / OpenAI Batch STT** (capped at `5/day` for Free).
2. **Lesson Media Ingestion (`PRO` YouTube/Audio Import)**:
   - Stage 1 (Transcript + Word Timestamps): **Deepgram Nova-3 / Self-hosted Whisper** (`$0.0045/min`).
   - Stage 2 (CEFR classification, punctuation cleanup, localization, vocabulary notes): **Google Gemini (`gemini-3.8-flash` / `@google/genai` Interactions `response_format` JSON)**.
3. **High-Precision Pronunciation, Stress & Phoneme Feedback (`PRO` / Speaking Assessment)**:
   - Primary Acoustic Engine: **Azure AI Speech Pronunciation Assessment (Prosody enabled)** -> provides genuine **phoneme accuracy**, **word accuracy**, **omission/insertion miscues**, and **prosody/stress scores**.
   - Qualitative Coaching Layer: **`gemini-3.8-flash`** generates learner-friendly fluency/intonation coaching, IELTS band descriptor practice feedback, TOEIC Speaking rubric coaching, and vocabulary explanations + contextual examples—clearly tagged as qualitative coaching separate from acoustic telemetry.
   - Graceful Degradation Fallback: If Azure credentials are unset or circuit-broken, router falls back to Deepgram/Whisper word-aligned transcript evaluation + Gemini qualitative feedback, setting `capabilityTier = "FORCED_WORD_ALIGNED"` or `"TRANSCRIPT_COMPARISON_ONLY"` and keeping `phonemes = null` and `prosody = null`.
