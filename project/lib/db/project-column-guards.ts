import { type SQL, sql } from "drizzle-orm";
import { z } from "zod";

export const PROJECT_COMPLETION_LOCK_NAMESPACE = "semantic-completion:";

const projectIdSchema = z.string().uuid("Invalid project ID");

export function validateProjectId(projectId: string): string {
	return projectIdSchema.parse(projectId).toLowerCase();
}

export function projectCompletionAdvisoryLock(projectId: string): SQL {
	const validatedProjectId = validateProjectId(projectId);

	return sql`select pg_advisory_xact_lock(hashtextextended(
		${PROJECT_COMPLETION_LOCK_NAMESPACE} || ${validatedProjectId}::uuid::text,
		0
	))`;
}

export function projectCompletionAdvisoryLocks(
	projectIds: readonly string[],
): SQL[] {
	return [...new Set(projectIds.map(validateProjectId))]
		.sort()
		.map(projectCompletionAdvisoryLock);
}

export function canManageProjectColumns(
	clerkId: string,
	projectId: string,
): SQL<boolean> {
	return sql<boolean>`exists (
		select 1
		from "users" actor
		join "projects" project on project."id" = ${projectId}::uuid
		where actor."clerk_id" = ${clerkId}
			and (
				project."owner_id" = actor."id"
				or exists (
					select 1
					from "project_members" membership
					where membership."project_id" = project."id"
						and membership."user_id" = actor."id"
						and membership."role" = 'admin'
				)
			)
	)`;
}

export function canAccessProject(
	clerkId: string,
	projectId: string | SQL,
): SQL<boolean> {
	const projectIdExpression =
		typeof projectId === "string"
			? sql`${validateProjectId(projectId)}::uuid`
			: projectId;

	return sql<boolean>`exists (
		select 1
		from "users" actor
		join "projects" project on project."id" = ${projectIdExpression}
		where actor."clerk_id" = ${clerkId}
			and (
				project."owner_id" = actor."id"
				or exists (
					select 1
					from "project_members" membership
					where membership."project_id" = project."id"
						and membership."user_id" = actor."id"
				)
			)
	)`;
}

export function validProjectListTarget(
	projectId: string,
	listId: string,
): SQL<boolean> {
	return sql<boolean>`exists (
		select 1
		from "lists" target
		where target."id" = ${listId}::uuid
			and target."project_id" = ${projectId}::uuid
	)`;
}
