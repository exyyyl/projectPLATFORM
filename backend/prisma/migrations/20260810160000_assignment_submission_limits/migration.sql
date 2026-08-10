ALTER TABLE "course_template_assignments"
ADD COLUMN "max_attempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "max_files" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "max_file_size_bytes" INTEGER NOT NULL DEFAULT 26214400,
ADD COLUMN "max_total_size_bytes" INTEGER NOT NULL DEFAULT 52428800,
ADD COLUMN "allow_late_submissions" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "assignments"
ADD COLUMN "max_attempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "max_files" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "max_file_size_bytes" INTEGER NOT NULL DEFAULT 26214400,
ADD COLUMN "max_total_size_bytes" INTEGER NOT NULL DEFAULT 52428800,
ADD COLUMN "allow_late_submissions" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "course_template_assignments"
ADD CONSTRAINT "course_template_assignments_limits_check"
CHECK (
  "max_attempts" BETWEEN 1 AND 20
  AND "max_files" BETWEEN 1 AND 10
  AND "max_file_size_bytes" BETWEEN 1024 AND 104857600
  AND "max_total_size_bytes" >= "max_file_size_bytes"
  AND "max_total_size_bytes" <= 262144000
);

ALTER TABLE "assignments"
ADD CONSTRAINT "assignments_limits_check"
CHECK (
  "max_attempts" BETWEEN 1 AND 20
  AND "max_files" BETWEEN 1 AND 10
  AND "max_file_size_bytes" BETWEEN 1024 AND 104857600
  AND "max_total_size_bytes" >= "max_file_size_bytes"
  AND "max_total_size_bytes" <= 262144000
);
