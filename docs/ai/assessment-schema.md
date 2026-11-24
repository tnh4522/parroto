# AI Speech & Vocabulary Assessment Schema Contracts (`v1.0`)

**Principle**: Every assessment payload explicitly labels **provenance (`measurementTier`)**, separating deterministic **acoustic measurements** (`acousticMetrics`) from **LLM-generated qualitative coaching** (`llmCoachingFeedback`).

---

## 1. Capability & Provenance Enum (`measurementTier`)

```ts
type MeasurementTier =
  | "ACOUSTIC_PHONEME_ALIGNED"   // Dedicated phoneme + prosody acoustic engine (e.g., Azure Pronunciation Assessment)
  | "FORCED_WORD_ALIGNED"        // Acoustic word-level forced alignment (no phoneme/prosody telemetry)
  | "TRANSCRIPT_COMPARISON_ONLY" // ASR transcript + Levenshtein/text alignment fallback (no phoneme telemetry)
```

When `measurementTier !== "ACOUSTIC_PHONEME_ALIGNED"`:
- `acousticMetrics.prosody` **MUST be `null`** (never fabricated).
- `acousticMetrics.words[i].phonemes` **MUST be `null`** (never guessed by an LLM).

---

## 2. Speech Assessment JSON Response Schema (`GET /api/v1/ai/speech-assessments/:id`)

```json
{
  "assessmentId": "uuid",
  "schemaVersion": "1.0",
  "status": "COMPLETED",
  "mode": "SHADOWING",
  "measurementTier": "ACOUSTIC_PHONEME_ALIGNED",
  "providers": {
    "acousticProvider": "azure_speech",
    "coachProvider": "gemini-3.8-flash"
  },
  "transcript": "I would like a cup of coffee please.",
  "referenceText": "I would like a cup of coffee, please.",
  "acousticMetrics": {
    "durationMs": 2840,
    "wordsPerMinute": 148,
    "accuracyScore": 89,
    "fluencyScore": 86,
    "completenessScore": 100,
    "prosody": {
      "prosodyScore": 84,
      "stressScore": 82,
      "intonationScore": 85,
      "monotoneRisk": false
    },
    "words": [
      {
        "word": "coffee",
        "startMs": 1420,
        "endMs": 1890,
        "accuracyScore": 78,
        "errorType": "NONE",
        "phonemes": [
          { "ipa": "k", "accuracyScore": 94, "isMispronounced": false },
          { "ipa": "ɔː", "accuracyScore": 61, "isMispronounced": true }
        ]
      }
    ]
  },
  "llmCoachingFeedback": {
    "disclaimer": "Pedagogical AI coaching based on transcript and measured speech rate; not an official exam score.",
    "fluencyNotes": [
      "Steady pacing at 148 WPM with natural phrasing before 'please'."
    ],
    "intonationGuidance": [
      "Slightly lengthen the stressed vowel in 'coffee' and drop pitch gently at sentence end."
    ],
    "grammarCorrections": [],
    "ieltsCoaching": null,
    "toeicCoaching": null
  },
  "createdAt": "2026-11-24T10:15:00.000Z"
}
```

---

## 3. IELTS Speaking Coaching Extension (`mode === "IELTS_SPEAKING"`)

When `mode === "IELTS_SPEAKING"`, `llmCoachingFeedback.ieltsCoaching` populates:

```json
{
  "part": 2,
  "estimatedBandRange": "6.5 - 7.0",
  "isOfficialScore": false,
  "criteria": {
    "fluencyAndCoherence": { "comment": "...", "strengths": ["..."], "improvements": ["..."] },
    "lexicalResource": { "comment": "...", "upgradedPhrases": ["..."] },
    "grammaticalRange": { "comment": "...", "corrections": [{ "original": "...", "suggested": "...", "reason": "..." }] },
    "pronunciationGuidance": { "comment": "..." }
  }
}
```

---

## 4. TOEIC Support Extension (`mode === "TOEIC_SPEAKING"` | `"TOEIC_LISTENING_EXPLAIN"`)

- **TOEIC Speaking**: `toeicCoaching` returns `{ taskType, relevanceCheck, deliveryFeedback, suggestedResponse }`.
- **TOEIC Listening Explanation** (`POST /api/v1/ai/toeic/explain`):

```json
{
  "schemaVersion": "1.0",
  "provider": "gemini-3.8-flash",
  "summary": "Speaker confirms the budget review moves from Tuesday to Thursday afternoon.",
  "whyCorrect": "Option (C) matches 'pushed back to Thursday at 2 PM'.",
  "distractorBreakdown": [
    { "option": "A", "reason": "Mentions Tuesday, which was the cancelled original date." }
  ],
  "keyVocabulary": [
    { "term": "push back", "meaning": "postpone to a later time", "example": "We pushed back the launch by two days." }
  ]
}
```

---

## 5. Vocabulary Explanation Schema (`POST /api/v1/ai/vocabulary/explain`)

```json
{
  "schemaVersion": "1.0",
  "word": "resilient",
  "cefrLevel": "B2",
  "partOfSpeech": "adjective",
  "simpleDefinition": "Able to recover quickly after difficult situations or setbacks.",
  "nuanceNote": "Usually carries a positive connotation about endurance and adaptability.",
  "collocations": ["resilient economy", "emotionally resilient", "remarkably resilient"],
  "examples": [
    { "sentence": "Small businesses proved remarkably resilient during the downturn.", "context": "Business / IELTS" },
    { "sentence": "Regular speaking practice builds resilient confidence.", "context": "Daily English" }
  ]
}
```
