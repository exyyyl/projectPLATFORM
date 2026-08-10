ALTER TYPE "UserRole" ADD VALUE 'superadmin';
ALTER TYPE "NewsTargetRole" ADD VALUE 'superadmin';
ALTER TYPE "NotificationType" ADD VALUE 'material_published';

CREATE TYPE "CourseStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "MaterialReleaseStatus" AS ENUM ('draft', 'scheduled', 'published', 'withheld');

ALTER TABLE "courses"
ADD COLUMN "title" TEXT,
ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN "status" "CourseStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "courses" AS "course"
SET
  "title" = "discipline"."name",
  "status" = 'published'
FROM "disciplines" AS "discipline"
WHERE "discipline"."id" = "course"."discipline_id";

ALTER TABLE "courses" ALTER COLUMN "title" SET NOT NULL;

CREATE TABLE "course_groups" (
  "id" SERIAL NOT NULL,
  "course_id" INTEGER NOT NULL,
  "teaching_assignment_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_groups_course_id_teaching_assignment_id_key"
ON "course_groups"("course_id", "teaching_assignment_id");

CREATE INDEX "course_groups_teaching_assignment_id_idx"
ON "course_groups"("teaching_assignment_id");

ALTER TABLE "course_groups"
ADD CONSTRAINT "course_groups_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_groups"
ADD CONSTRAINT "course_groups_teaching_assignment_id_fkey"
FOREIGN KEY ("teaching_assignment_id") REFERENCES "teaching_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "course_groups" ("course_id", "teaching_assignment_id")
SELECT "course"."id", "assignment"."id"
FROM "courses" AS "course"
JOIN "teaching_assignments" AS "assignment"
  ON "assignment"."discipline_id" = "course"."discipline_id"
 AND "assignment"."teacher_id" = "course"."teacher_id";

ALTER TABLE "materials"
ADD COLUMN "default_available_at" TIMESTAMP(3),
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "material_releases" (
  "id" SERIAL NOT NULL,
  "material_id" INTEGER NOT NULL,
  "course_group_id" INTEGER NOT NULL,
  "status" "MaterialReleaseStatus" NOT NULL DEFAULT 'draft',
  "scheduled_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "notified_at" TIMESTAMP(3),
  "is_overridden" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "material_releases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "material_releases_material_id_course_group_id_key"
ON "material_releases"("material_id", "course_group_id");

CREATE INDEX "material_releases_course_group_id_status_scheduled_at_idx"
ON "material_releases"("course_group_id", "status", "scheduled_at");

ALTER TABLE "material_releases"
ADD CONSTRAINT "material_releases_material_id_fkey"
FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "material_releases"
ADD CONSTRAINT "material_releases_course_group_id_fkey"
FOREIGN KEY ("course_group_id") REFERENCES "course_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "material_releases" (
  "material_id",
  "course_group_id",
  "status",
  "published_at"
)
SELECT
  "material"."id",
  "course_group"."id",
  'published',
  "material"."created_at"
FROM "materials" AS "material"
JOIN "course_groups" AS "course_group"
  ON "course_group"."course_id" = "material"."course_id";

ALTER TABLE "notifications"
ADD COLUMN "title" TEXT,
ADD COLUMN "body" TEXT,
ADD COLUMN "data" JSONB NOT NULL DEFAULT '{}';
