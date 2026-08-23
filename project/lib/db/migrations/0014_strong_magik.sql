ALTER TABLE "lists" ADD COLUMN "is_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$
BEGIN
	PERFORM pg_advisory_xact_lock(
		hashtextextended('semantic-completion:' || project_to_lock."id"::text, 0)
	)
	FROM (
		SELECT "id"
		FROM "projects"
		ORDER BY "id"
	) project_to_lock;

	IF EXISTS (
		SELECT 1
		FROM "projects" project_row
		LEFT JOIN "lists" list_row ON list_row."project_id" = project_row."id"
		GROUP BY project_row."id"
		HAVING count(list_row."id") = 0
	) THEN
		RAISE EXCEPTION '0014 aborted: a project has zero columns; no implicit Done column was inserted';
	END IF;
END
$$;--> statement-breakpoint
WITH ranked_lists AS (
	SELECT
		list_row."id",
		row_number() OVER (
			PARTITION BY list_row."project_id"
			ORDER BY
				CASE
					WHEN lower(btrim(list_row."name")) IN ('done', 'complete', 'completed') THEN 0
					ELSE 1
				END,
				list_row."position" DESC,
				list_row."id" DESC
		) AS completion_rank
	FROM "lists" list_row
)
UPDATE "lists" list_row
SET "is_completed" = true
FROM ranked_lists ranked
WHERE list_row."id" = ranked."id"
	AND ranked.completion_rank = 1;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "projects" project_row
		LEFT JOIN "lists" list_row ON list_row."project_id" = project_row."id"
		GROUP BY project_row."id"
		HAVING count(list_row."id") FILTER (WHERE list_row."is_completed") = 0
	) THEN
		RAISE EXCEPTION '0014 aborted: a project has zero completed columns after backfill';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "lists" list_row
		WHERE list_row."is_completed"
		GROUP BY list_row."project_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION '0014 aborted: a project has multiple completed columns after backfill';
	END IF;
END
$$;--> statement-breakpoint
CREATE UNIQUE INDEX "list_project_completed_unique" ON "lists" USING btree ("project_id") WHERE "lists"."is_completed" = true;
