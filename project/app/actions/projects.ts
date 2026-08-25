"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, queries } from "@/lib/db";
import { projectCompletionAdvisoryLock } from "@/lib/db/project-column-guards";
import { requireProjectCapability } from "@/lib/db/project-permissions";
import { lists, projectMembers, projects } from "@/lib/db/schema";
import {
	getEffectiveProjectPermission,
	getProjectCapabilities,
} from "@/lib/project-permissions";
import { hasExactlyOneCompletedList } from "@/lib/tasks/completion";
import { createProjectSchema, updateProjectSchema } from "@/utils/validations";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");

	let user = await queries.users.getByClerkId(userId);
	if (!user) {
		const clerkUser = await currentUser();
		if (!clerkUser) throw new Error("Unauthorized");

		const primaryEmail =
			clerkUser.emailAddresses[0]?.emailAddress || "no-email@example.com";
		const name =
			`${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
			"User";
		const [newUser] = await queries.users.create({
			clerkId: clerkUser.id,
			email: primaryEmail,
			name: name,
		});
		user = newUser;
	}
	return user;
}

export async function getProjectsAction(
	limit: number = 10,
	offset: number = 0,
) {
	try {
		const user = await requireAuth();
		const projectRows = await queries.projects.getAll(user.id, limit, offset);
		return {
			success: true,
			data: projectRows.map((project) => {
				const permission = getEffectiveProjectPermission(
					project.ownerId,
					user.id,
					project.members.find((member) => member.userId === user.id)?.role,
				);
				return {
					...project,
					permission,
					capabilities: getProjectCapabilities(permission),
				};
			}),
		};
	} catch (error) {
		console.error("Failed to fetch projects:", error);
		return { success: false, error: "Failed to fetch projects" };
	}
}

export async function createProjectAction(rawData: {
	name: string;
	description?: string;
	dueDate?: Date | null;
	ownerId: string;
}) {
	try {
		const user = await requireAuth();
		const data = createProjectSchema.parse(rawData);

		const baseSlug = data.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)+/g, "");
		const randomStr = Math.random().toString(36).substring(2, 6);
		const slug = `${baseSlug}-${randomStr}`;
		const projectId = crypto.randomUUID();
		const [, newProject, , , defaultLists] = await db.batch([
			db.execute(projectCompletionAdvisoryLock(projectId)),
			db
				.insert(projects)
				.values({
					id: projectId,
					name: data.name,
					slug,
					description: data.description || null,
					dueDate: data.dueDate || null,
					ownerId: user.id,
				})
				.returning(),
			db.insert(projectMembers).values({
				projectId,
				userId: user.id,
				role: "admin",
			}),
			db.insert(lists).values([
				{
					name: "To Do",
					projectId,
					position: 1000,
					isCompleted: false,
				},
				{
					name: "In Progress",
					projectId,
					position: 2000,
					isCompleted: false,
				},
				{
					name: "Done",
					projectId,
					position: 3000,
					isCompleted: true,
				},
			]),
			db.select().from(lists).where(eq(lists.projectId, projectId)),
		]);

		if (
			newProject.length !== 1 ||
			defaultLists.length !== 3 ||
			!hasExactlyOneCompletedList(defaultLists)
		) {
			throw new Error("Failed to create a valid project board");
		}

		revalidatePath("/dashboard");
		return {
			success: true,
			data: {
				...newProject[0],
				permission: "owner" as const,
				capabilities: getProjectCapabilities("owner"),
			},
		};
	} catch (error) {
		console.error("Failed to create project:", error);
		return { success: false, error: "Failed to create project" };
	}
}

export async function deleteProjectAction(projectId: string) {
	try {
		const user = await requireAuth();
		await requireProjectCapability(user.clerkId, projectId, "canDeleteProject");
		await queries.projects.delete(projectId);
		revalidatePath("/dashboard");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete project:", error);
		return { success: false, error: "Failed to delete project" };
	}
}

export async function updateProjectAction(
	id: string,
	rawData: { name?: string; description?: string; dueDate?: Date | null },
) {
	try {
		const user = await requireAuth();
		await requireProjectCapability(user.clerkId, id, "canEditProject");
		const data = updateProjectSchema.parse(rawData);
		const updatedProject = await queries.projects.update(id, data);
		revalidatePath("/dashboard");
		return { success: true, data: updatedProject[0] };
	} catch (error) {
		console.error("Failed to update project:", error);
		return { success: false, error: "Failed to update project" };
	}
}

export async function getProjectBySlugAction(slug: string) {
	try {
		const user = await requireAuth();
		const project = await queries.projects.getBySlug(slug, user.id);

		if (!project) {
			return { success: false, error: "Unauthorized or project not found" };
		}

		const permission = getEffectiveProjectPermission(
			project.ownerId,
			user.id,
			project.members.find((member) => member.userId === user.id)?.role,
		);
		if (!permission) {
			return { success: false, error: "Unauthorized or project not found" };
		}
		const capabilities = getProjectCapabilities(permission);

		return {
			success: true,
			data: {
				...project,
				currentUserId: user.id,
				permission,
				capabilities,
				canManageColumns: capabilities.canManageColumns,
			},
		};
	} catch (error) {
		console.error("Failed to fetch project by slug:", error);
		return { success: false, error: "Failed to fetch project" };
	}
}
