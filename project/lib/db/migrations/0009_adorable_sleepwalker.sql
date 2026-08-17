ALTER TABLE "tasks" DROP COLUMN IF EXISTS "status";
ALTER TABLE "lists" DROP CONSTRAINT IF EXISTS "list_project_position_unique";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "task_list_position_unique";
