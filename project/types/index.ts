// TypeScript type definitions
// Task 1.3: Set up project structure and folder organization

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
	createdAt: Date;
	updatedAt: Date;
	tasks: Task[];
}

export interface Task {
	id: string;
	title: string;
	description?: string | null;
	listId: string;
	assigneeId?: string | null;
	priority: "low" | "medium" | "high";
	dueDate?: Date | null;
	position: number;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	comments?: { id: string }[];
	labels?: string[] | null;
}

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
