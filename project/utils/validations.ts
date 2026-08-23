import { z } from "zod";

export const createProjectSchema = z.object({
	name: z
		.string()
		.min(1, "Project name is required")
		.max(80, "Project name must be 80 characters or fewer")
		.trim(),
	description: z
		.string()
		.max(500, "Description must be 500 characters or fewer")
		.trim()
		.optional(),
	dueDate: z.coerce.date().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

const normalizedLabelsSchema = z
	.array(z.string().trim().min(1, "Labels cannot be empty").max(50))
	.max(20, "A task can have at most 20 labels")
	.transform((labels) =>
		Array.from(
			new Map(labels.map((label) => [label.toLowerCase(), label])).values(),
		),
	);

export const createTaskSchema = z.object({
	title: z
		.string()
		.trim()
		.min(1, "Enter a task title.")
		.max(200, "Task title must be 200 characters or fewer."),
	description: z
		.string()
		.max(2000, "Description must be 2,000 characters or fewer.")
		.trim()
		.optional(),
	listId: z.string().uuid("Select a destination list."),
	priority: z.enum(TASK_PRIORITIES).default("medium"),
	dueDate: z.iso.date("Enter a valid due date.").nullable().default(null),
	assigneeId: z.string().uuid("Select a valid assignee.").nullable().optional(),
	labels: normalizedLabelsSchema.default([]),
});

export const updateTaskSchema = z.object({
	title: z
		.string()
		.min(1, "Task title is required")
		.max(200, "Task title must be 200 characters or fewer")
		.trim()
		.optional(),
	description: z
		.string()
		.max(2000, "Description must be 2000 characters or fewer")
		.trim()
		.nullable()
		.optional(),
	listId: z.string().uuid("Invalid list ID").optional(),
	priority: z.enum(TASK_PRIORITIES).optional(),
	dueDate: z.iso.date("Invalid due date").nullable().optional(),
	position: z.number().int().nonnegative().optional(),
	assigneeId: z.string().uuid("Invalid assignee ID").nullable().optional(),
	labels: normalizedLabelsSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const createListSchema = z.object({
	name: z
		.string()
		.min(1, "List name is required")
		.max(50, "List name must be 50 characters or fewer")
		.trim(),
	projectId: z.string().uuid("Invalid project ID"),
	position: z.number().int().nonnegative().default(1000),
});

export const updateListSchema = createListSchema
	.omit({ projectId: true, position: true })
	.partial()
	.extend({
		position: z.number().int().nonnegative().optional(),
	});

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;

export const createCommentSchema = z.object({
	content: z
		.string()
		.min(1, "Comment cannot be empty")
		.max(1000, "Comment must be 1000 characters or fewer")
		.trim(),
	taskId: z.string().uuid("Invalid task ID"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const userProfileSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be 100 characters or fewer")
		.trim(),
	email: z.string().email("Invalid email address"),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

export const updateNameSchema = z.object({
	firstName: z
		.string()
		.min(1, "First name is required")
		.max(50, "First name must be 50 characters or fewer")
		.trim(),
	lastName: z
		.string()
		.max(50, "Last name must be 50 characters or fewer")
		.trim()
		.optional(),
});

export type UpdateNameInput = z.infer<typeof updateNameSchema>;

export const updatePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(8, "Password must be at least 8 characters")
			.max(100, "Password is too long"),
		confirmPassword: z.string().min(1, "Please confirm your new password"),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})
	.refine((data) => data.newPassword !== data.currentPassword, {
		message: "New password must be different from current password",
		path: ["newPassword"],
	});

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export function validate<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
):
	| { success: true; data: T }
	| { success: false; errors: Record<string, string> } {
	const result = schema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const key = issue.path.join(".");
		errors[key] = issue.message;
	}
	return { success: false, errors };
}
