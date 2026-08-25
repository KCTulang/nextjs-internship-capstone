"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, queries } from "@/lib/db";
import {
	canManageProjectColumns,
	projectCompletionAdvisoryLock,
	validProjectListTarget,
} from "@/lib/db/project-column-guards";
import { requireProjectCapability } from "@/lib/db/project-permissions";
import { lists, projectMembers, projects, users } from "@/lib/db/schema";
import { hasExactlyOneCompletedList } from "@/lib/tasks/completion";
import { toTaskDTO } from "@/lib/tasks/task-dto";
import { publishProjectEvent } from "@/services/realtime/events";
import { createListSchema, updateListSchema } from "@/utils/validations";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

function lockProjectPermission(clerkId: string, projectId: string) {
	return db
		.select({ projectId: projects.id })
		.from(projects)
		.where(
			and(
				eq(projects.id, projectId),
				canManageProjectColumns(clerkId, projectId),
			),
		)
		.for("update", { of: projects });
}

function lockAdminMembership(clerkId: string, projectId: string) {
	return db
		.select({ id: projectMembers.id })
		.from(projectMembers)
		.innerJoin(users, eq(users.clerkId, clerkId))
		.where(
			and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, users.id),
				eq(projectMembers.role, "admin"),
			),
		)
		.for("share", { of: projectMembers });
}

function isUniqueViolation(error: unknown): boolean {
	if (typeof error !== "object" || error === null || !("code" in error)) {
		return false;
	}
	return Reflect.get(error, "code") === "23505";
}

export async function getListsAction(projectId: string) {
	try {
		const clerkId = await requireAuth();
		await requireProjectCapability(clerkId, projectId, "canViewProject");
		const projectLists = await queries.lists.getByProject(projectId);
		return {
			success: true,
			data: projectLists.map((list) => ({
				...list,
				tasks: list.tasks.map(toTaskDTO),
			})),
		};
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
		const clerkId = await requireAuth();
		const data = createListSchema.parse(rawData);
		const listId = crypto.randomUUID();
		const [, permission, , , inserted] = await db.batch([
			db.execute(projectCompletionAdvisoryLock(data.projectId)),
			lockProjectPermission(clerkId, data.projectId),
			lockAdminMembership(clerkId, data.projectId),
			db.execute(sql`
				insert into "lists" ("id", "name", "project_id", "position", "is_completed")
				select ${listId}::uuid, ${data.name}, ${data.projectId}::uuid, ${data.position}, false
				where ${canManageProjectColumns(clerkId, data.projectId)}
			`),
			db.select().from(lists).where(eq(lists.id, listId)),
		]);

		if (permission.length === 0) {
			return {
				success: false,
				error: "Only project owners and admins can add columns.",
			};
		}
		if (inserted.length !== 1) {
			return { success: false, error: "Failed to create list" };
		}
		const newList = inserted[0];

		await publishProjectEvent({
			type: "list.created",
			projectId: data.projectId,
			actorId: clerkId,
			entityId: newList.id,
			timestamp: new Date().toISOString(),
			payload: { list: newList },
		});

		revalidatePath(`/`, "layout");
		return { success: true, data: newList };
	} catch (error) {
		console.error("Failed to create list:", error);
		return { success: false, error: "Failed to create list" };
	}
}

export async function generateDefaultListsAction(projectId: string) {
	try {
		const clerkId = await requireAuth();
		const todoId = crypto.randomUUID();
		const progressId = crypto.randomUUID();
		const doneId = crypto.randomUUID();
		const [, permission, , existingLists, , authoritativeLists] =
			await db.batch([
				db.execute(projectCompletionAdvisoryLock(projectId)),
				lockProjectPermission(clerkId, projectId),
				lockAdminMembership(clerkId, projectId),
				db
					.select({ id: lists.id })
					.from(lists)
					.where(eq(lists.projectId, projectId))
					.for("update", { of: lists }),
				db.execute(sql`
					insert into "lists" ("id", "name", "project_id", "position", "is_completed")
					select generated."id", generated."name", ${projectId}::uuid, generated."position", generated."is_completed"
					from (
						values
							(${todoId}::uuid, 'To Do', 1000, false),
							(${progressId}::uuid, 'In Progress', 2000, false),
							(${doneId}::uuid, 'Done', 3000, true)
					) as generated("id", "name", "position", "is_completed")
					where ${canManageProjectColumns(clerkId, projectId)}
						and not exists (
							select 1 from "lists" existing where existing."project_id" = ${projectId}::uuid
						)
				`),
				db
					.select()
					.from(lists)
					.where(eq(lists.projectId, projectId))
					.orderBy(lists.position, lists.id),
			]);

		if (permission.length === 0) {
			return {
				success: false,
				error: "Only project owners and admins can generate columns.",
			};
		}
		if (existingLists.length > 0) {
			return { success: false, error: "This project already has columns." };
		}
		if (
			authoritativeLists.length !== 3 ||
			!hasExactlyOneCompletedList(authoritativeLists)
		) {
			return {
				success: false,
				error: "Failed to create a valid default board.",
			};
		}

		for (const list of authoritativeLists) {
			await publishProjectEvent({
				type: "list.created",
				projectId,
				actorId: clerkId,
				entityId: list.id,
				timestamp: new Date().toISOString(),
				payload: { list },
			});
		}
		await publishProjectEvent({
			type: "list.completion_changed",
			projectId,
			actorId: clerkId,
			entityId: doneId,
			timestamp: new Date().toISOString(),
			payload: { completedListId: doneId },
		});
		revalidatePath(`/`, "layout");
		return { success: true, data: authoritativeLists };
	} catch (error) {
		console.error("Failed to generate default lists:", error);
		return { success: false, error: "Failed to generate default lists" };
	}
}

export async function updateListAction(
	listId: string,
	rawData: { name?: string; position?: number },
	projectId: string,
) {
	try {
		const clerkId = await requireAuth();
		const data = updateListSchema.parse(rawData);
		const updatedList = await db
			.update(lists)
			.set(data)
			.where(
				and(
					eq(lists.id, listId),
					eq(lists.projectId, projectId),
					canManageProjectColumns(clerkId, projectId),
				),
			)
			.returning();
		if (updatedList.length !== 1) {
			return {
				success: false,
				error: "Only project owners and admins can update this column.",
			};
		}

		await publishProjectEvent({
			type: "list.updated",
			projectId,
			actorId: clerkId,
			entityId: listId,
			timestamp: new Date().toISOString(),
			payload: { list: updatedList[0] },
		});

		revalidatePath(`/dashboard`, "layout");
		return { success: true, data: updatedList[0] };
	} catch (error) {
		console.error("Failed to update list:", error);
		return { success: false, error: "Failed to update list" };
	}
}

export async function deleteListAction(listId: string, projectId: string) {
	try {
		const clerkId = await requireAuth();
		const [, permission, , target, deleted] = await db.batch([
			db.execute(projectCompletionAdvisoryLock(projectId)),
			lockProjectPermission(clerkId, projectId),
			lockAdminMembership(clerkId, projectId),
			db
				.select({ id: lists.id, isCompleted: lists.isCompleted })
				.from(lists)
				.where(and(eq(lists.id, listId), eq(lists.projectId, projectId)))
				.for("update", { of: lists }),
			db
				.delete(lists)
				.where(
					and(
						eq(lists.id, listId),
						eq(lists.projectId, projectId),
						eq(lists.isCompleted, false),
						canManageProjectColumns(clerkId, projectId),
					),
				)
				.returning({ id: lists.id }),
		]);

		if (permission.length === 0) {
			return {
				success: false,
				error: "Only project owners and admins can delete columns.",
			};
		}
		if (target.length === 0) {
			return { success: false, error: "Column not found in this project." };
		}
		if (target[0].isCompleted) {
			return {
				success: false,
				error: "Set another column as completed before deleting this column.",
			};
		}
		if (deleted.length !== 1) {
			return { success: false, error: "Failed to delete list" };
		}

		await publishProjectEvent({
			type: "list.deleted",
			projectId,
			actorId: clerkId,
			entityId: listId,
			timestamp: new Date().toISOString(),
		});

		revalidatePath(`/dashboard`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete list:", error);
		return { success: false, error: "Failed to delete list" };
	}
}

export async function setCompletedListAction(
	listId: string,
	projectId: string,
) {
	try {
		const clerkId = await requireAuth();
		const permissionGuard = canManageProjectColumns(clerkId, projectId);
		const targetGuard = validProjectListTarget(projectId, listId);
		const [, permission, , target, , completed, authoritativeLists] =
			await db.batch([
				db.execute(projectCompletionAdvisoryLock(projectId)),
				lockProjectPermission(clerkId, projectId),
				lockAdminMembership(clerkId, projectId),
				db
					.select({ id: lists.id })
					.from(lists)
					.where(and(eq(lists.id, listId), eq(lists.projectId, projectId)))
					.for("update", { of: lists }),
				db
					.update(lists)
					.set({ isCompleted: false })
					.where(
						and(
							eq(lists.projectId, projectId),
							ne(lists.id, listId),
							eq(lists.isCompleted, true),
							permissionGuard,
							targetGuard,
						),
					)
					.returning({ id: lists.id }),
				db
					.update(lists)
					.set({ isCompleted: true })
					.where(
						and(
							eq(lists.id, listId),
							eq(lists.projectId, projectId),
							permissionGuard,
							targetGuard,
						),
					)
					.returning({ id: lists.id }),
				db
					.select()
					.from(lists)
					.where(eq(lists.projectId, projectId))
					.orderBy(lists.position, lists.id),
			]);

		if (permission.length === 0) {
			return {
				success: false,
				error: "Only project owners and admins can set the completed column.",
			};
		}
		if (target.length === 0) {
			return { success: false, error: "Column not found in this project." };
		}
		if (
			completed.length !== 1 ||
			!hasExactlyOneCompletedList(authoritativeLists)
		) {
			return { success: false, error: "Failed to set the completed column." };
		}

		await publishProjectEvent({
			type: "list.completion_changed",
			projectId,
			actorId: clerkId,
			entityId: listId,
			timestamp: new Date().toISOString(),
			payload: { completedListId: listId },
		});
		revalidatePath("/", "layout");
		return { success: true, data: authoritativeLists };
	} catch (error) {
		console.error("Failed to set completed list:", error);
		if (isUniqueViolation(error)) {
			return {
				success: false,
				error:
					"Another completed-column change won the race. Refresh and try again.",
			};
		}
		return { success: false, error: "Failed to set the completed column." };
	}
}

export async function bulkUpdateListOrderAction(
	updates: { id: string; position: number }[],
	projectId: string,
) {
	try {
		const clerkId = await requireAuth();
		if (updates.length === 0) return { success: true };

		const queriesToRun = updates.map((update) =>
			db
				.update(lists)
				.set({ position: update.position })
				.where(
					and(
						eq(lists.id, update.id),
						eq(lists.projectId, projectId),
						canManageProjectColumns(clerkId, projectId),
					),
				),
		);

		if (queriesToRun.length > 0) {
			await db.batch([queriesToRun[0], ...queriesToRun.slice(1)]);

			for (const update of updates) {
				await publishProjectEvent({
					type: "list.reordered",
					projectId,
					actorId: clerkId,
					entityId: update.id,
					timestamp: new Date().toISOString(),
					payload: update,
				});
			}
		}

		revalidatePath(`/dashboard`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to bulk update list order:", error);
		return { success: false, error: "Failed to bulk update list order" };
	}
}
