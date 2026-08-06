CREATE TYPE "NewsStatus" AS ENUM ('draft', 'published');

ALTER TABLE "news"
ADD COLUMN "excerpt" TEXT,
ADD COLUMN "status" "NewsStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "published_at" TIMESTAMP(3),
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "news"
SET
  "target_role" = COALESCE("target_role", 'all'),
  "status" = 'published',
  "published_at" = "created_at";

ALTER TABLE "news"
ALTER COLUMN "target_role" SET DEFAULT 'all',
ALTER COLUMN "target_role" SET NOT NULL;

CREATE INDEX "news_tenant_id_status_published_at_idx"
ON "news"("tenant_id", "status", "published_at");
