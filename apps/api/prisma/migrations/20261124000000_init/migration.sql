-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'BANNED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EntitlementTier" AS ENUM ('FREE', 'PRO', 'LIFETIME');

-- CreateEnum
CREATE TYPE "MediaAssetStatus" AS ENUM ('PENDING_UPLOAD', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- CreateEnum
CREATE TYPE "MediaTransportType" AS ENUM ('YOUTUBE', 'AUDIO', 'VIDEO');

-- CreateEnum
CREATE TYPE "LessonVisibility" AS ENUM ('SYSTEM', 'COMMUNITY_PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DeckVisibility" AS ENUM ('SYSTEM', 'PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ExamTrackCode" AS ENUM ('IELTS', 'TOEIC');

-- CreateEnum
CREATE TYPE "ExamMode" AS ENUM ('TEST', 'PRACTICE');

-- CreateEnum
CREATE TYPE "ExamSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "username" TEXT,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "birthDate" DATE,
    "ageVerifiedAt" TIMESTAMP(3),
    "preferredUiLocale" TEXT NOT NULL DEFAULT 'en',
    "preferredTranslateLang" TEXT NOT NULL DEFAULT 'vi',
    "selectedAvatarFrameId" TEXT,
    "selectedBackgroundId" TEXT,
    "selectedBadgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitlementGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "EntitlementTier" NOT NULL,
    "source" TEXT NOT NULL,
    "transactionId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntitlementGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "purpose" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "sha256" TEXT,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiAuditLog" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "userId" TEXT,
    "taskType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT,
    "inputSha256" TEXT NOT NULL,
    "tokenInput" INTEGER NOT NULL DEFAULT 0,
    "tokenOutput" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameJson" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaType" "MediaTransportType" NOT NULL,
    "youtubeVideoId" TEXT,
    "mediaAssetId" TEXT,
    "thumbnailUrl" TEXT,
    "cefrLevel" "CefrLevel" NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "isDailyFeatured" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "LessonVisibility" NOT NULL DEFAULT 'SYSTEM',
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTopic" (
    "lessonId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "LessonTopic_pkey" PRIMARY KEY ("lessonId","topicId")
);

-- CreateTable
CREATE TABLE "LessonSentence" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "ipaText" TEXT,
    "translationsJson" JSONB,
    "wordsTimingJson" JSONB,

    CONSTRAINT "LessonSentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "totalSentences" INTEGER NOT NULL,
    "averageScore" DOUBLE PRECISION,
    "activeTimeSec" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentenceAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentenceId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "accuracyScore" INTEGER NOT NULL,
    "mistakesCount" INTEGER NOT NULL DEFAULT 0,
    "replayCount" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentenceAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarTopic" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "localizedJson" JSONB NOT NULL,
    "cefrLevel" "CefrLevel" NOT NULL,
    "orderInSyllabus" INTEGER NOT NULL,
    "shortDefinition" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "examTags" TEXT[],

    CONSTRAINT "GrammarTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "localizedJson" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "cefrLevel" "CefrLevel" NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "readingTimeMin" INTEGER NOT NULL,
    "coverImageUrl" TEXT,
    "mediaAssetId" TEXT,
    "durationMs" INTEGER,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryScene" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sceneIndex" INTEGER NOT NULL,
    "title" TEXT,
    "imageUrl" TEXT,
    "sentencesJson" JSONB NOT NULL,
    "vocabJson" JSONB,

    CONSTRAINT "StoryScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabDeck" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cefrLevel" "CefrLevel" NOT NULL DEFAULT 'B1',
    "ownerId" TEXT,
    "visibility" "DeckVisibility" NOT NULL DEFAULT 'SYSTEM',
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabCard" (
    "id" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "groupLabel" TEXT,
    "term" TEXT NOT NULL,
    "phonetic" TEXT,
    "partOfSpeech" TEXT,
    "definitionsJson" JSONB NOT NULL,
    "audioUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VocabCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVocabReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'NEW',
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResult" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVocabReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionaryEntry" (
    "word" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "phoneticsJson" JSONB NOT NULL,
    "meaningsJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DictionaryEntry_pkey" PRIMARY KEY ("word")
);

-- CreateTable
CREATE TABLE "ExamType" (
    "id" TEXT NOT NULL,
    "code" "ExamTrackCode" NOT NULL,
    "nameJson" JSONB NOT NULL,

    CONSTRAINT "ExamType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSet" (
    "id" TEXT NOT NULL,
    "examTypeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameJson" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalExams" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ExamSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "examSetId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleJson" JSONB NOT NULL,
    "skillSection" TEXT,
    "totalQuestions" INTEGER NOT NULL,
    "totalDurationSeconds" INTEGER NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPart" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "partNumber" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "mediaAssetId" TEXT,

    CONSTRAINT "ExamPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionGroup" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "stimulusHtml" TEXT,
    "imageUrls" TEXT[],
    "optionsJson" JSONB,

    CONSTRAINT "QuestionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "answerFormat" TEXT NOT NULL,
    "promptHtml" TEXT,
    "choicesJson" JSONB,
    "maxWords" INTEGER,
    "skillTag" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "explanationHtml" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "mode" "ExamMode" NOT NULL,
    "selectedParts" INTEGER[],
    "status" "ExamSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER,
    "totalQuestions" INTEGER NOT NULL,
    "ieltsBand" DOUBLE PRECISION,
    "toeicListening" INTEGER,
    "toeicReading" INTEGER,
    "toeicTotalScaled" INTEGER,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionAnswer" (
    "sessionId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "selectedValue" TEXT NOT NULL,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionAnswer_pkey" PRIMARY KEY ("sessionId","questionNumber")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "xpTotal" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "diamondBalance" INTEGER NOT NULL DEFAULT 0,
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "longestStreakDays" INTEGER NOT NULL DEFAULT 0,
    "streakFreezesOwned" INTEGER NOT NULL DEFAULT 0,
    "lastCheckInDate" DATE,
    "activeTimeSec" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DiamondLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiamondLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingRoom" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "cefrLevel" "CefrLevel" NOT NULL DEFAULT 'B1',
    "maxParticipants" INTEGER NOT NULL DEFAULT 4,
    "currentParticipants" INTEGER NOT NULL DEFAULT 1,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "lessonId" TEXT,
    "examId" TEXT,
    "storyId" TEXT,
    "postId" TEXT,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tier" "EntitlementTier" NOT NULL,
    "durationDays" INTEGER,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTxId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "promoCodeId" TEXT,
    "affiliateCodeUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL DEFAULT 2000,

    CONSTRAINT "AffiliateAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerUserId_key" ON "OAuthAccount"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_refreshTokenHash_key" ON "AuthSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_revokedAt_idx" ON "AuthSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "AuthSession_familyId_idx" ON "AuthSession"("familyId");

-- CreateIndex
CREATE INDEX "EntitlementGrant_userId_expiresAt_revokedAt_idx" ON "EntitlementGrant"("userId", "expiresAt", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_objectKey_key" ON "MediaAsset"("objectKey");

-- CreateIndex
CREATE INDEX "MediaAsset_ownerId_purpose_idx" ON "MediaAsset"("ownerId", "purpose");

-- CreateIndex
CREATE INDEX "MediaAsset_expiresAt_idx" ON "MediaAsset"("expiresAt");

-- CreateIndex
CREATE INDEX "AiAuditLog_userId_createdAt_idx" ON "AiAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiAuditLog_taskType_status_createdAt_idx" ON "AiAuditLog"("taskType", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_slug_key" ON "Lesson"("slug");

-- CreateIndex
CREATE INDEX "Lesson_visibility_isPro_cefrLevel_idx" ON "Lesson"("visibility", "isPro", "cefrLevel");

-- CreateIndex
CREATE INDEX "Lesson_authorId_idx" ON "Lesson"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonSentence_lessonId_orderIndex_key" ON "LessonSentence"("lessonId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_mode_key" ON "LessonProgress"("userId", "lessonId", "mode");

-- CreateIndex
CREATE INDEX "SentenceAttempt_userId_sentenceId_idx" ON "SentenceAttempt"("userId", "sentenceId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarTopic_slug_key" ON "GrammarTopic"("slug");

-- CreateIndex
CREATE INDEX "GrammarTopic_cefrLevel_orderInSyllabus_idx" ON "GrammarTopic"("cefrLevel", "orderInSyllabus");

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE INDEX "Story_cefrLevel_collection_idx" ON "Story"("cefrLevel", "collection");

-- CreateIndex
CREATE UNIQUE INDEX "StoryScene_storyId_sceneIndex_key" ON "StoryScene"("storyId", "sceneIndex");

-- CreateIndex
CREATE UNIQUE INDEX "VocabDeck_slug_key" ON "VocabDeck"("slug");

-- CreateIndex
CREATE INDEX "VocabDeck_visibility_isPro_cefrLevel_idx" ON "VocabDeck"("visibility", "isPro", "cefrLevel");

-- CreateIndex
CREATE INDEX "VocabCard_deckId_orderIndex_idx" ON "VocabCard"("deckId", "orderIndex");

-- CreateIndex
CREATE INDEX "UserVocabReview_userId_nextReviewAt_idx" ON "UserVocabReview"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserVocabReview_userId_cardId_key" ON "UserVocabReview"("userId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamType_code_key" ON "ExamType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSet_slug_key" ON "ExamSet"("slug");

-- CreateIndex
CREATE INDEX "ExamSet_examTypeId_isActive_sortOrder_idx" ON "ExamSet"("examTypeId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_slug_key" ON "Exam"("slug");

-- CreateIndex
CREATE INDEX "Exam_examSetId_isFree_sortOrder_idx" ON "Exam"("examSetId", "isFree", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ExamPart_examId_partNumber_key" ON "ExamPart"("examId", "partNumber");

-- CreateIndex
CREATE INDEX "QuestionGroup_partId_orderIndex_idx" ON "QuestionGroup"("partId", "orderIndex");

-- CreateIndex
CREATE INDEX "Question_groupId_orderIndex_idx" ON "Question"("groupId", "orderIndex");

-- CreateIndex
CREATE INDEX "ExamSession_userId_status_startedAt_idx" ON "ExamSession"("userId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "ExamSession_status_deadlineAt_idx" ON "ExamSession"("status", "deadlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiamondLedger_idempotencyKey_key" ON "DiamondLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "DiamondLedger_userId_createdAt_idx" ON "DiamondLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "XpLedger_idempotencyKey_key" ON "XpLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "XpLedger_userId_createdAt_idx" ON "XpLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserInventory_userId_itemId_key" ON "UserInventory"("userId", "itemId");

-- CreateIndex
CREATE INDEX "CommunityPost_topic_createdAt_idx" ON "CommunityPost"("topic", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingRoom_isActive_cefrLevel_createdAt_idx" ON "SpeakingRoom"("isActive", "cefrLevel", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_lessonId_createdAt_idx" ON "Comment"("lessonId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_examId_createdAt_idx" ON "Comment"("examId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_storyId_createdAt_idx" ON "Comment"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_providerTxId_key" ON "PaymentTransaction"("providerTxId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_userId_status_idx" ON "PaymentTransaction"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateAccount_userId_key" ON "AffiliateAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateAccount_code_key" ON "AffiliateAccount"("code");

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitlementGrant" ADD CONSTRAINT "EntitlementGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTopic" ADD CONSTRAINT "LessonTopic_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTopic" ADD CONSTRAINT "LessonTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSentence" ADD CONSTRAINT "LessonSentence_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceAttempt" ADD CONSTRAINT "SentenceAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceAttempt" ADD CONSTRAINT "SentenceAttempt_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "LessonSentence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryScene" ADD CONSTRAINT "StoryScene_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabDeck" ADD CONSTRAINT "VocabDeck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabCard" ADD CONSTRAINT "VocabCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "VocabDeck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabReview" ADD CONSTRAINT "UserVocabReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVocabReview" ADD CONSTRAINT "UserVocabReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "VocabCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSet" ADD CONSTRAINT "ExamSet_examTypeId_fkey" FOREIGN KEY ("examTypeId") REFERENCES "ExamType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_examSetId_fkey" FOREIGN KEY ("examSetId") REFERENCES "ExamSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPart" ADD CONSTRAINT "ExamPart_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGroup" ADD CONSTRAINT "QuestionGroup_partId_fkey" FOREIGN KEY ("partId") REFERENCES "ExamPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "QuestionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionAnswer" ADD CONSTRAINT "SessionAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiamondLedger" ADD CONSTRAINT "DiamondLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInventory" ADD CONSTRAINT "UserInventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingRoom" ADD CONSTRAINT "SpeakingRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateAccount" ADD CONSTRAINT "AffiliateAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

