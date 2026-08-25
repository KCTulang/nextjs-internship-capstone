import { neon } from "@neondatabase/serverless";
import { and, eq, inArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });

export const queries = {
	users: {
		getByClerkId: async (clerkId: string) => {
			return await db.query.users.findFirst({
				where: eq(schema.users.clerkId, clerkId),
			});
		},

		create: async (data: typeof schema.users.$inferInsert) => {
			return await db.insert(schema.users).values(data).returning();
		},

		update: async (
			clerkId: string,
			data: Partial<typeof schema.users.$inferInsert>,
		) => {
			return await db
				.update(schema.users)
				.set(data)
				.where(eq(schema.users.clerkId, clerkId))
				.returning();
		},

		delete: async (clerkId: string) => {
			return await db
				.delete(schema.users)
				.where(eq(schema.users.clerkId, clerkId))
				.returning();
		},
	},
	projects: {
		getAll: async (userId: string, limit = 10, offset = 0) => {
			const memberships = await db.query.projectMembers.findMany({
				where: eq(schema.projectMembers.userId, userId),
				columns: { projectId: true },
			});
			const projectIds = memberships.map((m) => m.projectId);

			return await db.query.projects.findMany({
				limit,
				offset,
				where:
					projectIds.length > 0
						? or(
								eq(schema.projects.ownerId, userId),
								inArray(schema.projects.id, projectIds),
							)
						: eq(schema.projects.ownerId, userId),
				orderBy: (projects, { desc }) => [desc(projects.createdAt)],
				with: {
					members: true,
					lists: {
						with: {
							tasks: true,
						},
					},
				},
			});
		},

		update: async (
			id: string,
			data: Partial<typeof schema.projects.$inferInsert>,
		) => {
			return await db
				.update(schema.projects)
				.set(data)
				.where(eq(schema.projects.id, id))
				.returning();
		},

		delete: async (id: string) => {
			return await db
				.delete(schema.projects)
				.where(eq(schema.projects.id, id))
				.returning();
		},
		getBySlug: async (slug: string, userId?: string) => {
			const project = await db.query.projects.findFirst({
				where: eq(schema.projects.slug, slug),
				with: {
					members: { with: { user: true } },
					owner: true,
				},
			});

			if (!project) return null;

			if (userId) {
				const isMember = project.members.some((m) => m.userId === userId);
				if (project.ownerId !== userId && !isMember) return null;
			}

			return project;
		},
	},
	lists: {
		getByProject: async (projectId: string) => {
			return await db.query.lists.findMany({
				where: eq(schema.lists.projectId, projectId),
				orderBy: (lists, { asc }) => [asc(lists.position)],
				with: {
					tasks: {
						orderBy: (tasks, { asc }) => [asc(tasks.position)],
						with: {
							assignee: true,
							comments: {
								columns: {
									id: true,
								},
							},
						},
					},
				},
			});
		},
	},
	tasks: {
		create: async (data: typeof schema.tasks.$inferInsert) => {
			return await db.insert(schema.tasks).values(data).returning();
		},
		getHydratedById: async (id: string) => {
			return await db.query.tasks.findFirst({
				where: eq(schema.tasks.id, id),
				with: {
					assignee: true,
					comments: { columns: { id: true } },
				},
			});
		},
		update: async (
			id: string,
			data: Partial<typeof schema.tasks.$inferInsert>,
		) => {
			return await db
				.update(schema.tasks)
				.set(data)
				.where(eq(schema.tasks.id, id))
				.returning();
		},
		delete: async (id: string) => {
			return await db
				.delete(schema.tasks)
				.where(eq(schema.tasks.id, id))
				.returning();
		},
	},
	projectMembers: {
		addMember: async (data: typeof schema.projectMembers.$inferInsert) => {
			return await db.insert(schema.projectMembers).values(data).returning();
		},
		updateRole: async (
			projectId: string,
			userId: string,
			role: "admin" | "member",
		) => {
			return await db
				.update(schema.projectMembers)
				.set({ role })
				.where(
					and(
						eq(schema.projectMembers.projectId, projectId),
						eq(schema.projectMembers.userId, userId),
					),
				)
				.returning();
		},
		removeMember: async (projectId: string, userId: string) => {
			return await db
				.delete(schema.projectMembers)
				.where(
					and(
						eq(schema.projectMembers.projectId, projectId),
						eq(schema.projectMembers.userId, userId),
					),
				)
				.returning();
		},
		getMembersByProject: async (projectId: string) => {
			return await db.query.projectMembers.findMany({
				where: eq(schema.projectMembers.projectId, projectId),
				with: { user: true },
			});
		},
	},
	comments: {
		create: async (data: typeof schema.comments.$inferInsert) => {
			return await db.insert(schema.comments).values(data).returning();
		},
		getById: async (id: string) => {
			return await db.query.comments.findFirst({
				where: eq(schema.comments.id, id),
			});
		},
		getByTask: async (taskId: string) => {
			return await db.query.comments.findMany({
				where: eq(schema.comments.taskId, taskId),
				orderBy: (comments, { asc }) => [asc(comments.createdAt)],
				with: {
					author: true,
				},
			});
		},
		delete: async (id: string) => {
			return await db
				.delete(schema.comments)
				.where(eq(schema.comments.id, id))
				.returning();
		},
	},
	activityLogs: {
		create: async (data: typeof schema.activityLogs.$inferInsert) => {
			return await db.insert(schema.activityLogs).values(data).returning();
		},
		getByTask: async (taskId: string) => {
			return await db.query.activityLogs.findMany({
				where: eq(schema.activityLogs.taskId, taskId),
				orderBy: (logs, { desc }) => [desc(logs.createdAt), desc(logs.id)],
				with: {
					user: true,
				},
			});
		},
	},
	notificationPreferences: {
		getByUserId: async (userId: string) => {
			let prefs = await db.query.notificationPreferences.findFirst({
				where: eq(schema.notificationPreferences.userId, userId),
			});
			if (!prefs) {
				const [newPrefs] = await db
					.insert(schema.notificationPreferences)
					.values({ userId })
					.returning();
				prefs = newPrefs;
			}
			return prefs;
		},
		update: async (
			userId: string,
			data: Partial<typeof schema.notificationPreferences.$inferInsert>,
		) => {
			return await db
				.update(schema.notificationPreferences)
				.set(data)
				.where(eq(schema.notificationPreferences.userId, userId))
				.returning();
		},
	},
};
