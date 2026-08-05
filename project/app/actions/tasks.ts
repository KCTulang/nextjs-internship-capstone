"use server";

import { revalidatePath } from "next/cache";
import { queries } from "@/lib/db";

export async function createTaskAction(
	data: {
		title: string;
		description?: string | null;
		listId: string;
		priority?: string;
		dueDate?: Date | null;
		position: number;
	},
	_projectId: string,
) {
	try {
		const newTask = await queries.tasks.create({
			title: data.title,
			description: data.description || null,
			listId: data.listId,
			priority: data.priority || "medium",
			dueDate: data.dueDate || null,
			position: data.position,
		});
		revalidatePath(`/`, "layout");
		return { success: true, data: newTask[0] };
	} catch (error) {
		console.error("Failed to create task:", error);
		return { success: false, error: "Failed to create task" };
	}
}

export async function updateTaskAction(
	taskId: string,
	data: {
		title?: string;
		description?: string | null;
		listId?: string;
		priority?: string;
		dueDate?: Date | null;
		position?: number;
	},
	_projectId: string,
) {
	try {
		const updatedTask = await queries.tasks.update(taskId, data);
		revalidatePath(`/`, "layout");
		return { success: true, data: updatedTask[0] };
	} catch (error) {
		console.error("Failed to update task:", error);
		return { success: false, error: "Failed to update task" };
	}
}

export async function deleteTaskAction(taskId: string, _projectId: string) {
	try {
		await queries.tasks.delete(taskId);
		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete task:", error);
		return { success: false, error: "Failed to delete task" };
	}
}
