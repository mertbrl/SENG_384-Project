UPDATE "posts"
SET "collaborationType" = 'advisor'
WHERE "collaborationType" = '';

UPDATE "posts" AS p
SET "healthcareNeed" = COALESCE(NULLIF(p."technicalNeed", ''), 'Healthcare workflow validation support')
FROM "users" AS u
WHERE p."userId" = u."id" AND u."role" = 'engineer' AND p."healthcareNeed" = '';

UPDATE "posts" AS p
SET "technicalNeed" = COALESCE(NULLIF(p."healthcareNeed", ''), 'Engineering implementation support')
FROM "users" AS u
WHERE p."userId" = u."id" AND u."role" = 'healthcare' AND p."technicalNeed" = '';
