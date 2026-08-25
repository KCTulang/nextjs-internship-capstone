"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { createNotificationAction } from "@/app/actions/notifications";
import { db, queries } from "@/lib/db";
import {
	canMutateProjectTasks,
	projectCompletionAdvisoryLock,
	projectCompletionAdvisoryLocks,
	validateProjectId,
} from "@/lib/db/project-column-guards";
import { requireProjectCapability } from "@/lib/db/project-permissions";
import {
	focusSessions,
	lists,
	projectMembers,
	projects,
	taskAssignees,
	tasks,
	users,
} from "@/lib/db/schema";
import { resolveCompletionDestinations } from "@/lib/tasks/completion";
import { toTaskDTO } from "@/lib/tasks/task-dto";
import {
	parseTaskOrderRequest,
	parseUniqueTaskIds,
} from "@/lib/tasks/task-movement-guards";
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
			.select({
				projectId: projectMembers.projectId,
				role: projectMembers.role,
			})
			.from(projectMembers)
			.where(
				and(
					eq(projectMembers.userId, currentUser.id),
					inArray(projectMembers.role, ["admin", "member"]),
				),
			);
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
		if (!project) {
			return {
				success: false,
				error: "The selected project no longer exists.",
			};
		}
		await requireProjectCapability(
			clerkId,
			destinationList.projectId,
			"canMutateTasks",
		);

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
		const clerkId = await requireAuth();
		const data = updateTaskSchema.parse(rawData);

		const [currentTask] = await db
			.select({ task: tasks, projectId: lists.projectId })
			.from(tasks)
			.innerJoin(lists, eq(tasks.listId, lists.id))
			.where(eq(tasks.id, taskId));

		if (!currentTask) {
			return { success: false, error: "Task not found" };
		}
		if (projectId && projectId !== currentTask.projectId) {
			return { success: false, error: "Task does not belong to this project." };
		}
		await requireProjectCapability(
			clerkId,
			currentTask.projectId,
			"canMutateTasks",
		);
		if (data.listId) {
			const destination = await db.query.lists.findFirst({
				where: and(
					eq(lists.id, data.listId),
					eq(lists.projectId, currentTask.projectId),
				),
				columns: { id: true },
			});
			if (!destination) {
				return { success: false, error: "Destination list is unavailable." };
			}
		}
		if (data.assigneeId) {
			const targetProject = await db.query.projects.findFirst({
				where: eq(projects.id, currentTask.projectId),
				columns: { ownerId: true },
			});
			const assigneeMembership = await db.query.projectMembers.findFirst({
				where: and(
					eq(projectMembers.projectId, currentTask.projectId),
					eq(projectMembers.userId, data.assigneeId),
				),
				columns: { id: true },
			});
			if (targetProject?.ownerId !== data.assigneeId && !assigneeMembership) {
				return { success: false, error: "Assignee is not a project member." };
			}
		}

		await queries.tasks.update(taskId, data);
		const taskBeforeUpdate = currentTask.task;

		const logPromises = [];
		if (data.title && data.title !== taskBeforeUpdate.title) {
			logPromises.push(
				logActivity(taskId, "task_updated", taskBeforeUpdate.title, data.title),
			);
		}
		if (
			data.description !== undefined &&
			data.description !== taskBeforeUpdate.description
		) {
			logPromises.push(logActivity(taskId, "task_updated"));
		}
		if (data.listId && data.listId !== taskBeforeUpdate.listId) {
			logPromises.push(logActivity(taskId, "task_moved"));
		}
		if (data.priority && data.priority !== taskBeforeUpdate.priority) {
			logPromises.push(
				logActivity(
					taskId,
					"task_priority_changed",
					taskBeforeUpdate.priority || "medium",
					data.priority,
				),
			);
		}
		if (data.dueDate !== undefined) {
			const currentStr = taskBeforeUpdate.dueDate;
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

				const currentUser = await queries.users.getByClerkId(clerkId);

				for (const uid of toAdd) {
					logPromises.push(logActivity(taskId, "task_assigned", null, uid));

					if (currentUser && uid !== currentUser.id) {
						await createNotificationAction({
							userId: uid,
							actorId: currentUser.id,
							type: "assignment",
							taskId,
							projectId: currentTask.projectId,
							message: "assigned you to a task",
						});
					}
				}
			}
		}

		if (data.labels !== undefined) {
			const oldLabels = taskBeforeUpdate.labels || [];
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

		const actualProjectId = currentTask.projectId;

		if (actualProjectId) {
			await publishProjectEvent({
				type: "task.updated",
				projectId: actualProjectId,
				actorId: clerkId,
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
		const clerkId = await requireAuth();
		const [task] = await db
			.select({ projectId: lists.projectId })
			.from(tasks)
			.innerJoin(lists, eq(tasks.listId, lists.id))
			.where(eq(tasks.id, taskId));
		if (!task) return { success: false, error: "Task not found" };
		if (projectId && projectId !== task.projectId) {
			return { success: false, error: "Task does not belong to this project." };
		}
		await requireProjectCapability(clerkId, task.projectId, "canMutateTasks");

		await queries.tasks.delete(taskId);

		await publishProjectEvent({
			type: "task.deleted",
			projectId: task.projectId,
			actorId: clerkId,
			entityId: taskId,
			timestamp: new Date().toISOString(),
		});

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
				listIsCompleted: lists.isCompleted,
				assigneeId: tasks.assigneeId,
				assigneeName: users.name,
				assigneeEmail: users.email,
				canMutateTasks: canMutateProjectTasks(clerkId, sql`${projects.id}`),
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
			listIsCompleted: t.listIsCompleted,
			canMutateTasks: t.canMutateTasks,
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

export type AnalyticsRange = "7d" | "30d" | "month" | "all";

export interface AnalyticsData {
	range: AnalyticsRange;
	rangeLabel: string;
	totalTasks: number;
	completedTasks: number;
	completionRate: number;
	projectCount: number;
	teamMemberCount: number;
	completionWarning: string | null;
	trend: { label: string; created: number; completed: number }[];
	statuses: { label: string; count: number; isCompleted: boolean }[];
	workload: {
		id: string;
		name: string | null;
		email: string;
		activeTasks: number;
	}[];
	deadlines: { overdue: number; dueSoon: number; upcoming: number };
	focus: {
		totalSeconds: number;
		sessionCount: number;
		averageSeconds: number;
		todaySeconds: number;
	};
}

const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
	"7d": "Last 7 days",
	"30d": "Last 30 days",
	month: "This month",
	all: "All time",
};

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function getAnalyticsPeriod(range: AnalyticsRange, now: Date) {
	const today = startOfLocalDay(now);
	if (range === "7d") return { start: addLocalDays(today, -6), end: now };
	if (range === "30d") return { start: addLocalDays(today, -29), end: now };
	if (range === "month") {
		return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
	}
	return { start: null, end: now };
}

function buildAnalyticsTrend(
	taskRows: {
		createdAt: Date | null;
		listIsCompleted: boolean;
	}[],
	range: AnalyticsRange,
	periodStart: Date | null,
	now: Date,
) {
	const today = startOfLocalDay(now);
	let bucketStarts: Date[] = [];
	let labelOptions: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
	};

	if (range === "7d") {
		bucketStarts = Array.from({ length: 7 }, (_, index) =>
			addLocalDays(today, index - 6),
		);
		labelOptions = { weekday: "short" };
	} else if (range === "30d") {
		const start = periodStart ?? addLocalDays(today, -29);
		bucketStarts = Array.from({ length: 6 }, (_, index) =>
			addLocalDays(start, index * 5),
		);
	} else if (range === "month") {
		const start = periodStart ?? new Date(now.getFullYear(), now.getMonth(), 1);
		for (
			let cursor = new Date(start);
			cursor <= now;
			cursor = addLocalDays(cursor, 7)
		) {
			bucketStarts.push(cursor);
		}
	} else {
		const datedTasks = taskRows.filter(
			(task): task is { createdAt: Date; listIsCompleted: boolean } =>
				task.createdAt instanceof Date,
		);
		const earliest = datedTasks.reduce<Date>(
			(current, task) => (task.createdAt < current ? task.createdAt : current),
			now,
		);
		const monthCount =
			(now.getFullYear() - earliest.getFullYear()) * 12 +
			now.getMonth() -
			earliest.getMonth() +
			1;
		if (monthCount <= 12) {
			for (let index = 0; index < monthCount; index += 1) {
				bucketStarts.push(
					new Date(earliest.getFullYear(), earliest.getMonth() + index, 1),
				);
			}
			labelOptions = { month: "short" };
		} else {
			for (
				let year = earliest.getFullYear();
				year <= now.getFullYear();
				year += 1
			) {
				bucketStarts.push(new Date(year, 0, 1));
			}
			labelOptions = { year: "numeric" };
		}
	}

	if (bucketStarts.length === 0) bucketStarts = [today];

	return bucketStarts.map((start, index) => {
		const end = bucketStarts[index + 1] ?? addLocalDays(today, 1);
		const tasksInBucket = taskRows.filter(
			(task) =>
				task.createdAt && task.createdAt >= start && task.createdAt < end,
		);
		return {
			label: new Intl.DateTimeFormat("en-US", labelOptions).format(start),
			created: tasksInBucket.length,
			completed: tasksInBucket.filter((task) => task.listIsCompleted).length,
		};
	});
}

export async function getAnalyticsAction(
	range: AnalyticsRange = "30d",
): Promise<
	{ success: true; data: AnalyticsData } | { success: false; error: string }
> {
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

		const now = new Date();
		const normalizedRange: AnalyticsRange =
			range in ANALYTICS_RANGE_LABELS ? range : "30d";
		const period = getAnalyticsPeriod(normalizedRange, now);

		if (projectIds.length === 0) {
			return {
				success: true,
				data: {
					range: normalizedRange,
					rangeLabel: ANALYTICS_RANGE_LABELS[normalizedRange],
					totalTasks: 0,
					completedTasks: 0,
					completionRate: 0,
					projectCount: 0,
					teamMemberCount: 0,
					completionWarning: null,
					trend: [],
					statuses: [],
					workload: [],
					deadlines: { overdue: 0, dueSoon: 0, upcoming: 0 },
					focus: {
						totalSeconds: 0,
						sessionCount: 0,
						averageSeconds: 0,
						todaySeconds: 0,
					},
				},
			};
		}

		const [allTasks, allLists, focusRows, memberRows, ownerRows] =
			await Promise.all([
				db
					.select({
						id: tasks.id,
						projectId: lists.projectId,
						listName: lists.name,
						listIsCompleted: lists.isCompleted,
						dueDate: tasks.dueDate,
						createdAt: tasks.createdAt,
						assigneeId: tasks.assigneeId,
					})
					.from(tasks)
					.innerJoin(lists, eq(tasks.listId, lists.id))
					.where(inArray(lists.projectId, projectIds)),
				db
					.select({
						id: lists.id,
						projectId: lists.projectId,
						isCompleted: lists.isCompleted,
					})
					.from(lists)
					.where(inArray(lists.projectId, projectIds)),
				db
					.select({
						duration: focusSessions.duration,
						startTime: focusSessions.startTime,
						status: focusSessions.status,
					})
					.from(focusSessions)
					.innerJoin(tasks, eq(focusSessions.taskId, tasks.id))
					.innerJoin(lists, eq(tasks.listId, lists.id))
					.where(inArray(lists.projectId, projectIds)),
				db
					.select({ id: users.id, name: users.name, email: users.email })
					.from(projectMembers)
					.innerJoin(users, eq(projectMembers.userId, users.id))
					.where(inArray(projectMembers.projectId, projectIds)),
				db
					.select({ id: users.id, name: users.name, email: users.email })
					.from(projects)
					.innerJoin(users, eq(projects.ownerId, users.id))
					.where(inArray(projects.id, projectIds)),
			]);

		const destinations = resolveCompletionDestinations(projectIds, allLists);
		const completionWarning = destinations.success
			? null
			: `${destinations.error} ${destinations.guidance}`;
		const periodTasks = allTasks.filter(
			(task) =>
				!period.start || (task.createdAt && task.createdAt >= period.start),
		);
		const totalTasks = periodTasks.length;
		const completedTasks = periodTasks.filter(
			(task) => task.listIsCompleted,
		).length;
		const completionRate =
			totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

		const statusMap = new Map<
			string,
			{ label: string; count: number; isCompleted: boolean }
		>();
		for (const task of periodTasks) {
			const key = `${task.listIsCompleted}:${task.listName}`;
			const existing = statusMap.get(key);
			if (existing) existing.count += 1;
			else {
				statusMap.set(key, {
					label: task.listName,
					count: 1,
					isCompleted: task.listIsCompleted,
				});
			}
		}

		const members = new Map(
			[...ownerRows, ...memberRows].map((member) => [member.id, member]),
		);
		const activeTaskCounts = new Map<string, number>();
		for (const task of allTasks) {
			if (task.assigneeId && !task.listIsCompleted) {
				activeTaskCounts.set(
					task.assigneeId,
					(activeTaskCounts.get(task.assigneeId) ?? 0) + 1,
				);
			}
		}
		const workload = Array.from(members.values())
			.map((member) => ({
				...member,
				activeTasks: activeTaskCounts.get(member.id) ?? 0,
			}))
			.sort(
				(a, b) =>
					b.activeTasks - a.activeTasks ||
					(a.name ?? a.email).localeCompare(b.name ?? b.email),
			);

		const today = startOfLocalDay(now);
		const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
		const dueSoonKey = (() => {
			const dueSoonDate = addLocalDays(today, 7);
			return `${dueSoonDate.getFullYear()}-${String(dueSoonDate.getMonth() + 1).padStart(2, "0")}-${String(dueSoonDate.getDate()).padStart(2, "0")}`;
		})();
		const openDueDates = allTasks.flatMap((task) =>
			task.dueDate && !task.listIsCompleted ? [task.dueDate] : [],
		);
		const deadlines = {
			overdue: openDueDates.filter((dueDate) => dueDate < todayKey).length,
			dueSoon: openDueDates.filter(
				(dueDate) => dueDate >= todayKey && dueDate <= dueSoonKey,
			).length,
			upcoming: openDueDates.filter((dueDate) => dueDate > dueSoonKey).length,
		};

		const periodFocusRows = focusRows.filter(
			(session) =>
				session.status === "completed" &&
				session.duration !== null &&
				(!period.start || session.startTime >= period.start),
		);
		const totalFocusSeconds = periodFocusRows.reduce(
			(total, session) => total + (session.duration ?? 0),
			0,
		);
		const todayFocusSeconds = focusRows
			.filter(
				(session) =>
					session.status === "completed" && session.startTime >= today,
			)
			.reduce((total, session) => total + (session.duration ?? 0), 0);

		return {
			success: true,
			data: {
				range: normalizedRange,
				rangeLabel: ANALYTICS_RANGE_LABELS[normalizedRange],
				totalTasks,
				completedTasks,
				completionRate,
				projectCount: projectIds.length,
				teamMemberCount: members.size,
				completionWarning,
				trend: buildAnalyticsTrend(
					periodTasks,
					normalizedRange,
					period.start,
					now,
				),
				statuses: Array.from(statusMap.values()).sort(
					(a, b) =>
						Number(a.isCompleted) - Number(b.isCompleted) || b.count - a.count,
				),
				workload,
				deadlines,
				focus: {
					totalSeconds: totalFocusSeconds,
					sessionCount: periodFocusRows.length,
					averageSeconds:
						periodFocusRows.length > 0
							? Math.round(totalFocusSeconds / periodFocusRows.length)
							: 0,
					todaySeconds: todayFocusSeconds,
				},
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
		if (taskIds.length === 0) return { success: true };

		const validTasks = await db
			.select({ id: tasks.id })
			.from(tasks)
			.innerJoin(lists, eq(tasks.listId, lists.id))
			.where(
				and(
					inArray(tasks.id, taskIds),
					canMutateProjectTasks(clerkId, sql`${lists.projectId}`),
				),
			);

		const validTaskIds = validTasks.map((t) => t.id);
		if (validTaskIds.length !== taskIds.length) {
			return {
				success: false,
				error: "You do not have permission to delete one or more tasks.",
			};
		}
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
		if (taskIds.length === 0) return { success: true };

		const validTasks = await db
			.select({ id: tasks.id, priority: tasks.priority })
			.from(tasks)
			.innerJoin(lists, eq(tasks.listId, lists.id))
			.where(
				and(
					inArray(tasks.id, taskIds),
					canMutateProjectTasks(clerkId, sql`${lists.projectId}`),
				),
			);

		const validTaskIds = validTasks.map((t) => t.id);
		if (validTaskIds.length !== taskIds.length) {
			return {
				success: false,
				error: "You do not have permission to update one or more tasks.",
			};
		}
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

type CompleteTasksResult =
	| { success: true; data: TaskDTO[]; movedTaskIds: string[] }
	| {
			success: false;
			error: string;
			code?:
				| "INVALID_INPUT"
				| "FORBIDDEN"
				| "MISSING_COMPLETED_LIST"
				| "MULTIPLE_COMPLETED_LISTS";
	  };

async function completeTasksAuthoritatively(
	clerkId: string,
	taskIds: readonly string[],
): Promise<CompleteTasksResult> {
	const uniqueTaskIds = parseUniqueTaskIds(taskIds);
	if (!uniqueTaskIds) {
		return {
			success: false,
			code: "INVALID_INPUT",
			error: "Invalid task IDs.",
		};
	}

	const taskProjects = await db
		.select({ id: tasks.id, projectId: lists.projectId })
		.from(tasks)
		.innerJoin(lists, eq(tasks.listId, lists.id))
		.where(inArray(tasks.id, uniqueTaskIds));
	if (taskProjects.length !== uniqueTaskIds.length) {
		return {
			success: false,
			code: "FORBIDDEN",
			error: "One or more tasks are unavailable or not movable.",
		};
	}

	const projectIds = [...new Set(taskProjects.map((task) => task.projectId))];
	const lockQueries = projectCompletionAdvisoryLocks(projectIds);
	const authorizationQuery = db
		.select({
			taskId: tasks.id,
			projectId: lists.projectId,
			allowed: canMutateProjectTasks(clerkId, sql`${lists.projectId}`),
			actorId: sql<string>`(
				select actor."id" from "users" actor
				where actor."clerk_id" = ${clerkId}
				limit 1
			)`,
		})
		.from(tasks)
		.innerJoin(lists, eq(tasks.listId, lists.id))
		.where(inArray(tasks.id, uniqueTaskIds));
	const metadataQuery = db
		.select({
			projectId: lists.projectId,
			completedCount:
				sql<number>`count(*) filter (where ${lists.isCompleted} = true)`.mapWith(
					Number,
				),
		})
		.from(lists)
		.where(inArray(lists.projectId, projectIds))
		.groupBy(lists.projectId);

	const taskIdSql = sql.join(
		uniqueTaskIds.map((id) => sql`${id}::uuid`),
		sql`, `,
	);
	const projectIdSql = sql.join(
		projectIds.map((id) => sql`${validateProjectId(id)}::uuid`),
		sql`, `,
	);
	const allRequestsValid = sql<boolean>`(
		select count(*) = ${uniqueTaskIds.length}
			and bool_and(${canMutateProjectTasks(clerkId, sql`source."project_id"`)})
		from "tasks" requested_task
		join "lists" source on source."id" = requested_task."list_id"
		where requested_task."id" in (${taskIdSql})
			and source."project_id" in (${projectIdSql})
	)`;
	const allMetadataValid = sql<boolean>`(
		select count(*) = ${projectIds.length}
		from (
			select completion_list."project_id"
			from "lists" completion_list
			where completion_list."project_id" in (${projectIdSql})
			group by completion_list."project_id"
			having count(*) filter (where completion_list."is_completed" = true) = 1
		) valid_projects
	)`;

	const movementQuery = db.execute(sql`
		with completion_destinations as (
			select completion_list."project_id",
				(array_agg(completion_list."id") filter (
					where completion_list."is_completed" = true
				))[1] as completed_list_id
			from "lists" completion_list
			where completion_list."project_id" in (${projectIdSql})
			group by completion_list."project_id"
			having count(*) filter (where completion_list."is_completed" = true) = 1
		), destination_positions as (
			select destination."list_id", coalesce(max(destination."position"), 0) as max_position
			from "tasks" destination
			where destination."list_id" in (
				select completed_list_id from completion_destinations
			)
			group by destination."list_id"
		), candidate as (
			select requested_task."id" as task_id,
				requested_task."list_id" as old_list_id,
				completion_destinations.completed_list_id,
				actor."id" as actor_id,
				(coalesce(destination_positions.max_position, 0)
					+ row_number() over (
						partition by completion_destinations.completed_list_id
						order by requested_task."id"
					) * 1024)::integer as next_position
			from "tasks" requested_task
			join "lists" source on source."id" = requested_task."list_id"
			join completion_destinations
				on completion_destinations."project_id" = source."project_id"
			left join destination_positions
				on destination_positions."list_id" = completion_destinations.completed_list_id
			join "users" actor on actor."clerk_id" = ${clerkId}
			where requested_task."id" in (${taskIdSql})
				and requested_task."list_id" <> completion_destinations.completed_list_id
				and ${allRequestsValid}
				and ${allMetadataValid}
		), moved as (
			update "tasks" moving_task
			set "list_id" = candidate.completed_list_id,
				"position" = candidate.next_position,
				"updated_at" = now()
			from candidate
			where moving_task."id" = candidate.task_id
			returning moving_task."id", candidate.old_list_id,
				candidate.completed_list_id, candidate.actor_id
		), logged as (
			insert into "activity_logs" (
				"task_id", "user_id", "type", "from_value", "to_value"
			)
			select moved."id", moved.actor_id, 'task_moved',
				moved.old_list_id::text, moved.completed_list_id::text
			from moved
			returning "task_id"
		)
		select "task_id" from logged
	`);
	const authoritativeTasksQuery = db.query.tasks.findMany({
		where: inArray(tasks.id, uniqueTaskIds),
		with: {
			assignee: true,
			comments: { columns: { id: true } },
		},
	});

	const transactionQueries = [
		...lockQueries.map((lock) => db.execute(lock)),
		authorizationQuery,
		metadataQuery,
		movementQuery,
		authoritativeTasksQuery,
	];
	const results = await db.batch(
		transactionQueries as unknown as Parameters<typeof db.batch>[0],
	);
	const authorizationIndex = lockQueries.length;
	const metadataIndex = authorizationIndex + 1;
	const movementIndex = metadataIndex + 1;
	const authorizationRows = results[authorizationIndex] as Awaited<
		ReturnType<typeof authorizationQuery.execute>
	>;
	const metadataRows = results[metadataIndex] as Awaited<
		ReturnType<typeof metadataQuery.execute>
	>;
	const authoritativeRows = results.at(-1) as Awaited<
		ReturnType<typeof authoritativeTasksQuery.execute>
	>;

	if (
		authorizationRows.length !== uniqueTaskIds.length ||
		authorizationRows.some(
			(row) =>
				!row.allowed ||
				taskProjects.find((task) => task.id === row.taskId)?.projectId !==
					row.projectId,
		)
	) {
		return {
			success: false,
			code: "FORBIDDEN",
			error: "You do not have permission to move one or more selected tasks.",
		};
	}

	for (const projectId of projectIds) {
		const completedCount =
			metadataRows.find((row) => row.projectId === projectId)?.completedCount ??
			0;
		if (completedCount === 0) {
			return {
				success: false,
				code: "MISSING_COMPLETED_LIST",
				error:
					"A project has no completed column. Ask an owner or admin to configure one.",
			};
		}
		if (completedCount > 1) {
			return {
				success: false,
				code: "MULTIPLE_COMPLETED_LISTS",
				error:
					"A project has multiple completed columns. Ask an owner or admin to repair it.",
			};
		}
	}

	const movedTaskIds = (
		(results[movementIndex] as { rows?: { task_id: string }[] }).rows ?? []
	).map((row) => row.task_id);
	const taskDTOs = authoritativeRows.map(toTaskDTO);

	for (const task of taskDTOs.filter((item) =>
		movedTaskIds.includes(item.id),
	)) {
		const projectId = taskProjects.find(
			(item) => item.id === task.id,
		)?.projectId;
		if (!projectId) continue;
		await publishProjectEvent({
			type: "task.moved",
			projectId,
			actorId: authorizationRows[0]?.actorId ?? clerkId,
			entityId: task.id,
			timestamp: new Date().toISOString(),
			payload: { task },
		});
	}

	return { success: true, data: taskDTOs, movedTaskIds };
}

export async function bulkMarkCompleteAction(taskIds: string[]) {
	try {
		const clerkId = await requireAuth();
		if (taskIds.length === 0) {
			return { success: true as const, data: [], movedTaskIds: [] };
		}
		const result = await completeTasksAuthoritatively(clerkId, taskIds);
		if (result.success) revalidatePath("/", "layout");
		return result;
	} catch (error) {
		console.error("Failed to bulk mark complete:", error);
		return { success: false as const, error: "Failed to bulk mark complete" };
	}
}

export async function completeTaskForLockInAction(taskId: string) {
	try {
		const result = await completeTasksAuthoritatively(await requireAuth(), [
			taskId,
		]);
		if (!result.success) return result;
		const task = result.data[0];
		if (!task) {
			return { success: false as const, error: "Task is unavailable." };
		}
		revalidatePath("/", "layout");
		return {
			success: true as const,
			data: task,
			moved: result.movedTaskIds.includes(task.id),
		};
	} catch (error) {
		console.error("Failed to complete LockIn task:", error);
		return { success: false as const, error: "Failed to complete task" };
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
		if (updates.length === 0) return { success: true as const, data: [] };
		const parsedRequest = parseTaskOrderRequest(projectId, updates);
		if (!parsedRequest.success) {
			return { success: false as const, error: parsedRequest.error };
		}
		const parsedProjectId = parsedRequest.projectId;
		const parsedUpdates = parsedRequest.updates;

		const taskIds = parsedUpdates.map((update) => update.id);
		const destinationIds = [
			...new Set(parsedUpdates.map((update) => update.listId)),
		];
		const relationshipsValid = sql<boolean>`
			${canMutateProjectTasks(clerkId, parsedProjectId)}
			and (
				select count(*) = ${taskIds.length}
				from "tasks" requested_task
				join "lists" source on source."id" = requested_task."list_id"
				where requested_task."id" in (${sql.join(
					taskIds.map((id) => sql`${id}::uuid`),
					sql`, `,
				)})
					and source."project_id" = ${parsedProjectId}::uuid
			)
			and (
				select count(*) = ${destinationIds.length}
				from "lists" destination
				where destination."id" in (${sql.join(
					destinationIds.map((id) => sql`${id}::uuid`),
					sql`, `,
				)})
					and destination."project_id" = ${parsedProjectId}::uuid
			)`;
		const validationQuery = db
			.select({ valid: relationshipsValid })
			.from(projects)
			.where(eq(projects.id, parsedProjectId))
			.limit(1);
		const requestedMoves = sql.join(
			parsedUpdates.map(
				(update) =>
					sql`(${update.id}::uuid, ${update.listId}::uuid, ${update.position}::integer)`,
			),
			sql`, `,
		);
		const movementQuery = db.execute(sql`
			update "tasks" moving_task
			set "list_id" = requested."list_id",
				"position" = requested."position",
				"updated_at" = now()
			from (values ${requestedMoves}) as requested("id", "list_id", "position")
			where moving_task."id" = requested."id"
				and ${relationshipsValid}
			returning moving_task."id"
		`);
		const authoritativeQuery = db.query.tasks.findMany({
			where: inArray(tasks.id, taskIds),
			with: { assignee: true, comments: { columns: { id: true } } },
		});
		const results = await db.batch([
			db.execute(projectCompletionAdvisoryLock(parsedProjectId)),
			validationQuery,
			movementQuery,
			authoritativeQuery,
		]);
		const validation = results[1] as { valid: boolean }[];
		if (!validation[0]?.valid) {
			return {
				success: false as const,
				error:
					"Task movement was rejected because a task, destination, or project permission is invalid.",
			};
		}
		const movedRows =
			(results[2] as unknown as { rows?: { id: string }[] }).rows ?? [];
		if (movedRows.length !== parsedUpdates.length) {
			return {
				success: false as const,
				error:
					"Task movement conflicted with another change. Refresh and retry.",
			};
		}
		const authoritativeRows = results.at(-1) as Awaited<
			ReturnType<typeof authoritativeQuery.execute>
		>;
		const taskDTOs = authoritativeRows.map(toTaskDTO);

		for (const task of taskDTOs) {
			await publishProjectEvent({
				type: "task.reordered",
				projectId: parsedProjectId,
				actorId: user.id,
				entityId: task.id,
				timestamp: new Date().toISOString(),
				payload: {
					id: task.id,
					listId: task.listId,
					position: task.position,
				},
			});
		}

		revalidatePath(`/dashboard`, "layout");
		return { success: true as const, data: taskDTOs };
	} catch (error) {
		console.error("Failed to bulk update tasks:", error);
		return { success: false as const, error: "Failed to bulk update tasks" };
	}
}
