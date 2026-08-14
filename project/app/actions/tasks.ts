"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { queries } from "@/lib/db";
import { createTaskSchema, updateTaskSchema } from "@/lib/validations";
import { logActivity } from "./activity";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

export async function createTaskAction(
	rawData: {
		title: string;
		description?: string | null;
		listId: string;
		priority?: string;
		dueDate?: Date | null;
		assigneeId?: string | null;
		position: number;
		labels?: string[] | null;
	},
	_projectId: string,
) {
	try {
		await requireAuth();
		const data = createTaskSchema.parse(rawData);
		const newTask = await queries.tasks.create({
			title: data.title,
			description: data.description || null,
			listId: data.listId,
			priority: data.priority || "medium",
			dueDate: data.dueDate || null,
			assigneeId: data.assigneeId || null,
			position: data.position,
			labels: data.labels || null,
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
	rawData: {
		title?: string;
		description?: string | null;
		listId?: string;
		priority?: string;
		dueDate?: Date | null;
		assigneeId?: string | null;
		position?: number;
		labels?: string[] | null;
	},
	_projectId: string,
) {
	try {
		await requireAuth();
		const data = updateTaskSchema.parse(rawData);

		const [currentTask] = await db
			.select()
			.from(tasks)
			.where(eq(tasks.id, taskId));

		if (!currentTask) {
			return { success: false, error: "Task not found" };
		}

		const updatedTask = await queries.tasks.update(taskId, data);

		const logPromises = [];
		if (data.title && data.title !== currentTask.title) {
			logPromises.push(
				logActivity(taskId, "title_changed", currentTask.title, data.title),
			);
		}
		if (
			data.description !== undefined &&
			data.description !== currentTask.description
		) {
			logPromises.push(logActivity(taskId, "description_changed"));
		}
		if (data.listId && data.listId !== currentTask.listId) {
			logPromises.push(logActivity(taskId, "status_changed"));
		}
		if (data.priority && data.priority !== currentTask.priority) {
			logPromises.push(
				logActivity(
					taskId,
					"priority_changed",
					currentTask.priority || "medium",
					data.priority,
				),
			);
		}
		if (data.dueDate !== undefined) {
			const currentStr = currentTask.dueDate
				? new Date(currentTask.dueDate).toISOString()
				: null;
			const newStr = data.dueDate ? new Date(data.dueDate).toISOString() : null;
			if (currentStr !== newStr) {
				logPromises.push(
					logActivity(taskId, "due_date_changed", currentStr, newStr),
				);
			}
		}
		if (
			data.assigneeId !== undefined &&
			data.assigneeId !== currentTask.assigneeId
		) {
			logPromises.push(
				logActivity(
					taskId,
					data.assigneeId ? "assigned" : "unassigned",
					currentTask.assigneeId,
					data.assigneeId,
				),
			);
		}
		if (data.labels !== undefined) {
			const oldLabels = currentTask.labels || [];
			const newLabels = data.labels || [];

			const added = newLabels.filter((l) => !oldLabels.includes(l));
			for (const label of added) {
				logPromises.push(logActivity(taskId, "label_added", null, label));
			}

			const removed = oldLabels.filter((l) => !newLabels.includes(l));
			for (const label of removed) {
				logPromises.push(logActivity(taskId, "label_removed", label, null));
			}
		}

		await Promise.all(logPromises);

		revalidatePath(`/`, "layout");
		return { success: true, data: updatedTask[0] };
	} catch (error) {
		console.error("Failed to update task:", error);
		return { success: false, error: "Failed to update task" };
	}
}

export async function deleteTaskAction(taskId: string, _projectId: string) {
	try {
		await requireAuth();
		await queries.tasks.delete(taskId);
		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete task:", error);
		return { success: false, error: "Failed to delete task" };
	}
}

import { and, asc, eq, isNotNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { lists, projects, tasks } from "@/lib/db/schema";

export async function getAllUserTasksAction() {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		const userTasks = await db
			.select({
				id: tasks.id,
				title: tasks.title,
				dueDate: tasks.dueDate,
				priority: tasks.priority,
				projectName: projects.name,
				labels: tasks.labels,
				listName: lists.name,
			})
			.from(tasks)
			.innerJoin(lists, eq(tasks.listId, lists.id))
			.innerJoin(projects, eq(lists.projectId, projects.id))
			.where(
				and(
					isNotNull(tasks.dueDate),
					or(eq(projects.ownerId, user.id), eq(tasks.assigneeId, user.id)),
				),
			)
			.orderBy(asc(tasks.dueDate));

		return { success: true, data: userTasks };
	} catch (error) {
		console.error("Failed to fetch user tasks:", error);
		return { success: false, error: "Failed to fetch user tasks" };
	}
}

import { inArray } from "drizzle-orm";
import { projectMembers } from "@/lib/db/schema";

export async function getAnalyticsAction() {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		const userProjectsQuery = await db
			.select({ projectId: projectMembers.projectId })
			.from(projectMembers)
			.where(eq(projectMembers.userId, user.id));

		const userOwnedProjects = await db
			.select({ projectId: projects.id })
			.from(projects)
			.where(eq(projects.ownerId, user.id));

		const projectIds = Array.from(
			new Set([
				...userProjectsQuery.map((p) => p.projectId),
				...userOwnedProjects.map((p) => p.projectId),
			]),
		);

		if (projectIds.length === 0) {
			return {
				success: true,
				data: {
					totalTasks: 0,
					completedTasks: 0,
					completionRate: 0,
					projectCount: 0,
				},
			};
		}

		const allTasks = await db
			.select({
				id: tasks.id,
				listId: tasks.listId,
				projectId: lists.projectId,
				listPosition: lists.position,
			})
			.from(tasks)
			.innerJoin(lists, eq(tasks.listId, lists.id))
			.where(inArray(lists.projectId, projectIds));

		const allLists = await db
			.select({
				id: lists.id,
				projectId: lists.projectId,
				position: lists.position,
			})
			.from(lists)
			.where(inArray(lists.projectId, projectIds));

		const maxPositionListIds = new Set<string>();
		for (const pid of projectIds) {
			const projectLists = allLists.filter((l) => l.projectId === pid);
			if (projectLists.length > 0) {
				const maxList = projectLists.reduce((prev, current) =>
					prev.position > current.position ? prev : current,
				);
				maxPositionListIds.add(maxList.id);
			}
		}

		const totalTasks = allTasks.length;
		const completedTasks = allTasks.filter((t) =>
			maxPositionListIds.has(t.listId),
		).length;
		const completionRate =
			totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

		return {
			success: true,
			data: {
				totalTasks,
				completedTasks,
				completionRate,
				projectCount: projectIds.length,
			},
		};
	} catch (error) {
		console.error("Failed to fetch analytics:", error);
		return { success: false, error: "Failed to fetch analytics" };
	}
}

export async function bulkDeleteTasksAction(taskIds: string[]) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) throw new Error("Unauthorized");
		if (taskIds.length === 0) return { success: true };

		await db.transaction(async (tx) => {
			const validTasks = await tx
				.select({ id: tasks.id })
				.from(tasks)
				.innerJoin(lists, eq(tasks.listId, lists.id))
				.innerJoin(projects, eq(lists.projectId, projects.id))
				.where(
					and(
						inArray(tasks.id, taskIds),
						or(eq(projects.ownerId, user.id), eq(tasks.assigneeId, user.id)),
					),
				);

			const validTaskIds = validTasks.map((t) => t.id);
			if (validTaskIds.length === 0) return;

			await tx.delete(tasks).where(inArray(tasks.id, validTaskIds));
		});

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to bulk delete tasks:", error);
		return { success: false, error: "Failed to bulk delete tasks" };
	}
}

export async function bulkUpdateTasksPriorityAction(
	taskIds: string[],
	priority: string,
) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) throw new Error("Unauthorized");
		if (taskIds.length === 0) return { success: true };

		await db.transaction(async (tx) => {
			const validTasks = await tx
				.select({ id: tasks.id, priority: tasks.priority })
				.from(tasks)
				.innerJoin(lists, eq(tasks.listId, lists.id))
				.innerJoin(projects, eq(lists.projectId, projects.id))
				.where(
					and(
						inArray(tasks.id, taskIds),
						or(eq(projects.ownerId, user.id), eq(tasks.assigneeId, user.id)),
					),
				);

			const validTaskIds = validTasks.map((t) => t.id);
			if (validTaskIds.length === 0) return;

			await tx
				.update(tasks)
				.set({ priority })
				.where(inArray(tasks.id, validTaskIds));

			const logPromises = validTasks
				.filter((t) => t.priority !== priority)
				.map((t) =>
					logActivity(
						t.id,
						"priority_changed",
						t.priority || "medium",
						priority,
					),
				);
			await Promise.all(logPromises);
		});

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to bulk update tasks priority:", error);
		return { success: false, error: "Failed to bulk update tasks priority" };
	}
}

export async function bulkMarkCompleteAction(taskIds: string[]) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) throw new Error("Unauthorized");
		if (taskIds.length === 0) return { success: true };

		await db.transaction(async (tx) => {
			const validTasks = await tx
				.select({ id: tasks.id, projectId: lists.projectId })
				.from(tasks)
				.innerJoin(lists, eq(tasks.listId, lists.id))
				.innerJoin(projects, eq(lists.projectId, projects.id))
				.where(
					and(
						inArray(tasks.id, taskIds),
						or(eq(projects.ownerId, user.id), eq(tasks.assigneeId, user.id)),
					),
				);

			if (validTasks.length === 0) return;

			const tasksByProject = new Map<string, string[]>();
			for (const task of validTasks) {
				if (!tasksByProject.has(task.projectId)) {
					tasksByProject.set(task.projectId, []);
				}
				tasksByProject.get(task.projectId)?.push(task.id);
			}

			const projectIds = Array.from(tasksByProject.keys());

			const projectLists = await tx
				.select({
					id: lists.id,
					projectId: lists.projectId,
					position: lists.position,
				})
				.from(lists)
				.where(inArray(lists.projectId, projectIds));

			for (const [projectId, pTasks] of tasksByProject.entries()) {
				const pLists = projectLists.filter((l) => l.projectId === projectId);
				if (pLists.length === 0) continue;

				const maxList = pLists.reduce((prev, current) =>
					prev.position > current.position ? prev : current,
				);

				const tasksInMaxList = await tx
					.select({ position: tasks.position })
					.from(tasks)
					.where(eq(tasks.listId, maxList.id));

				let maxPos = 0;
				if (tasksInMaxList.length > 0) {
					maxPos = Math.max(...tasksInMaxList.map((t) => t.position));
				}

				for (let i = 0; i < pTasks.length; i++) {
					const taskId = pTasks[i];
					await tx
						.update(tasks)
						.set({ listId: maxList.id, position: maxPos + 1000 * (i + 1) })
						.where(eq(tasks.id, taskId));
					await logActivity(taskId, "status_changed");
				}
			}
		});

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to bulk mark complete:", error);
		return { success: false, error: "Failed to bulk mark complete" };
	}
}
