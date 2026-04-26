CREATE TYPE "ProjectStage_new" AS ENUM ('idea', 'concept_validation', 'prototype_developed', 'pilot_testing', 'pre_deployment');

ALTER TABLE "posts" ALTER COLUMN "projectStage" DROP DEFAULT;

ALTER TABLE "posts" ALTER COLUMN "projectStage" TYPE "ProjectStage_new" USING (
  CASE "projectStage"::text
    WHEN 'prototype' THEN 'prototype_developed'
    WHEN 'pilot' THEN 'pilot_testing'
    WHEN 'scaling' THEN 'pre_deployment'
    ELSE "projectStage"::text
  END
)::"ProjectStage_new";

ALTER TABLE "posts" ALTER COLUMN "projectStage" SET DEFAULT 'idea';

DROP TYPE "ProjectStage";

ALTER TYPE "ProjectStage_new" RENAME TO "ProjectStage";
