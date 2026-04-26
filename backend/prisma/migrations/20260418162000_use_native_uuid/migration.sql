ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_userId_fkey";
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_ownerId_fkey";
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_postId_fkey";
ALTER TABLE "meetings" DROP CONSTRAINT "meetings_requesterId_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";
ALTER TABLE "posts" DROP CONSTRAINT "posts_userId_fkey";
ALTER TABLE "time_slots" DROP CONSTRAINT "time_slots_meetingId_fkey";

ALTER TABLE "users"
  ALTER COLUMN "id" TYPE UUID USING ("id"::uuid);

ALTER TABLE "posts"
  ALTER COLUMN "id" TYPE UUID USING ("id"::uuid),
  ALTER COLUMN "userId" TYPE UUID USING ("userId"::uuid);

ALTER TABLE "meetings"
  ALTER COLUMN "id" TYPE UUID USING ("id"::uuid),
  ALTER COLUMN "postId" TYPE UUID USING ("postId"::uuid),
  ALTER COLUMN "requesterId" TYPE UUID USING ("requesterId"::uuid),
  ALTER COLUMN "ownerId" TYPE UUID USING ("ownerId"::uuid);

ALTER TABLE "time_slots"
  ALTER COLUMN "id" TYPE UUID USING ("id"::uuid),
  ALTER COLUMN "meetingId" TYPE UUID USING ("meetingId"::uuid),
  ALTER COLUMN "proposedBy" TYPE UUID USING ("proposedBy"::uuid);

ALTER TABLE "notifications"
  ALTER COLUMN "id" TYPE UUID USING ("id"::uuid),
  ALTER COLUMN "userId" TYPE UUID USING ("userId"::uuid);

ALTER TABLE "activity_logs"
  ALTER COLUMN "id" TYPE UUID USING ("id"::uuid),
  ALTER COLUMN "userId" TYPE UUID USING ("userId"::uuid);

ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_slots" ADD CONSTRAINT "time_slots_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
