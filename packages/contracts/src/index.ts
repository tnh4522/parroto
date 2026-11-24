import { z } from "zod";

export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
  traceId: z.string().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(1),
});
export type PaginationMeta = z.infer<typeof paginationSchema>;

export const entitlementTierSchema = z.enum(["FREE", "PRO", "LIFETIME"]);
export type EntitlementTier = z.infer<typeof entitlementTierSchema>;

export const userRoleSchema = z.enum(["USER", "MODERATOR", "ADMIN"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const cefrLevelSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export type CefrLevel = z.infer<typeof cefrLevelSchema>;

export const userStatsSummarySchema = z.object({
  xpTotal: z.number().int().nonnegative(),
  level: z.number().int().min(1),
  diamondBalance: z.number().int().nonnegative(),
  currentStreakDays: z.number().int().nonnegative(),
  longestStreakDays: z.number().int().nonnegative(),
  streakFreezesOwned: z.number().int().nonnegative(),
  activeTimeSec: z.number().int().nonnegative(),
});
export type UserStatsSummary = z.infer<typeof userStatsSummarySchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(32).nullable(),
  displayName: z.string().min(1).max(80),
  avatarUrl: z.string().url().nullable().optional(),
  role: userRoleSchema,
  entitlementTier: entitlementTierSchema,
  ageVerified: z.boolean(),
  preferredUiLocale: z.string().min(2).max(10).default("en"),
  preferredTranslateLang: z.string().min(2).max(10).default("vi"),
  stats: userStatsSummarySchema.optional(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;

export const oauthExchangeRequestSchema = z.object({
  code: z.string().min(1),
  codeVerifier: z.string().min(1),
  redirectUri: z.string().url(),
});
export type OAuthExchangeRequest = z.infer<typeof oauthExchangeRequestSchema>;

export const authTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: authUserSchema,
});
export type AuthTokenResponse = z.infer<typeof authTokenResponseSchema>;

export const refreshTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
});
export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

export const onboardingUpdateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username cannot exceed 32 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores are allowed"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .optional(),
  preferredTranslateLang: z.string().min(2).max(10).optional(),
});
export type OnboardingUpdateRequest = z.infer<typeof onboardingUpdateSchema>;

// Dictionary contracts (api-specification.md §2)
export const dictionarySearchItemSchema = z.object({
  word: z.string(),
  phonetic: z.string().nullable().optional(),
  partOfSpeech: z.string().nullable().optional(),
  shortMeaning: z.string(),
});
export type DictionarySearchItem = z.infer<typeof dictionarySearchItemSchema>;

export const dictionarySearchResponseSchema = z.object({
  items: z.array(dictionarySearchItemSchema),
});

export const dictionaryPhoneticSchema = z.object({
  locale: z.string(),
  ipa: z.string(),
  audioUrl: z.string().url().nullable().optional(),
});

export const dictionaryMeaningSchema = z.object({
  partOfSpeech: z.string(),
  definition: z.string(),
  example: z.string().nullable().optional(),
});

export const dictionaryWordResponseSchema = z.object({
  word: z.string(),
  phonetics: z.array(dictionaryPhoneticSchema),
  meanings: z.array(dictionaryMeaningSchema),
});
export type DictionaryWordDetail = z.infer<typeof dictionaryWordResponseSchema>;

// Lessons, Dictation & Shadowing contracts (api-specification.md §3)
export const mediaTransportTypeSchema = z.enum(["YOUTUBE", "AUDIO", "VIDEO"]);
export type MediaTransportType = z.infer<typeof mediaTransportTypeSchema>;

export const lessonSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  mediaType: mediaTransportTypeSchema,
  thumbnailUrl: z.string().url().nullable().optional(),
  cefrLevel: cefrLevelSchema,
  durationSec: z.number().int().nonnegative(),
  isPro: z.boolean(),
  viewCount: z.number().int().nonnegative().default(0),
  topics: z.array(z.string()).default([]),
});
export type LessonSummary = z.infer<typeof lessonSummarySchema>;

export const wordTimingSchema = z.object({
  word: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  ipa: z.string().optional(),
});
export type WordTiming = z.infer<typeof wordTimingSchema>;

export const lessonSentenceSchema = z.object({
  id: z.string().uuid(),
  orderIndex: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  text: z.string(),
  ipaText: z.string().nullable().optional(),
  translations: z.record(z.string(), z.string()).optional(),
  words: z.array(wordTimingSchema).optional(),
});
export type LessonSentence = z.infer<typeof lessonSentenceSchema>;

export const lessonListResponseSchema = z.object({
  items: z.array(lessonSummarySchema),
  pagination: paginationSchema,
});

export const dailyLessonsResponseSchema = z.object({
  dateKey: z.string(),
  items: z.array(lessonSummarySchema),
});

export const lessonDetailResponseSchema = z.object({
  lesson: lessonSummarySchema.extend({
    youtubeVideoId: z.string().nullable().optional(),
  }),
  signedMediaUrl: z.string().url().nullable().optional(),
  sentences: z.array(lessonSentenceSchema).nullable().optional(),
});
export type LessonDetailResponse = z.infer<typeof lessonDetailResponseSchema>;

export const sentenceAttemptRequestSchema = z.object({
  sentenceId: z.string().uuid(),
  mode: z.enum(["DICTATION", "SHADOWING"]),
  accuracyScore: z.number().int().min(0).max(100),
  mistakesCount: z.number().int().min(0).default(0),
  replayCount: z.number().int().min(0).default(0),
});
export type SentenceAttemptRequest = z.infer<typeof sentenceAttemptRequestSchema>;

export const sentenceAttemptResponseSchema = z.object({
  passed: z.boolean(),
  sentenceScore: z.number().int().min(0).max(100),
  diamondsEarned: z.number().int().nonnegative(),
  streakUpdated: z.boolean(),
});

export const importYoutubeLessonRequestSchema = z.object({
  youtubeUrl: z.string().url("Please enter a valid YouTube URL"),
  topicIds: z.array(z.string().uuid()).optional(),
});

export const importYoutubeLessonResponseSchema = z.object({
  jobId: z.string(),
  lessonId: z.string().uuid(),
});

export const streakCheckinResponseSchema = z.object({
  checkedIn: z.boolean(),
  currentStreakDays: z.number().int().nonnegative(),
  diamondsEarned: z.number().int().nonnegative(),
  diamondBalance: z.number().int().nonnegative(),
});

// Media & Speech Fallback contracts (api-specification.md §2)
export const presignUploadRequestSchema = z.object({
  purpose: z.enum(["SHADOWING_RECORDING", "SPEAKING_CLIP"]),
  mimeType: z.string().min(1),
  contentLength: z.number().int().positive().max(25 * 1024 * 1024),
  consentAccepted: z.boolean().optional(),
});

export const presignUploadResponseSchema = z.object({
  assetId: z.string().uuid(),
  uploadUrl: z.string().url(),
  expiresAt: z.string(),
});

export const confirmUploadResponseSchema = z.object({
  assetId: z.string().uuid(),
  status: z.enum(["CONFIRMED", "PROCESSING", "FAILED"]),
});

export const transcribeFallbackRequestSchema = z.object({
  assetId: z.string().uuid(),
  language: z.string().min(2).max(10).default("en"),
});

export const transcribeFallbackResponseSchema = z.object({
  text: z.string(),
  segments: z.array(
    z.object({
      startMs: z.number().int().nonnegative(),
      endMs: z.number().int().nonnegative(),
      text: z.string(),
    })
  ),
});

// Vocabulary & SRS contracts (api-specification.md §4)
export const vocabVisibilitySchema = z.enum(["PUBLIC", "PRIVATE"]);
export type VocabVisibility = z.infer<typeof vocabVisibilitySchema>;

export const vocabCardSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  phonetic: z.string().nullable().optional(),
  partOfSpeech: z.string().nullable().optional(),
  meaning: z.string(),
  exampleSentence: z.string().nullable().optional(),
  audioUrl: z.string().url().nullable().optional(),
});
export type VocabCard = z.infer<typeof vocabCardSchema>;

export const vocabDeckSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  cefrLevel: cefrLevelSchema,
  visibility: vocabVisibilitySchema,
  isPro: z.boolean().default(false),
  cardCount: z.number().int().nonnegative(),
  ownerDisplayName: z.string().nullable().optional(),
});
export type VocabDeck = z.infer<typeof vocabDeckSchema>;

export const vocabDeckListResponseSchema = z.object({
  items: z.array(vocabDeckSchema),
  pagination: paginationSchema,
});

export const vocabDeckDetailResponseSchema = z.object({
  deck: vocabDeckSchema,
  previewCards: z.array(vocabCardSchema),
  totalCards: z.number().int().nonnegative(),
});

export const createVocabDeckRequestSchema = z.object({
  title: z.string().trim().min(2, "Deck title must be at least 2 characters").max(80),
  description: z.string().trim().max(300).optional(),
  cefrLevel: cefrLevelSchema,
  visibility: vocabVisibilitySchema.default("PRIVATE"),
  cards: z
    .array(
      z.object({
        term: z.string().trim().min(1),
        meaning: z.string().trim().min(1),
        exampleSentence: z.string().trim().optional(),
      })
    )
    .min(1, "Add at least one vocabulary card"),
});
export type CreateVocabDeckRequest = z.infer<typeof createVocabDeckRequestSchema>;

export const createVocabDeckResponseSchema = z.object({
  deck: vocabDeckSchema,
});

// Spaced Repetition (SM-2) contracts (api-specification.md §4)
export const srsCardStateSchema = z.enum([
  "NEW",
  "LEARNING",
  "REVIEW",
  "RELEARNING",
]);
export type SrsCardState = z.infer<typeof srsCardStateSchema>;

export const srsCardWithScheduleSchema = vocabCardSchema.extend({
  deckSlug: z.string().optional(),
  deckTitle: z.string().optional(),
  intervalDays: z.number().nonnegative(),
  easeFactor: z.number().positive(),
  repetitions: z.number().int().nonnegative(),
  state: srsCardStateSchema,
  nextReviewAt: z.string(),
});
export type SrsCardWithSchedule = z.infer<typeof srsCardWithScheduleSchema>;

export const srsDueResponseSchema = z.object({
  dueCount: z.number().int().nonnegative(),
  cards: z.array(srsCardWithScheduleSchema),
});

export const srsRatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type SrsRating = z.infer<typeof srsRatingSchema>;

export const srsReviewRequestSchema = z.object({
  cardId: z.string().uuid(),
  rating: srsRatingSchema,
});
export type SrsReviewRequest = z.infer<typeof srsReviewRequestSchema>;

export const srsReviewResponseSchema = z.object({
  nextReviewAt: z.string(),
  intervalDays: z.number().nonnegative(),
  easeFactor: z.number().positive(),
  state: srsCardStateSchema,
});

// Exams Analytics & History contracts (api-specification.md §5)
export const examTrackSchema = z.enum(["IELTS", "TOEIC"]);
export type ExamTrack = z.infer<typeof examTrackSchema>;

export const examModeSchema = z.enum(["TEST", "PRACTICE"]);
export type ExamMode = z.infer<typeof examModeSchema>;

export const examSessionStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
]);
export type ExamSessionStatus = z.infer<typeof examSessionStatusSchema>;

export const examSessionSummarySchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  examSlug: z.string(),
  examTitle: z.string(),
  track: examTrackSchema,
  mode: examModeSchema,
  status: examSessionStatusSchema,
  scoreDisplay: z.string().nullable().optional(),
  accuracyPct: z.number().min(0).max(100).nullable().optional(),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
});
export type ExamSessionSummary = z.infer<typeof examSessionSummarySchema>;

export const examHistoryResponseSchema = z.object({
  items: z.array(examSessionSummarySchema),
  pagination: paginationSchema,
});

export const examAnalyticsResponseSchema = z.object({
  summary: z.object({
    totalCompleted: z.number().int().nonnegative(),
    averageScore: z.number().nonnegative(),
    bestScore: z.number().nonnegative(),
    totalStudyMinutes: z.number().int().nonnegative(),
  }),
  scoreTrend: z.array(
    z.object({
      sessionId: z.string().uuid(),
      examTitle: z.string(),
      score: z.number().nonnegative(),
      completedAt: z.string(),
    })
  ),
  topWeakAreas: z.array(
    z.object({
      tag: z.string(),
      accuracyPct: z.number().min(0).max(100),
      questionCount: z.number().int().nonnegative(),
    })
  ),
});
export type ExamAnalyticsResponse = z.infer<typeof examAnalyticsResponseSchema>;

// Community Speaking contracts (api-specification.md §6)
export const speakingRoomSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(60),
  topic: z.string().min(2).max(40),
  cefrLevel: cefrLevelSchema,
  maxParticipants: z.number().int().min(2).max(5),
  currentParticipants: z.number().int().nonnegative(),
  isPrivate: z.boolean().default(false),
  hostDisplayName: z.string(),
  createdAt: z.string(),
});
export type SpeakingRoom = z.infer<typeof speakingRoomSchema>;

export const speakingRoomListResponseSchema = z.object({
  items: z.array(speakingRoomSchema),
});

export const createSpeakingRoomRequestSchema = z.object({
  name: z.string().trim().min(3, "Room name must be at least 3 characters").max(60),
  topic: z.string().trim().min(2, "Select or enter a speaking topic").max(40),
  cefrLevel: cefrLevelSchema,
  maxParticipants: z.number().int().min(2).max(5).default(4),
  isPrivate: z.boolean().default(false),
});
export type CreateSpeakingRoomRequest = z.infer<
  typeof createSpeakingRoomRequestSchema
>;

export const createSpeakingRoomResponseSchema = z.object({
  room: speakingRoomSchema,
});

// Comments contracts (api-specification.md §3)
export const commentSchema = z.object({
  id: z.string().uuid(),
  targetType: z.enum(["LESSON", "STORY", "EXAM"]),
  targetId: z.string().uuid(),
  authorDisplayName: z.string(),
  content: z.string(),
  createdAt: z.string(),
});
export type CommentItem = z.infer<typeof commentSchema>;

export const commentsListResponseSchema = z.object({
  items: z.array(commentSchema),
  pagination: paginationSchema,
});

export const createCommentRequestSchema = z.object({
  targetType: z.enum(["LESSON", "STORY", "EXAM"]),
  targetId: z.string().uuid(),
  content: z.string().trim().min(1, "Enter a comment").max(1000),
});

export const createCommentResponseSchema = z.object({
  comment: commentSchema,
});

// IELTS & TOEIC Exam contracts (api-specification.md §5)
export const examSetSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  track: examTrackSchema,
  examCount: z.number().int().nonnegative(),
  coverImageUrl: z.string().url().nullable().optional(),
});
export type ExamSet = z.infer<typeof examSetSchema>;

export const examSetsResponseSchema = z.object({
  sets: z.array(examSetSchema),
});

export const examSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  track: examTrackSchema,
  totalQuestions: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  isFree: z.boolean().default(true),
  attemptsCount: z.number().int().nonnegative().default(0),
});
export type ExamSummary = z.infer<typeof examSummarySchema>;

export const examPartMetaSchema = z.object({
  partNumber: z.number().int().min(1),
  title: z.string(),
  questionCount: z.number().int().nonnegative(),
  durationMinutes: z.number().int().nonnegative().optional(),
  skill: z.enum(["LISTENING", "READING"]),
});
export type ExamPartMeta = z.infer<typeof examPartMetaSchema>;

export const examSetDetailResponseSchema = z.object({
  examSet: examSetSchema,
  exams: z.array(examSummarySchema),
});

export const examOverviewResponseSchema = z.object({
  exam: examSummarySchema,
  parts: z.array(examPartMetaSchema),
  userInProgressSessionId: z.string().uuid().nullable().optional(),
});

export const startExamSessionRequestSchema = z.object({
  examId: z.string().uuid(),
  mode: examModeSchema,
  parts: z.array(z.number().int().min(1)).optional(),
});
export type StartExamSessionRequest = z.infer<
  typeof startExamSessionRequestSchema
>;

export const examSessionDetailSchema = z.object({
  id: z.string().uuid(),
  examId: z.string().uuid(),
  track: examTrackSchema,
  mode: examModeSchema,
  status: examSessionStatusSchema,
  selectedParts: z.array(z.number().int()).default([]),
  startedAt: z.string(),
  expiresAt: z.string().nullable().optional(),
});

export const startExamSessionResponseSchema = z.object({
  session: examSessionDetailSchema,
});

export const examQuestionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const examQuestionSchema = z.object({
  questionNumber: z.number().int().min(1),
  partNumber: z.number().int().min(1),
  questionType: z.enum(["MCQ", "FILL_BLANK"]).default("MCQ"),
  promptText: z.string(),
  options: z.array(examQuestionOptionSchema).default([]),
});
export type ExamQuestion = z.infer<typeof examQuestionSchema>;

export const examQuestionGroupSchema = z.object({
  id: z.string().uuid(),
  partNumber: z.number().int().min(1),
  instruction: z.string().nullable().optional(),
  passageText: z.string().nullable().optional(),
  audioSignedUrl: z.string().url().nullable().optional(),
  questions: z.array(examQuestionSchema),
});
export type ExamQuestionGroup = z.infer<typeof examQuestionGroupSchema>;

export const examSessionQuestionsResponseSchema = z.object({
  session: examSessionDetailSchema,
  parts: z.array(examPartMetaSchema),
  groups: z.array(examQuestionGroupSchema),
  savedAnswers: z
    .record(
      z.string(),
      z.object({
        selectedValue: z.string(),
        isFlagged: z.boolean().default(false),
      })
    )
    .default({}),
});

export const saveExamAnswersRequestSchema = z.object({
  answers: z.array(
    z.object({
      questionNumber: z.number().int().min(1),
      selectedValue: z.string(),
      isFlagged: z.boolean().optional(),
    })
  ),
});

export const saveExamAnswersResponseSchema = z.object({
  savedCount: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

export const checkExamQuestionResponseSchema = z.object({
  isCorrect: z.boolean(),
  correctAnswer: z.string(),
  explanationHtml: z.string(),
});
export type CheckExamQuestionResponse = z.infer<
  typeof checkExamQuestionResponseSchema
>;

export const submitExamSessionResponseSchema = z.object({
  sessionResult: examSessionSummarySchema,
});

export const abandonExamSessionResponseSchema = z.object({
  status: z.literal("ABANDONED"),
});

export const examResultResponseSchema = z.object({
  session: examSessionSummarySchema,
  parts: z.array(examPartMetaSchema),
  groups: z.array(examQuestionGroupSchema),
  answersMap: z.record(
    z.string(),
    z.object({
      selectedValue: z.string().nullable().optional(),
      correctAnswer: z.string(),
      isCorrect: z.boolean(),
      explanationHtml: z.string().nullable().optional(),
    })
  ),
});

// User Preferences & Settings contracts (api-specification.md §1)
export const userPreferencesUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required")
    .max(80)
    .optional(),
  preferredUiLocale: z.enum(["en", "vi"]).optional(),
  preferredTranslateLang: z.string().min(2).max(10).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .optional(),
});
export type UserPreferencesUpdateRequest = z.infer<
  typeof userPreferencesUpdateSchema
>;

export const userProfileUpdateResponseSchema = z.object({
  user: authUserSchema,
});

// Audio Consent, Media Deletion & AI Assessment contracts (docs/ai/assessment-schema.md)
export const audioConsentRequestSchema = z.object({
  accepted: z.literal(true, {
    errorMap: () => ({ message: "Explicit audio consent acceptance is required" }),
  }),
  policyVersion: z.string().trim().min(1).max(32).default("2026-11"),
});
export type AudioConsentRequest = z.infer<typeof audioConsentRequestSchema>;

export const deleteMediaResponseSchema = z.object({
  deleted: z.boolean(),
  assetId: z.string().uuid(),
});

export const measurementTierSchema = z.enum([
  "ACOUSTIC_PHONEME_ALIGNED",
  "FORCED_WORD_ALIGNED",
  "TRANSCRIPT_COMPARISON_ONLY",
]);
export type MeasurementTier = z.infer<typeof measurementTierSchema>;

export const speechAssessmentModeSchema = z.enum([
  "SHADOWING",
  "IELTS_SPEAKING",
  "TOEIC_SPEAKING",
]);
export type SpeechAssessmentMode = z.infer<typeof speechAssessmentModeSchema>;

export const phonemeAssessmentSchema = z.object({
  ipa: z.string(),
  accuracyScore: z.number().min(0).max(100),
  isMispronounced: z.boolean(),
});

export const assessedWordSchema = z.object({
  word: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().nonnegative(),
  accuracyScore: z.number().min(0).max(100),
  errorType: z.enum(["NONE", "OMISSION", "INSERTION", "MISPRONUNCIATION"]),
  phonemes: z.array(phonemeAssessmentSchema).nullable(),
});

export const prosodyMetricsSchema = z.object({
  prosodyScore: z.number().min(0).max(100),
  stressScore: z.number().min(0).max(100),
  intonationScore: z.number().min(0).max(100),
  monotoneRisk: z.boolean(),
});

export const submitSpeechAssessmentRequestSchema = z.object({
  assetId: z.string().uuid(),
  mode: speechAssessmentModeSchema,
  language: z.string().min(2).max(10).default("en"),
  referenceText: z.string().trim().max(4000).optional(),
  ieltsPart: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  promptQuestion: z.string().trim().max(1000).optional(),
});
export type SubmitSpeechAssessmentRequest = z.infer<
  typeof submitSpeechAssessmentRequestSchema
>;

export const ieltsCoachingSchema = z.object({
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  estimatedBandRange: z.string(),
  isOfficialScore: z.literal(false),
  criteria: z.object({
    fluencyAndCoherence: z.object({
      comment: z.string(),
      strengths: z.array(z.string()),
      improvements: z.array(z.string()),
    }),
    lexicalResource: z.object({
      comment: z.string(),
      upgradedPhrases: z.array(z.string()),
    }),
    grammaticalRange: z.object({
      comment: z.string(),
      corrections: z.array(
        z.object({
          original: z.string(),
          suggested: z.string(),
          reason: z.string(),
        })
      ),
    }),
    pronunciationGuidance: z.object({
      comment: z.string(),
    }),
  }),
});

export const toeicSpeakingCoachingSchema = z.object({
  taskType: z.string(),
  relevanceCheck: z.string(),
  deliveryFeedback: z.array(z.string()),
  suggestedResponse: z.string(),
});

export const speechAssessmentResultSchema = z.object({
  assessmentId: z.string().uuid(),
  schemaVersion: z.literal("1.0"),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]),
  mode: speechAssessmentModeSchema,
  measurementTier: measurementTierSchema.nullable(),
  providers: z
    .object({
      acousticProvider: z.string(),
      coachProvider: z.string().nullable(),
    })
    .nullable(),
  transcript: z.string().nullable(),
  referenceText: z.string().nullable(),
  acousticMetrics: z
    .object({
      durationMs: z.number().int().nonnegative(),
      wordsPerMinute: z.number().nonnegative(),
      accuracyScore: z.number().min(0).max(100),
      fluencyScore: z.number().min(0).max(100),
      completenessScore: z.number().min(0).max(100),
      prosody: prosodyMetricsSchema.nullable(),
      words: z.array(assessedWordSchema),
    })
    .nullable(),
  llmCoachingFeedback: z
    .object({
      disclaimer: z.string(),
      fluencyNotes: z.array(z.string()),
      intonationGuidance: z.array(z.string()),
      grammarCorrections: z.array(
        z.object({
          original: z.string(),
          suggested: z.string(),
          reason: z.string(),
        })
      ),
      ieltsCoaching: ieltsCoachingSchema.nullable(),
      toeicCoaching: toeicSpeakingCoachingSchema.nullable(),
    })
    .nullable(),
  audioDeleted: z.boolean().default(false),
  errorCode: z.string().nullable().optional(),
  createdAt: z.string(),
  completedAt: z.string().nullable().optional(),
});
export type SpeechAssessmentResult = z.infer<
  typeof speechAssessmentResultSchema
>;

export const vocabExplainRequestSchema = z.object({
  word: z.string().trim().min(1).max(80),
  cefrLevel: cefrLevelSchema.default("B1"),
  contextSentence: z.string().trim().max(500).optional(),
});
export type VocabExplainRequest = z.infer<typeof vocabExplainRequestSchema>;

export const vocabExplainResponseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  word: z.string(),
  cefrLevel: cefrLevelSchema,
  partOfSpeech: z.string(),
  simpleDefinition: z.string(),
  nuanceNote: z.string(),
  collocations: z.array(z.string()),
  examples: z.array(
    z.object({
      sentence: z.string(),
      context: z.string(),
    })
  ),
});
export type VocabExplainResponse = z.infer<typeof vocabExplainResponseSchema>;

export const toeicExplainRequestSchema = z.object({
  transcript: z.string().trim().min(5).max(3000),
  questionPrompt: z.string().trim().min(3).max(600),
  options: z.array(z.string()).min(2).max(6),
  correctAnswer: z.string().trim().min(1).max(200),
});
export type ToeicExplainRequest = z.infer<typeof toeicExplainRequestSchema>;

export const toeicExplainResponseSchema = z.object({
  schemaVersion: z.literal("1.0"),
  provider: z.string(),
  summary: z.string(),
  whyCorrect: z.string(),
  distractorBreakdown: z.array(
    z.object({
      option: z.string(),
      reason: z.string(),
    })
  ),
  keyVocabulary: z.array(
    z.object({
      term: z.string(),
      meaning: z.string(),
      example: z.string(),
    })
  ),
});
export type ToeicExplainResponse = z.infer<typeof toeicExplainResponseSchema>;
