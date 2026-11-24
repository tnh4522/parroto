-- AlterTable
ALTER TABLE "User" ADD COLUMN "audioConsentAt" TIMESTAMP(3),
ADD COLUMN "audioConsentVersion" TEXT;

-- CreateTable
CREATE TABLE "SpeechAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaAssetId" TEXT,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "measurementTier" TEXT,
    "acousticProvider" TEXT,
    "coachProvider" TEXT,
    "referenceText" TEXT,
    "transcript" TEXT,
    "resultJson" JSONB,
    "errorCode" TEXT,
    "audioDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SpeechAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpeechAssessment_userId_createdAt_idx" ON "SpeechAssessment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeechAssessment_mediaAssetId_idx" ON "SpeechAssessment"("mediaAssetId");

-- AddForeignKey
ALTER TABLE "SpeechAssessment" ADD CONSTRAINT "SpeechAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
