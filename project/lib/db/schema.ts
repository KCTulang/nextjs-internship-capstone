// TODO: Task 3.1 - Design database schema for users, projects, lists, and tasks
// TODO: Task 3.3 - Set up Drizzle ORM with type-safe schema definitions

/*
TODO: Implementation Notes for Interns:

1. Install Drizzle ORM dependencies:
   - drizzle-orm
   - drizzle-kit
   - @vercel/postgres (if using Vercel Postgres)
   - OR pg + @types/pg (if using regular PostgreSQL)

2. Define schemas for:
   - users (id, clerkId, email, name, createdAt, updatedAt)
   - projects (id, name, description, ownerId, createdAt, updatedAt, dueDate)
   - lists (id, name, projectId, position, createdAt, updatedAt)
   - tasks (id, title, description, listId, assigneeId, priority, dueDate, position, createdAt, updatedAt)
   - comments (id, content, taskId, authorId, createdAt, updatedAt)

3. Set up proper relationships between tables
4. Add indexes for performance
5. Configure migrations

Example structure:
import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ... other tables
*/
import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	clerkId: text("clerk_id").notNull().unique(),
	email: text("email").notNull(),
	name: text("name").notNull(),
	imageUrl: text("image_url"),
	role: text("role").notNull().default("user"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const projects = pgTable(
	"projects",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		slug: text("slug").notNull().unique(),
		name: text("name").notNull(),
		description: text("description"),
		ownerId: uuid("owner_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		dueDate: timestamp("due_date"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("project_owner_idx").on(table.ownerId)],
);

export const lists = pgTable(
	"lists",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		position: integer("position").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("list_project_idx").on(table.projectId)],
);

export const tasks = pgTable(
	"tasks",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		title: text("title").notNull(),
		description: text("description"),
		listId: uuid("list_id").references(() => lists.id, {
			onDelete: "cascade",
		}),
		assigneeId: uuid("assignee_id").references(() => users.id, {
			onDelete: "set null",
		}),
		priority: text("priority").notNull().default("medium"),
		dueDate: timestamp("due_date"),
		labels: text("labels").array(),
		position: integer("position").notNull(),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("task_list_idx").on(table.listId),
		index("task_assignee_idx").on(table.assigneeId),
	],
);

export const taskAssignees = pgTable(
	"task_assignees",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		index("task_assignees_task_idx").on(table.taskId),
		index("task_assignees_user_idx").on(table.userId),
	],
);

export const comments = pgTable(
	"comments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		content: text("content").notNull(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		authorId: uuid("author_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("comment_task_idx").on(table.taskId),
		index("comment_author_idx").on(table.authorId),
	],
);

export const commentMentions = pgTable(
	"comment_mentions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		commentId: uuid("comment_id")
			.notNull()
			.references(() => comments.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		index("mention_comment_idx").on(table.commentId),
		index("mention_user_idx").on(table.userId),
	],
);

export const notifications = pgTable(
	"notifications",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		recipientId: uuid("recipient_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		actorId: uuid("actor_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		entityId: uuid("entity_id"),
		message: text("message"),
		readAt: timestamp("read_at"),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		index("notification_recipient_idx").on(table.recipientId),
		index("notification_project_idx").on(table.projectId),
		index("notification_type_idx").on(table.type),
	],
);

export const notificationPreferences = pgTable("notification_preferences", {
	userId: uuid("user_id")
		.notNull()
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	muteAll: boolean("mute_all").notNull().default(false),
	mutedUntil: timestamp("muted_until"),
	muteDuringFocus: boolean("mute_during_focus").notNull().default(false),
	taskAssignments: boolean("task_assignments").notNull().default(true),
	mentions: boolean("mentions").notNull().default(true),
	comments: boolean("comments").notNull().default(true),
	invitations: boolean("invitations").notNull().default(true),
	dueDates: boolean("due_dates").notNull().default(true),
	projectActivity: boolean("project_activity").notNull().default(true),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export const projectMembers = pgTable(
	"project_members",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role").notNull().default("member"),
		projectRole: text("project_role").notNull().default("Other"),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		index("member_project_idx").on(table.projectId),
		index("member_user_idx").on(table.userId),
	],
);

export const projectInvitations = pgTable(
	"project_invitations",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => projects.id, { onDelete: "cascade" }),
		email: text("email").notNull(),
		role: text("role").notNull().default("member"),
		projectRole: text("project_role").notNull().default("Other"),
		status: text("status").notNull().default("pending"),
		inviterId: uuid("inviter_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("invitation_project_idx").on(table.projectId),
		index("invitation_email_idx").on(table.email),
		index("invitation_status_idx").on(table.status),
	],
);

export const focusSessions = pgTable(
	"focus_sessions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		startTime: timestamp("start_time").notNull().defaultNow(),
		endTime: timestamp("end_time"),
		duration: integer("duration"),
		status: text("status").notNull().default("active"),
		createdAt: timestamp("created_at").defaultNow(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("focus_session_task_idx").on(table.taskId),
		index("focus_session_user_idx").on(table.userId),
	],
);

// Relations

export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
	user: one(users, { fields: [focusSessions.userId], references: [users.id] }),
	task: one(tasks, { fields: [focusSessions.taskId], references: [tasks.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
	projects: many(projects),
	tasks: many(tasks),
	comments: many(comments),
	projectMembers: many(projectMembers),
	sentInvitations: many(projectInvitations),
	focusSessions: many(focusSessions),
	commentMentions: many(commentMentions),
	receivedNotifications: many(notifications, {
		relationName: "notificationRecipient",
	}),
	sentNotifications: many(notifications, { relationName: "notificationActor" }),
	assignedTasks: many(taskAssignees),
	notificationPreferences: one(notificationPreferences, {
		fields: [users.id],
		references: [notificationPreferences.userId],
	}),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
	owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
	lists: many(lists),
	members: many(projectMembers),
	invitations: many(projectInvitations),
}));

export const projectInvitationsRelations = relations(
	projectInvitations,
	({ one }) => ({
		project: one(projects, {
			fields: [projectInvitations.projectId],
			references: [projects.id],
		}),
		inviter: one(users, {
			fields: [projectInvitations.inviterId],
			references: [users.id],
		}),
	}),
);

export const listsRelations = relations(lists, ({ one, many }) => ({
	project: one(projects, {
		fields: [lists.projectId],
		references: [projects.id],
	}),
	tasks: many(tasks),
}));

export const activityLogs = pgTable(
	"activity_logs",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		fromValue: text("from_value"),
		toValue: text("to_value"),
		createdAt: timestamp("created_at").defaultNow(),
	},
	(table) => [
		index("activity_task_idx").on(table.taskId),
		index("activity_user_idx").on(table.userId),
	],
);

// Relations

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
	task: one(tasks, { fields: [activityLogs.taskId], references: [tasks.id] }),
	user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
	list: one(lists, { fields: [tasks.listId], references: [lists.id] }),
	assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
	comments: many(comments),
	activityLogs: many(activityLogs),
	focusSessions: many(focusSessions),
	taskAssignees: many(taskAssignees),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
	author: one(users, { fields: [comments.authorId], references: [users.id] }),
	mentions: many(commentMentions),
}));

export const commentMentionsRelations = relations(
	commentMentions,
	({ one }) => ({
		comment: one(comments, {
			fields: [commentMentions.commentId],
			references: [comments.id],
		}),
		user: one(users, {
			fields: [commentMentions.userId],
			references: [users.id],
		}),
	}),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
	recipient: one(users, {
		fields: [notifications.recipientId],
		references: [users.id],
		relationName: "notificationRecipient",
	}),
	actor: one(users, {
		fields: [notifications.actorId],
		references: [users.id],
		relationName: "notificationActor",
	}),
	project: one(projects, {
		fields: [notifications.projectId],
		references: [projects.id],
	}),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id],
	}),
	user: one(users, {
		fields: [projectMembers.userId],
		references: [users.id],
	}),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
	task: one(tasks, { fields: [taskAssignees.taskId], references: [tasks.id] }),
	user: one(users, { fields: [taskAssignees.userId], references: [users.id] }),
}));
