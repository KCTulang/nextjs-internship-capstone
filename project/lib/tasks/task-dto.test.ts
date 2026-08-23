import { describe, expect, it } from "vitest";
import { toTaskDTO } from "./task-dto";

describe("toTaskDTO", () => {
	it("returns the same canonical nested shape used by a refreshed board", () => {
		const task = toTaskDTO({
			id: "task-1",
			title: "Hydrated",
			description: null,
			listId: "list-1",
			assigneeId: "user-1",
			priority: "high",
			dueDate: "2026-08-31",
			position: 1024,
			labels: ["P0"],
			createdAt: new Date("2026-08-23T00:00:00.000Z"),
			updatedAt: null,
			assignee: {
				id: "user-1",
				name: "Ada",
				email: "ada@example.com",
			},
			comments: [{ id: "comment-1" }],
		});

		expect(task).toEqual({
			id: "task-1",
			title: "Hydrated",
			description: null,
			listId: "list-1",
			assigneeId: "user-1",
			priority: "high",
			dueDate: "2026-08-31",
			position: 1024,
			labels: ["P0"],
			createdAt: "2026-08-23T00:00:00.000Z",
			updatedAt: null,
			assignee: {
				id: "user-1",
				name: "Ada",
				email: "ada@example.com",
			},
			comments: [{ id: "comment-1" }],
		});
	});
});
