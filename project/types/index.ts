// TypeScript type definitions
// Task 1.3: Set up project structure and folder organization

export type {
	TaskAssigneeDTO,
	TaskCommentDTO,
	TaskDTO,
} from "./task";

export interface User {
	id: string;
	clerkId: string;
	email: string;
	name: string;
	imageUrl?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface Project {
	id: string;
	name: string;
	description?: string;
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
	dueDate?: Date;
	lists: List[];
}

export interface List {
	id: string;
	name: string;
	projectId: string;
	position: number;
	isCompleted: boolean;
	createdAt: Date;
	updatedAt: Date;
	tasks: Task[];
}

export type Task = import("./task").TaskDTO;

export interface Comment {
	id: string;
	content: string;
	taskId: string;
	authorId: string;
	createdAt: Date;
	updatedAt: Date;
}

// Note for interns: These types should match your database schema
// Update as needed when implementing the actual database schema
