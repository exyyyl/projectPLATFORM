-- Prevent duplicate administrative catalog entries inside one tenant.
CREATE UNIQUE INDEX "groups_tenant_id_name_key" ON "groups"("tenant_id", "name");
CREATE UNIQUE INDEX "disciplines_tenant_id_name_key" ON "disciplines"("tenant_id", "name");

-- A concrete teacher teaching a concrete discipline to a concrete group.
CREATE TABLE "teaching_assignments" (
    "id" SERIAL NOT NULL,
    "discipline_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teaching_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teaching_assignments_discipline_id_teacher_id_group_id_key"
    ON "teaching_assignments"("discipline_id", "teacher_id", "group_id");
CREATE INDEX "teaching_assignments_teacher_id_idx" ON "teaching_assignments"("teacher_id");
CREATE INDEX "teaching_assignments_group_id_idx" ON "teaching_assignments"("group_id");

ALTER TABLE "teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_discipline_id_fkey"
    FOREIGN KEY ("discipline_id") REFERENCES "disciplines"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_teacher_id_fkey"
    FOREIGN KEY ("teacher_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "teaching_assignments"
    ADD CONSTRAINT "teaching_assignments_group_id_fkey"
    FOREIGN KEY ("group_id") REFERENCES "groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
