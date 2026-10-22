-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ACCOUNT';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "event" TEXT,
ADD COLUMN     "meta" JSONB,
ALTER COLUMN "read" SET DEFAULT false;

-- CreateIndex
CREATE INDEX "Notification_userId_deleted_at_idx" ON "Notification"("userId", "deleted_at");
