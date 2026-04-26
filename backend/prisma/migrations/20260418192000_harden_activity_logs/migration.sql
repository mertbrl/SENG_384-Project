ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'failed_login';
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'security_event';

ALTER TABLE "activity_logs" DROP CONSTRAINT "activity_logs_userId_fkey";

ALTER TABLE "activity_logs" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "activity_logs" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
ALTER TABLE "activity_logs" ALTER COLUMN "role" SET DEFAULT 'unknown';

ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
