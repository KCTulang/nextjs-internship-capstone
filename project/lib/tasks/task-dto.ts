import type { TaskDTO } from "@/types/task";
import { TASK_PRIORITIES, type TaskPriority } from "@/utils/validations";

interface HydratedTaskRecord {
	id: string;
	title: string;
	description: string | null;
	listId: string | null;
	assigneeId: string | null;
	priority: string;
	dueDate: string | null;
	position: number;
	labels: string[] | null;
	createdAt: Date | string | null;
	updatedAt: Date | string | null;
	assignee?: { id: string; name: string; email: string } | null;
	comments?: { id: string }[];
}

function serializeTimestamp(value: Date | string): string {
	return value instanceof Date
		? value.toISOString()
		: new Date(value).toISOString();
}

function toTaskPriority(value: string): TaskPriority {
	return TASK_PRIORITIES.includes(value as TaskPriority)
		? (value as TaskPriority)
		: "medium";
}

export function toTaskDTO(task: HydratedTaskRecord): TaskDTO {
	if (!task.listId) throw new Error(`Task ${task.id} has no destination list`);
	if (!task.createdAt)
		throw new Error(`Task ${task.id} has no creation timestamp`);

	return {
		id: task.id,
		title: task.title,
		description: task.description,
		listId: task.listId,
		assigneeId: task.assigneeId,
		priority: toTaskPriority(task.priority),
		dueDate: task.dueDate,
		position: task.position,
		labels: task.labels ?? [],
		createdAt: serializeTimestamp(task.createdAt),
		updatedAt: task.updatedAt ? serializeTimestamp(task.updatedAt) : null,
		assignee: task.assignee ?? null,
		comments: task.comments ?? [],
	};
}
