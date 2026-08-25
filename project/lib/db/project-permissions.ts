import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lists, projectMembers, projects, tasks, users } from "@/lib/db/schema";
import {
	getEffectiveProjectPermission,
	getProjectCapabilities,
	type ProjectCapabilities,
	type ProjectPermission,
} from "@/lib/project-permissions";

export type ProjectCapability = keyof ProjectCapabilities;

export interface ProjectAuthorization {
	userId: string;
	projectId: string;
	permission: ProjectPermission;
	capabilities: ProjectCapabilities;
}

export async function getProjectAuthorization(
	clerkId: string,
	projectId: string,
): Promise<ProjectAuthorization | null> {
	const actor = await db.query.users.findFirst({
		where: eq(users.clerkId, clerkId),
		columns: { id: true },
	});
	if (!actor) return null;

	const [project, membership] = await Promise.all([
		db.query.projects.findFirst({
			where: eq(projects.id, projectId),
			columns: { id: true, ownerId: true },
		}),
		db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, actor.id),
			),
			columns: { role: true },
		}),
	]);
	if (!project) return null;

	const permission = getEffectiveProjectPermission(
		project.ownerId,
		actor.id,
		membership?.role,
	);
	if (!permission) return null;

	return {
		userId: actor.id,
		projectId: project.id,
		permission,
		capabilities: getProjectCapabilities(permission),
	};
}

export async function requireProjectCapability(
	clerkId: string,
	projectId: string,
	capability: ProjectCapability,
): Promise<ProjectAuthorization> {
	const authorization = await getProjectAuthorization(clerkId, projectId);
	if (!authorization?.capabilities[capability]) {
		throw new Error("You do not have permission to perform this action.");
	}
	return authorization;
}

export async function getTaskProjectId(taskId: string): Promise<string | null> {
	const row = await db
		.select({ projectId: lists.projectId })
		.from(tasks)
		.innerJoin(lists, eq(tasks.listId, lists.id))
		.where(eq(tasks.id, taskId))
		.limit(1);
	return row[0]?.projectId ?? null;
}

export async function requireTaskCapability(
	clerkId: string,
	taskId: string,
	capability: ProjectCapability,
): Promise<ProjectAuthorization> {
	const projectId = await getTaskProjectId(taskId);
	if (!projectId) throw new Error("Task not found.");
	return requireProjectCapability(clerkId, projectId, capability);
}
