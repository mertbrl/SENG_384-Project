CREATE TYPE "InterestStatus" AS ENUM ('pending', 'acknowledged', 'meeting_requested', 'withdrawn');

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'interest_received';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'interest_update';

ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'interest_express';
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'interest_update';

CREATE TABLE "interests" (
  "id" UUID NOT NULL,
  "postId" UUID NOT NULL,
  "requesterId" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "message" TEXT NOT NULL DEFAULT '',
  "status" "InterestStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interest_time_slots" (
  "id" UUID NOT NULL,
  "interestId" UUID NOT NULL,
  "proposedAt" TIMESTAMP(3) NOT NULL,
  "proposedBy" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interest_time_slots_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "meetings" ADD COLUMN "interestId" UUID;

CREATE INDEX "interests_postId_idx" ON "interests"("postId");
CREATE INDEX "interests_requesterId_idx" ON "interests"("requesterId");
CREATE INDEX "interests_ownerId_idx" ON "interests"("ownerId");
CREATE INDEX "interests_status_idx" ON "interests"("status");
CREATE INDEX "interest_time_slots_interestId_idx" ON "interest_time_slots"("interestId");
CREATE INDEX "meetings_interestId_idx" ON "meetings"("interestId");

ALTER TABLE "interests" ADD CONSTRAINT "interests_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interests" ADD CONSTRAINT "interests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interests" ADD CONSTRAINT "interests_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interest_time_slots" ADD CONSTRAINT "interest_time_slots_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "interests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
