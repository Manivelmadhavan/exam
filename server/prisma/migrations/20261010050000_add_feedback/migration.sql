-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classYear" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "loginEase" INTEGER NOT NULL,
    "uiRating" INTEGER NOT NULL,
    "problemReadability" TEXT NOT NULL,
    "codeEditorRating" INTEGER NOT NULL,
    "runCodeWorks" TEXT NOT NULL,
    "inputOutputEase" TEXT NOT NULL,
    "timerVisible" TEXT NOT NULL,
    "timeSufficient" TEXT NOT NULL,
    "languageSupport" TEXT NOT NULL,
    "executionSpeed" INTEGER NOT NULL,
    "resultsDisplayed" TEXT NOT NULL,
    "overallSatisfaction" INTEGER NOT NULL,
    "likedMost" TEXT,
    "issuesSeen" TEXT[],
    "improvements" TEXT,
    "useAgain" TEXT NOT NULL,
    "submittedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");