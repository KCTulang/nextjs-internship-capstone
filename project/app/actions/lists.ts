"use server";

import { revalidatePath } from "next/cache";
import { queries } from "@/lib/db";

export async function getListsAction(projectId: string) {
	try {
		const lists = await queries.lists.getByProject(projectId);
		return { success: true, data: lists };
	} catch (error) {
		console.error("Failed to fetch lists:", error);
		return { success: false, error: "Failed to fetch lists" };
	}
}

export async function createListAction(data: {
	name: string;
	projectId: string;
	position: number;
}) {
	try {
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
	data: { name?: string; position?: number },
	projectId: string,
) {
	try {
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
		await queries.lists.delete(listId);
		revalidatePath(`/dashboard`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete list:", error);
		return { success: false, error: "Failed to delete list" };
	}
}
