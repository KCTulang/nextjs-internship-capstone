"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { queries } from "@/lib/db";
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
		const projects = await queries.projects.getAll(user.id, limit, offset);
		return { success: true, data: projects };
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

		const newProject = await queries.projects.create({
			name: data.name,
			slug,
			description: data.description || null,
			dueDate: data.dueDate || null,
			ownerId: user.id,
		});

		const projectId = newProject[0].id;

		await queries.lists.create({ name: "To Do", projectId, position: 1000 });
		await queries.lists.create({
			name: "In Progress",
			projectId,
			position: 2000,
		});
		await queries.lists.create({ name: "Done", projectId, position: 3000 });

		revalidatePath("/dashboard");
		return { success: true, data: newProject[0] };
	} catch (error) {
		console.error("Failed to create project:", error);
		return { success: false, error: "Failed to create project" };
	}
}

export async function deleteProjectAction(projectId: string) {
	try {
		await requireAuth();
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
		await requireAuth();
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

		return { success: true, data: project };
	} catch (error) {
		console.error("Failed to fetch project by slug:", error);
		return { success: false, error: "Failed to fetch project" };
	}
}
