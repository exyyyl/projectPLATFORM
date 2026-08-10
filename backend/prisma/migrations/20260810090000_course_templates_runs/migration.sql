CREATE TABLE "course_templates" (
  "id" SERIAL NOT NULL,
  "tenant_id" INTEGER NOT NULL,
  "discipline_id" INTEGER NOT NULL,
  "owner_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_template_blocks" (
  "id" SERIAL NOT NULL,
  "template_id" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "order_index" INTEGER NOT NULL,
  "content" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "course_template_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_template_assignments" (
  "id" SERIAL NOT NULL,
  "template_id" INTEGER NOT NULL,
  "block_id" INTEGER,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "grading_type" "GradingType" NOT NULL,
  "max_score" INTEGER,
  "deadline_offset_days" INTEGER,
  "allowed_extensions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_template_assignments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "courses"
ADD COLUMN "template_id" INTEGER,
ADD COLUMN "academic_year" TEXT,
ADD COLUMN "semester" INTEGER,
ADD COLUMN "starts_at" TIMESTAMP(3),
ADD COLUMN "ends_at" TIMESTAMP(3),
ADD COLUMN "archived_at" TIMESTAMP(3),
ADD COLUMN "template_version" INTEGER;

ALTER TABLE "assignments" ADD COLUMN "block_id" INTEGER;

INSERT INTO "course_templates" (
  "id", "tenant_id", "discipline_id", "owner_id", "title", "description",
  "version", "is_active", "created_at", "updated_at"
)
SELECT
  "course"."id", "discipline"."tenant_id", "course"."discipline_id",
  "course"."teacher_id", "course"."title", "course"."description", 1, true,
  "course"."created_at", "course"."updated_at"
FROM "courses" AS "course"
JOIN "disciplines" AS "discipline"
  ON "discipline"."id" = "course"."discipline_id";

UPDATE "courses" SET "template_id" = "id", "template_version" = 1;

INSERT INTO "course_template_blocks" (
  "id", "template_id", "title", "order_index", "content"
)
SELECT "id", "course_id", "title", "order_index", "content"
FROM "course_blocks";

INSERT INTO "course_template_assignments" (
  "id", "template_id", "title", "description", "grading_type", "max_score",
  "allowed_extensions", "created_by", "created_at", "updated_at"
)
SELECT
  "id", "course_id", "title", "description", "grading_type", "max_score",
  "allowed_extensions", "created_by", "created_at", "updated_at"
FROM "assignments";

SELECT setval(
  pg_get_serial_sequence('course_templates', 'id'),
  COALESCE((SELECT MAX("id") FROM "course_templates"), 1),
  EXISTS (SELECT 1 FROM "course_templates")
);
SELECT setval(
  pg_get_serial_sequence('course_template_blocks', 'id'),
  COALESCE((SELECT MAX("id") FROM "course_template_blocks"), 1),
  EXISTS (SELECT 1 FROM "course_template_blocks")
);
SELECT setval(
  pg_get_serial_sequence('course_template_assignments', 'id'),
  COALESCE((SELECT MAX("id") FROM "course_template_assignments"), 1),
  EXISTS (SELECT 1 FROM "course_template_assignments")
);

CREATE INDEX "course_templates_tenant_id_is_active_idx"
ON "course_templates"("tenant_id", "is_active");
CREATE INDEX "course_templates_discipline_id_owner_id_idx"
ON "course_templates"("discipline_id", "owner_id");
CREATE INDEX "course_template_blocks_template_id_order_index_idx"
ON "course_template_blocks"("template_id", "order_index");
CREATE INDEX "course_template_assignments_template_id_block_id_idx"
ON "course_template_assignments"("template_id", "block_id");
CREATE INDEX "courses_template_id_academic_year_semester_idx"
ON "courses"("template_id", "academic_year", "semester");

ALTER TABLE "course_templates"
ADD CONSTRAINT "course_templates_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_templates"
ADD CONSTRAINT "course_templates_discipline_id_fkey"
FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_templates"
ADD CONSTRAINT "course_templates_owner_id_fkey"
FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_template_blocks"
ADD CONSTRAINT "course_template_blocks_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "course_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_template_assignments"
ADD CONSTRAINT "course_template_assignments_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "course_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_template_assignments"
ADD CONSTRAINT "course_template_assignments_block_id_fkey"
FOREIGN KEY ("block_id") REFERENCES "course_template_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "course_template_assignments"
ADD CONSTRAINT "course_template_assignments_created_by_fkey"
FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses"
ADD CONSTRAINT "courses_template_id_fkey"
FOREIGN KEY ("template_id") REFERENCES "course_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignments"
ADD CONSTRAINT "assignments_block_id_fkey"
FOREIGN KEY ("block_id") REFERENCES "course_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
