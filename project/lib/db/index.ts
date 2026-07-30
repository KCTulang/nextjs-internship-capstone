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
import { eq } from "drizzle-orm";
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
		// create
		create: async (data: typeof schema.users.$inferInsert) => {
			return await db.insert(schema.users).values(data).returning();
		},
		// update by clerkId
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
		// delete by clerkId
		delete: async (clerkId: string) => {
			return await db
				.delete(schema.users)
				.where(eq(schema.users.clerkId, clerkId))
				.returning();
		},
	},
	projects: {
		// read
		getAll: async () => {
			console.log("TODO: Task 4.1 - Implement project CRUD operations");
			return await db.query.projects.findMany();
		},
		getById: async (id: string) => {
			console.log(`TODO: Get project by ID: ${id}`);
			return await db.query.projects.findFirst({
				where: eq(schema.projects.id, id),
			});
		},

		// create
		create: async (data: typeof schema.projects.$inferInsert) => {
			console.log("TODO: Create project", data);
			return await db.insert(schema.projects).values(data).returning();
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
	},
	tasks: {
		// read
		getByProject: async (projectId: string) => {
			console.log(`TODO: Task 4.4 - Get tasks for project ${projectId}`);
			return await db.query.lists.findMany({
				where: eq(schema.lists.projectId, projectId),
				with: { tasks: true },
			});
		},
		// create
		create: async (data: typeof schema.tasks.$inferInsert) => {
			console.log("TODO: Create task", data);
			return await db.insert(schema.tasks).values(data).returning();
		},

		// update
		update: async (
			id: string,
			data: Partial<typeof schema.tasks.$inferInsert>,
		) => {
			console.log(`TODO: Update task ${id}`, data);
			return await db
				.update(schema.tasks)
				.set(data)
				.where(eq(schema.tasks.id, id))
				.returning();
		},

		// delete
		delete: async (id: string) => {
			console.log(`TODO: Delete task ${id}`);
			return await db
				.delete(schema.tasks)
				.where(eq(schema.tasks.id, id))
				.returning();
		},
	},
};
