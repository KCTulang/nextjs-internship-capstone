"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { createNotificationAction } from "@/app/actions/notifications";
import { db, queries } from "@/lib/db";
import {
	lists,
	projectMembers,
	projects,
	taskAssignees,
	tasks,
	users,
} from "@/lib/db/schema";
import { toTaskDTO } from "@/lib/tasks/task-dto";
import { publishProjectEvent } from "@/services/realtime/events";
import type { TaskDTO } from "@/types/task";
import { createTaskSchema, updateTaskSchema } from "@/utils/validations";
import { logActivity } from "./activity";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

export async function getTaskCreationOptionsAction() {
	try {
		const clerkId = await requireAuth();
		const currentUser = await queries.users.getByClerkId(clerkId);
		if (!currentUser) return { success: false, error: "User not found" };

		const memberships = await db
			.select({ projectId: projectMembers.projectId })
			.from(projectMembers)
			.where(eq(projectMembers.userId, currentUser.id));
		const ownedProjects = await db
			.select({ projectId: projects.id })
			.from(projects)
			.where(eq(projects.ownerId, currentUser.id));
		const projectIds = Array.from(
			new Set([
				...memberships.map((membership) => membership.projectId),
				...ownedProjects.map((project) => project.projectId),
			]),
		);

		if (projectIds.length === 0) return { success: true, data: [] };

		const [projectRows, listRows, memberRows] = await Promise.all([
			db
				.select({
					id: projects.id,
					name: projects.name,
					ownerId: projects.ownerId,
				})
				.from(projects)
				.where(inArray(projects.id, projectIds)),
			db
				.select({
					id: lists.id,
					name: lists.name,
					projectId: lists.projectId,
					position: lists.position,
					isCompleted: lists.isCompleted,
				})
				.from(lists)
				.where(inArray(lists.projectId, projectIds)),
			db
				.select({
					projectId: projectMembers.projectId,
					id: users.id,
					name: users.name,
					email: users.email,
				})
				.from(projectMembers)
				.innerJoin(users, eq(projectMembers.userId, users.id))
				.where(inArray(projectMembers.projectId, projectIds)),
		]);
		const ownerIds = Array.from(
			new Set(projectRows.map((project) => project.ownerId)),
		);
		const ownerRows = await db
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(inArray(users.id, ownerIds));

		return {
			success: true,
			data: projectRows
				.map((project) => ({
					id: project.id,
					name: project.name,
					lists: listRows
						.filter((list) => list.projectId === project.id)
						.sort((a, b) => a.position - b.position)
						.map(({ id, name, isCompleted }) => ({
							id,
							name,
							isCompleted,
						})),
					members: Array.from(
						new Map(
							[
								...ownerRows.filter((owner) => owner.id === project.ownerId),
								...memberRows.filter(
									(member) => member.projectId === project.id,
								),
							].map((member) => [
								member.id,
								{ id: member.id, name: member.name, email: member.email },
							]),
						).values(),
					),
				}))
				.sort((a, b) => a.name.localeCompare(b.name)),
		};
	} catch (error) {
		console.error("Failed to load task creation options:", error);
		return { success: false, error: "Failed to load task creation options" };
	}
}

export async function createTaskAction(
	rawData: {
		title: string;
		description?: string;
		listId: string;
		priority?: string;
		dueDate?: string | null;
		assigneeId?: string | null;
		labels?: string[];
	},
	projectId?: string | null,
): Promise<
	| { success: true; data: TaskDTO }
	| {
			success: false;
			error: string;
			fieldErrors?: Record<string, string>;
	  }
> {
	try {
		const clerkId = await requireAuth();
		const parsed = createTaskSchema.safeParse(rawData);
		if (!parsed.success) {
			return {
				success: false,
				error: "Please correct the highlighted fields.",
				fieldErrors: Object.fromEntries(
					parsed.error.issues.map((issue) => [
						issue.path.join("."),
						issue.message,
					]),
				),
			};
		}
		const data = parsed.data;
		const currentUser = await queries.users.getByClerkId(clerkId);
		if (!currentUser) return { success: false, error: "User not found" };

		const destinationList = await db.query.lists.findFirst({
			where: eq(lists.id, data.listId),
		});
		if (!destinationList) {
			return {
				success: false,
				error: "The selected destination list no longer exists.",
				fieldErrors: { listId: "Select an available list." },
			};
		}
		if (projectId && projectId !== destinationList.projectId) {
			return {
				success: false,
				error: "The destination list is not in this project.",
			};
		}

		const project = await db.query.projects.findFirst({
			where: eq(projects.id, destinationList.projectId),
		});
		const membership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, destinationList.projectId),
				eq(projectMembers.userId, currentUser.id),
			),
		});
		if (!project || (project.ownerId !== currentUser.id && !membership)) {
			return {
				success: false,
				error: "You do not have access to this project.",
			};
		}

		if (data.assigneeId) {
			const assigneeMembership = await db.query.projectMembers.findFirst({
				where: and(
					eq(projectMembers.projectId, destinationList.projectId),
					eq(projectMembers.userId, data.assigneeId),
				),
			});
			if (project.ownerId !== data.assigneeId && !assigneeMembership) {
				return {
					success: false,
					error: "The selected assignee is not a project member.",
					fieldErrors: { assigneeId: "Select a project member." },
				};
			}
		}

		const lastTask = await db.query.tasks.findFirst({
			where: eq(tasks.listId, data.listId),
			orderBy: [desc(tasks.position)],
			columns: { position: true },
		});
		const position = (lastTask?.position ?? 0) + 1024;
		const newTask = await queries.tasks.create({
			title: data.title,
			description: data.description ?? null,
			listId: data.listId,
			priority: data.priority,
			dueDate: data.dueDate,
			assigneeId: data.assigneeId ?? null,
			position,
			labels: data.labels,
		});

		const createdTask = newTask[0];
		if (data.assigneeId) {
			await db.insert(taskAssignees).values({
				taskId: createdTask.id,
				userId: data.assigneeId,
			});
			if (data.assigneeId !== currentUser.id) {
				await createNotificationAction({
					userId: data.assigneeId,
					actorId: currentUser.id,
					type: "assignment",
					taskId: createdTask.id,
					projectId: destinationList.projectId,
					message: "assigned you to a new task",
				});
			}
		}

		const hydratedTask = await queries.tasks.getHydratedById(createdTask.id);
		if (!hydratedTask) throw new Error("Created task could not be hydrated");
		const taskDTO = toTaskDTO(hydratedTask);

		await publishProjectEvent({
			type: "task.created",
			projectId: destinationList.projectId,
			actorId: currentUser.id,
			entityId: createdTask.id,
			timestamp: new Date().toISOString(),
			payload: { task: taskDTO },
		});

		revalidatePath(`/`, "layout");
		return { success: true, data: taskDTO };
	} catch (error) {
		console.error("Failed to create task:", error);
		if (error instanceof ZodError) {
			return { success: false, error: "Invalid task details." };
		}
		return { success: false, error: "Failed to create task" };
	}
}

export async function updateTaskAction(
	taskId: string,
	rawData: {
		title?: string;
		description?: string | null;
		listId?: string | null;
		priority?: string;
		dueDate?: string | null;
		assigneeId?: string | null;
		position?: number;
		labels?: string[];
	},
	projectId?: string | null,
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

		await queries.tasks.update(taskId, data);

		const logPromises = [];
		if (data.title && data.title !== currentTask.title) {
			logPromises.push(
				logActivity(taskId, "task_updated", currentTask.title, data.title),
			);
		}
		if (
			data.description !== undefined &&
			data.description !== currentTask.description
		) {
			logPromises.push(logActivity(taskId, "task_updated"));
		}
		if (data.listId && data.listId !== currentTask.listId) {
			logPromises.push(logActivity(taskId, "task_moved"));
		}
		if (data.priority && data.priority !== currentTask.priority) {
			logPromises.push(
				logActivity(
					taskId,
					"task_priority_changed",
					currentTask.priority || "medium",
					data.priority,
				),
			);
		}
		if (data.dueDate !== undefined) {
			const currentStr = currentTask.dueDate;
			const newStr = data.dueDate;
			if (currentStr !== newStr) {
				logPromises.push(
					logActivity(taskId, "task_due_date_changed", currentStr, newStr),
				);
			}
		}
		if (data.assigneeId !== undefined) {
			const finalAssigneeIds = data.assigneeId ? [data.assigneeId] : [];

			const existing = await db
				.select()
				.from(taskAssignees)
				.where(eq(taskAssignees.taskId, taskId));
			const existingIds = existing.map((a) => a.userId);

			const toAdd = finalAssigneeIds.filter((id) => !existingIds.includes(id));
			const toRemove = existingIds.filter(
				(id) => !finalAssigneeIds.includes(id),
			);

			if (toRemove.length > 0) {
				await db
					.delete(taskAssignees)
					.where(
						and(
							eq(taskAssignees.taskId, taskId),
							inArray(taskAssignees.userId, toRemove),
						),
					);
				toRemove.forEach((uid) => {
					logPromises.push(logActivity(taskId, "task_unassigned", uid, null));
				});
			}

			if (toAdd.length > 0) {
				const addValues = toAdd.map((uid) => ({ taskId, userId: uid }));
				await db.insert(taskAssignees).values(addValues);

				const clerkId = await requireAuth();
				const currentUser = await queries.users.getByClerkId(clerkId);

				for (const uid of toAdd) {
					logPromises.push(logActivity(taskId, "task_assigned", null, uid));

					if (currentUser && uid !== currentUser.id) {
						const notifProjectId = projectId;
						if (!notifProjectId && currentTask.listId) {
							const l = await db.query.lists.findFirst({
								where: eq(lists.id, currentTask.listId),
							});
							if (l?.projectId) {
								await createNotificationAction({
									userId: uid,
									actorId: currentUser.id,
									type: "assignment",
									taskId,
									projectId: l.projectId,
									message: "assigned you to a task",
								});
							}
						} else if (notifProjectId) {
							await createNotificationAction({
								userId: uid,
								actorId: currentUser.id,
								type: "assignment",
								taskId,
								projectId: notifProjectId,
								message: "assigned you to a task",
							});
						}
					}
				}
			}
		}

		if (data.labels !== undefined) {
			const oldLabels = currentTask.labels || [];
			const newLabels = data.labels || [];

			const added = newLabels.filter((l) => !oldLabels.includes(l));
			for (const label of added) {
				logPromises.push(logActivity(taskId, "task_updated", null, label));
			}

			const removed = oldLabels.filter((l) => !newLabels.includes(l));
			for (const label of removed) {
				logPromises.push(logActivity(taskId, "task_updated", label, null));
			}
		}

		await Promise.all(logPromises);
		const hydratedTask = await queries.tasks.getHydratedById(taskId);
		if (!hydratedTask) throw new Error("Updated task could not be hydrated");
		const taskDTO = toTaskDTO(hydratedTask);

		let actualProjectId = projectId;
		if (!actualProjectId && currentTask.listId) {
			const list = await db.query.lists.findFirst({
				where: eq(lists.id, currentTask.listId),
			});
			actualProjectId = list?.projectId || null;
		}

		if (actualProjectId) {
			await publishProjectEvent({
				type: "task.updated",
				projectId: actualProjectId,
				actorId: await auth().then((a) => a.userId as string),
				entityId: taskId,
				timestamp: new Date().toISOString(),
				payload: { task: taskDTO },
			});
		}

		revalidatePath(`/`, "layout");
		return { success: true, data: taskDTO };
	} catch (error) {
		console.error("Failed to update task:", error);
		return { success: false, error: "Failed to update task" };
	}
}

export async function deleteTaskAction(
	taskId: string,
	projectId?: string | null,
) {
	try {
		const userId = await requireAuth();

		let actualProjectId = projectId;
		if (!actualProjectId) {
			const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
			if (task?.listId) {
				const list = await db.query.lists.findFirst({
					where: eq(lists.id, task.listId),
				});
				actualProjectId = list?.projectId || null;
			}
		}

		await queries.tasks.delete(taskId);

		if (actualProjectId) {
			await publishProjectEvent({
				type: "task.deleted",
				projectId: actualProjectId,
				actorId: userId,
				entityId: taskId,
				timestamp: new Date().toISOString(),
			});
		}

		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete task:", error);
		return { success: false, error: "Failed to delete task" };
	}
}

export async function getAllUserTasksAction() {
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
			return { success: true, data: [] };
		}

		const userTasks = await db
			.select({
				id: tasks.id,
				title: tasks.title,
				description: tasks.description,
				dueDate: tasks.dueDate,
				priority: tasks.priority,
				projectName: projects.name,
				projectSlug: projects.slug,
				labels: tasks.labels,
				listName: lists.name,
				assigneeId: tasks.assigneeId,
				assigneeName: users.name,
				assigneeEmail: users.email,
			})
			.from(tasks)
			.innerJoin(lists, eq(tasks.listId, lists.id))
			.innerJoin(projects, eq(lists.projectId, projects.id))
			.leftJoin(users, eq(tasks.assigneeId, users.id))
			.where(and(isNotNull(tasks.dueDate), inArray(projects.id, projectIds)))
			.orderBy(asc(tasks.dueDate));

		const mappedTasks = userTasks.map((t) => ({
			id: t.id,
			title: t.title,
			description: t.description,
			dueDate: t.dueDate,
			priority: t.priority,
			projectName: t.projectName,
			projectSlug: t.projectSlug,
			labels: t.labels,
			listName: t.listName,
			status: t.listName,
			assignee: t.assigneeId
				? {
						id: t.assigneeId,
						name: t.assigneeName,
						email: t.assigneeEmail,
					}
				: null,
		}));

		return { success: true, data: mappedTasks };
	} catch (error) {
		console.error("Failed to fetch user tasks:", error);
		return { success: false, error: "Failed to fetch user tasks" };
	}
}

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
		const completedTasks = allTasks.filter(
			(t) => t.listId && maxPositionListIds.has(t.listId),
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

		const validTasks = await db
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
		if (validTaskIds.length > 0) {
			await db.delete(tasks).where(inArray(tasks.id, validTaskIds));
		}

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

		const validTasks = await db
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
		if (validTaskIds.length > 0) {
			await db
				.update(tasks)
				.set({ priority: priority as "low" | "medium" | "high" | "urgent" })
				.where(inArray(tasks.id, validTaskIds));

			const logPromises = validTasks
				.filter((t) => t.priority !== priority)
				.map((t) =>
					logActivity(
						t.id,
						"task_priority_changed",
						t.priority || "medium",
						priority,
					),
				);
			await Promise.all(logPromises);
		}

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

		const validTasks = await db
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

		if (validTasks.length > 0) {
			const tasksByProject = new Map<string, string[]>();
			for (const task of validTasks) {
				if (!tasksByProject.has(task.projectId)) {
					tasksByProject.set(task.projectId, []);
				}
				tasksByProject.get(task.projectId)?.push(task.id);
			}

			const projectIds = Array.from(tasksByProject.keys());

			const projectLists = await db
				.select({
					id: lists.id,
					projectId: lists.projectId,
					position: lists.position,
				})
				.from(lists)
				.where(inArray(lists.projectId, projectIds));

			const queriesToRun: Parameters<typeof db.batch>[0][0][] = [];
			const logs: ReturnType<typeof logActivity>[] = [];

			for (const [projectId, pTasks] of tasksByProject.entries()) {
				const pLists = projectLists.filter((l) => l.projectId === projectId);
				if (pLists.length === 0) continue;

				const maxList = pLists.reduce((prev, current) =>
					prev.position > current.position ? prev : current,
				);

				const tasksInMaxList = await db
					.select({ position: tasks.position })
					.from(tasks)
					.where(eq(tasks.listId, maxList.id));

				let maxPos = 0;
				if (tasksInMaxList.length > 0) {
					maxPos = Math.max(...tasksInMaxList.map((t) => t.position));
				}

				for (let i = 0; i < pTasks.length; i++) {
					const taskId = pTasks[i];
					queriesToRun.push(
						db
							.update(tasks)
							.set({ listId: maxList.id, position: maxPos + 1000 * (i + 1) })
							.where(eq(tasks.id, taskId)),
					);
					logs.push(logActivity(taskId, "task_moved"));
				}
			}

			if (queriesToRun.length > 0) {
				await db.batch([queriesToRun[0], ...queriesToRun.slice(1)]);
			}
			await Promise.all(logs);
		}

		revalidatePath("/", "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to bulk mark complete:", error);
		return { success: false, error: "Failed to bulk mark complete" };
	}
}

export async function bulkUpdateTaskOrderAction(
	updates: { id: string; listId: string; position: number }[],
	projectId: string,
) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) throw new Error("Unauthorized");
		if (updates.length === 0) return { success: true };

		const queriesToRun = updates.map((update) =>
			db
				.update(tasks)
				.set({ position: update.position, listId: update.listId })
				.where(eq(tasks.id, update.id)),
		);

		if (queriesToRun.length > 0) {
			await db.batch([queriesToRun[0], ...queriesToRun.slice(1)]);

			if (projectId) {
				for (const update of updates) {
					await publishProjectEvent({
						type: "task.reordered",
						projectId,
						actorId: user.id,
						entityId: update.id,
						timestamp: new Date().toISOString(),
						payload: update,
					});
				}
			}
		}

		revalidatePath(`/dashboard`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to bulk update tasks:", error);
		return { success: false, error: "Failed to bulk update tasks" };
	}
}
