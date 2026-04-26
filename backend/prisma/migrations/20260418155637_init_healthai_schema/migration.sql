CREATE TYPE "UserRole" AS ENUM ('engineer', 'healthcare', 'admin');

CREATE TYPE "PostStatus" AS ENUM ('draft', 'active', 'meeting_scheduled', 'partner_found', 'expired');

CREATE TYPE "ProjectStage" AS ENUM ('idea', 'prototype', 'pilot', 'scaling');

CREATE TYPE "CommitmentLevel" AS ENUM ('low', 'medium', 'high');

CREATE TYPE "ConfidentialityLevel" AS ENUM ('public', 'nda_required');

CREATE TYPE "MeetingStatus" AS ENUM ('pending', 'accepted', 'declined', 'scheduled', 'cancelled');

CREATE TYPE "NotificationType" AS ENUM ('verification', 'meeting_request', 'meeting_update', 'post_expired', 'system');

CREATE TYPE "ActionType" AS ENUM ('register', 'login', 'logout', 'verify_email', 'profile_update', 'account_delete', 'data_export', 'post_create', 'post_edit', 'post_delete', 'post_status_change', 'meeting_request', 'meeting_update', 'admin_suspend_user', 'admin_remove_post', 'admin_view_logs');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "institution" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'Turkey',
    "expertise" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "workingDomain" TEXT NOT NULL,
    "projectStage" "ProjectStage" NOT NULL DEFAULT 'idea',
    "requiredExpertise" TEXT NOT NULL,
    "healthcareNeed" TEXT NOT NULL DEFAULT '',
    "technicalNeed" TEXT NOT NULL DEFAULT '',
    "commitmentLevel" "CommitmentLevel" NOT NULL DEFAULT 'medium',
    "collaborationType" TEXT NOT NULL DEFAULT '',
    "confidentialityLevel" "ConfidentialityLevel" NOT NULL DEFAULT 'public',
    "shortExplanation" TEXT NOT NULL DEFAULT '',
    "highLevelIdea" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'Turkey',
    "city" TEXT NOT NULL DEFAULT '',
    "expiryDate" TIMESTAMP(3),
    "autoClose" BOOLEAN NOT NULL DEFAULT false,
    "status" "PostStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" TEXT,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "ndaAccepted" BOOLEAN NOT NULL DEFAULT false,
    "status" "MeetingStatus" NOT NULL DEFAULT 'pending',
    "selectedSlot" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_slots" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "proposedAt" TIMESTAMP(3) NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "targetEntity" TEXT NOT NULL DEFAULT '',
    "resultStatus" TEXT NOT NULL DEFAULT 'success',
    "details" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "users_email_idx" ON "users"("email");

CREATE INDEX "users_role_idx" ON "users"("role");

CREATE INDEX "users_city_country_idx" ON "users"("city", "country");

CREATE INDEX "posts_userId_idx" ON "posts"("userId");

CREATE INDEX "posts_status_idx" ON "posts"("status");

CREATE INDEX "posts_workingDomain_idx" ON "posts"("workingDomain");

CREATE INDEX "posts_city_country_idx" ON "posts"("city", "country");

CREATE INDEX "posts_expiryDate_idx" ON "posts"("expiryDate");

CREATE INDEX "meetings_postId_idx" ON "meetings"("postId");

CREATE INDEX "meetings_requesterId_idx" ON "meetings"("requesterId");

CREATE INDEX "meetings_ownerId_idx" ON "meetings"("ownerId");

CREATE INDEX "meetings_status_idx" ON "meetings"("status");

CREATE INDEX "time_slots_meetingId_idx" ON "time_slots"("meetingId");

CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

CREATE INDEX "notifications_read_idx" ON "notifications"("read");

CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

CREATE INDEX "activity_logs_actionType_idx" ON "activity_logs"("actionType");

CREATE INDEX "activity_logs_timestamp_idx" ON "activity_logs"("timestamp");

ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
