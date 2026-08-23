import type { TaskPriority } from "@/utils/validations";

export interface TaskAssigneeDTO {
	id: string;
	name: string;
	email: string;
}

export interface TaskCommentDTO {
	id: string;
}

export interface TaskDTO {
	id: string;
	title: string;
	description: string | null;
	listId: string;
	assigneeId: string | null;
	priority: TaskPriority;
	dueDate: string | null;
	position: number;
	labels: string[];
	createdAt: string;
	updatedAt: string | null;
	assignee: TaskAssigneeDTO | null;
	comments: TaskCommentDTO[];
}
