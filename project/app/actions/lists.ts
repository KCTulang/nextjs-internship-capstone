"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, queries } from "@/lib/db";
import { lists } from "@/lib/db/schema";
import { createListSchema, updateListSchema } from "@/lib/validations";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

export async function getListsAction(projectId: string) {
	try {
		await requireAuth();
		const lists = await queries.lists.getByProject(projectId);
		return { success: true, data: lists };
	} catch (error) {
		console.error("Failed to fetch lists:", error);
		return { success: false, error: "Failed to fetch lists" };
	}
}

export async function createListAction(rawData: {
	name: string;
	projectId: string;
	position: number;
}) {
	try {
		await requireAuth();
		const data = createListSchema.parse(rawData);
		const newList = await queries.lists.create({
			name: data.name,
			projectId: data.projectId,
			position: data.position,
		});
		revalidatePath(`/`, "layout");
		return { success: true, data: newList[0] };
	} catch (error) {
		console.error("Failed to create list:", error);
		return { success: false, error: "Failed to create list" };
	}
}

export async function generateDefaultListsAction(projectId: string) {
	try {
		await requireAuth();
		await queries.lists.create({ name: "To Do", projectId, position: 1000 });
		await queries.lists.create({
			name: "In Progress",
			projectId,
			position: 2000,
		});
		await queries.lists.create({ name: "Done", projectId, position: 3000 });
		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to generate default lists:", error);
		return { success: false, error: "Failed to generate default lists" };
	}
}

export async function updateListAction(
	listId: string,
	rawData: { name?: string; position?: number },
	_projectId: string,
) {
	try {
		await requireAuth();
		const data = updateListSchema.parse(rawData);
		const updatedList = await queries.lists.update(listId, data);
		revalidatePath(`/dashboard`, "layout");
		return { success: true, data: updatedList[0] };
	} catch (error) {
		console.error("Failed to update list:", error);
		return { success: false, error: "Failed to update list" };
	}
}

export async function deleteListAction(listId: string, _projectId: string) {
	try {
		await requireAuth();
		await queries.lists.delete(listId);
		revalidatePath(`/dashboard`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete list:", error);
		return { success: false, error: "Failed to delete list" };
	}
}

export async function bulkUpdateListOrderAction(
	updates: { id: string; position: number }[],
	_projectId: string,
) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) throw new Error("Unauthorized");
		if (updates.length === 0) return { success: true };

		const queriesToRun = updates.map((update) =>
			db
				.update(lists)
				.set({ position: update.position })
				.where(eq(lists.id, update.id)),
		);

		if (queriesToRun.length > 0) {
			await db.batch([queriesToRun[0], ...queriesToRun.slice(1)]);
		}

		revalidatePath(`/dashboard`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to bulk update list order:", error);
		return { success: false, error: "Failed to bulk update list order" };
	}
}
