-- AlterTable: a student may submit the feedback form only once.
CREATE UNIQUE INDEX "feedback_submittedById_key" ON "feedback"("submittedById");