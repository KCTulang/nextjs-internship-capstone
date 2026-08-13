"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db, queries } from "@/lib/db";
import { lists, projectMembers, projects, tasks } from "@/lib/db/schema";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

export async function searchAction(query: string) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		if (!query.trim()) {
			return { success: true, data: { projects: [], tasks: [] } };
		}

		const userProjects = await db
			.select({ projectId: projectMembers.projectId })
			.from(projectMembers)
			.where(eq(projectMembers.userId, user.id));

		const userOwnedProjects = await db
			.select({ projectId: projects.id })
			.from(projects)
			.where(eq(projects.ownerId, user.id));

		const projectIds = Array.from(
			new Set([
				...userProjects.map((p) => p.projectId),
				...userOwnedProjects.map((p) => p.projectId),
			]),
		);

		if (projectIds.length === 0)
			return { success: true, data: { projects: [], tasks: [] } };

		const matchedProjects = await db
			.select({
				id: projects.id,
				name: projects.name,
				slug: projects.slug,
			})
			.from(projects)
			.where(
				and(
					inArray(projects.id, projectIds),
					or(
						ilike(projects.name, `%${query}%`),
						ilike(projects.description, `%${query}%`),
					),
				),
			)
			.limit(5);

		const matchedTasks = await db
			.select({
				id: tasks.id,
				title: tasks.title,
				projectName: projects.name,
				projectSlug: projects.slug,
			})
			.from(tasks)
			.innerJoin(lists, eq(tasks.listId, lists.id))
			.innerJoin(projects, eq(lists.projectId, projects.id))
			.where(
				and(
					inArray(lists.projectId, projectIds),
					ilike(tasks.title, `%${query}%`),
				),
			)
			.limit(10);

		return {
			success: true,
			data: { projects: matchedProjects, tasks: matchedTasks },
		};
	} catch (error) {
		console.error("Search failed:", error);
		return { success: false, error: "Search failed" };
	}
}
