CREATE TABLE "countries" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "countryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

INSERT INTO "countries" ("id", "name", "code") VALUES
('10000000-0000-0000-0000-000000000001', 'Turkey', 'TR');

INSERT INTO "cities" ("id", "countryId", "name") VALUES
('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Istanbul'),
('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Ankara'),
('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Izmir');

ALTER TABLE "users" ADD COLUMN "countryId" UUID;
ALTER TABLE "users" ADD COLUMN "cityId" UUID;
ALTER TABLE "posts" ADD COLUMN "countryId" UUID;
ALTER TABLE "posts" ADD COLUMN "cityId" UUID;

UPDATE "users"
SET "countryId" = '10000000-0000-0000-0000-000000000001',
    "cityId" = COALESCE(
      (SELECT "id" FROM "cities" WHERE lower("name") = lower(NULLIF("users"."city", '')) LIMIT 1),
      '20000000-0000-0000-0000-000000000002'
    );

UPDATE "posts"
SET "countryId" = '10000000-0000-0000-0000-000000000001',
    "cityId" = COALESCE(
      (SELECT "id" FROM "cities" WHERE lower("name") = lower(NULLIF("posts"."city", '')) LIMIT 1),
      '20000000-0000-0000-0000-000000000002'
    );

ALTER TABLE "users" ALTER COLUMN "countryId" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "cityId" SET NOT NULL;
ALTER TABLE "posts" ALTER COLUMN "countryId" SET NOT NULL;
ALTER TABLE "posts" ALTER COLUMN "cityId" SET NOT NULL;

ALTER TABLE "users" DROP COLUMN "country";
ALTER TABLE "users" DROP COLUMN "city";
ALTER TABLE "posts" DROP COLUMN "country";
ALTER TABLE "posts" DROP COLUMN "city";

CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");
CREATE INDEX "countries_name_idx" ON "countries"("name");
CREATE UNIQUE INDEX "cities_countryId_name_key" ON "cities"("countryId", "name");
CREATE INDEX "cities_name_idx" ON "cities"("name");
CREATE INDEX "cities_countryId_idx" ON "cities"("countryId");
CREATE INDEX "users_countryId_idx" ON "users"("countryId");
CREATE INDEX "users_cityId_idx" ON "users"("cityId");
CREATE INDEX "posts_countryId_idx" ON "posts"("countryId");
CREATE INDEX "posts_cityId_idx" ON "posts"("cityId");

DROP INDEX IF EXISTS "users_city_country_idx";
DROP INDEX IF EXISTS "posts_city_country_idx";

ALTER TABLE "cities" ADD CONSTRAINT "cities_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
