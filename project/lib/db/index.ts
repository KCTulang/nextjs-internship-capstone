// TODO: Task 3.2 - Configure PostgreSQL database (Vercel Postgres or Neon)
// TODO: Task 3.5 - Implement database connection and query utilities

/*
TODO: Implementation Notes for Interns:

1. Choose database provider:
   - Vercel Postgres (recommended for Vercel deployment)
   - Neon (good alternative)
   - Local PostgreSQL for development

2. Set up environment variables:
   - DATABASE_URL
   - POSTGRES_URL (if using Vercel Postgres)

3. Configure Drizzle connection
4. Implement CRUD operations for all entities
5. Add proper error handling
6. Set up connection pooling if needed

Example structure:
import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'
import * as schema from './schema'

export const db = drizzle(sql, { schema })

export const queries = {
  projects: {
    getAll: async () => { ... },
    getById: async (id: string) => { ... },
    create: async (data: any) => { ... },
    update: async (id: string, data: any) => { ... },
    delete: async (id: string) => { ... },
  },
  // ... other entity queries
}
*/

import { neon } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
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
	
		getAll: async (limit = 10, offset = 0) => {
			return await db.query.projects.findMany({
				limit,
				offset,
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

		// create
		create: async (data: typeof schema.projects.$inferInsert) => {
			const [project] = await db
				.insert(schema.projects)
				.values(data)
				.returning();
			await db.insert(schema.projectMembers).values({
				projectId: project.id,
				userId: data.ownerId,
				role: "owner",
			});
			return [project];
		},

		// update
		update: async (
			id: string,
			data: Partial<typeof schema.projects.$inferInsert>,
		) => {
			console.log(`TODO: Update project ${id}`, data);
			return await db
				.update(schema.projects)
				.set(data)
				.where(eq(schema.projects.id, id))
				.returning();
		},

		//delete
		delete: async (id: string) => {
			console.log(`TODO: Delete project ${id}`);
			return await db
				.delete(schema.projects)
				.where(eq(schema.projects.id, id))
				.returning();
		},
		getBySlug: async (slug: string) => {
			return await db.query.projects.findFirst({
				where: eq(schema.projects.slug, slug),
				with: {
					members: { with: { user: true } },
					owner: true,
				},
			});
		},
	},
	lists: {
		create: async (data: typeof schema.lists.$inferInsert) => {
			return await db.insert(schema.lists).values(data).returning();
		},
		getByProject: async (projectId: string) => {
			return await db.query.lists.findMany({
				where: eq(schema.lists.projectId, projectId),
				orderBy: (lists, { asc }) => [asc(lists.position)],
				with: {
					tasks: {
						orderBy: (tasks, { asc }) => [asc(tasks.position)],
					},
				},
			});
		},
		update: async (
			id: string,
			data: Partial<typeof schema.lists.$inferInsert>,
		) => {
			return await db
				.update(schema.lists)
				.set(data)
				.where(eq(schema.lists.id, id))
				.returning();
		},
		delete: async (id: string) => {
			return await db
				.delete(schema.lists)
				.where(eq(schema.lists.id, id))
				.returning();
		},
	},
	tasks: {
		create: async (data: typeof schema.tasks.$inferInsert) => {
			return await db.insert(schema.tasks).values(data).returning();
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
		updateRole: async (projectId: string, userId: string, role: string) => {
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
};
