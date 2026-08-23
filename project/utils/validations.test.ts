import { describe, expect, it } from "vitest";
import { createTaskSchema, updateTaskSchema } from "./validations";

const validListId = "75c08928-cc97-459c-999a-43a46f38ae42";

describe("createTaskSchema", () => {
	it("reports user-facing errors for missing required fields", () => {
		const result = createTaskSchema.safeParse({
			title: "   ",
			listId: "",
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(
			Object.fromEntries(
				result.error.issues.map((issue) => [issue.path[0], issue.message]),
			),
		).toMatchObject({
			title: "Enter a task title.",
			listId: "Select a destination list.",
		});
	});

	it("normalizes blank optional fields without creating an epoch date", () => {
		const result = createTaskSchema.parse({
			title: "Ship date-only tasks",
			description: undefined,
			listId: validListId,
			assigneeId: null,
			dueDate: null,
			labels: [],
		});

		expect(result).toMatchObject({
			description: undefined,
			assigneeId: null,
			dueDate: null,
			labels: [],
		});
	});

	it("keeps optional fields optional and applies the required priority default", () => {
		const result = createTaskSchema.parse({
			title: "Minimal task",
			listId: validListId,
		});

		expect(result).toMatchObject({
			priority: "medium",
			dueDate: null,
			labels: [],
		});
		expect(result.description).toBeUndefined();
		expect(result.assigneeId).toBeUndefined();
	});

	it("reports a user-facing error for an invalid date", () => {
		const result = createTaskSchema.safeParse({
			title: "Invalid date",
			listId: validListId,
			dueDate: "08/23/2026",
		});

		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.error.issues).toContainEqual(
			expect.objectContaining({
				path: ["dueDate"],
				message: "Enter a valid due date.",
			}),
		);
	});

	it("trims and deduplicates labels case-insensitively", () => {
		const result = createTaskSchema.parse({
			title: "Labels",
			listId: validListId,
			labels: [" frontend ", "Frontend", "bug"],
		});

		expect(result.labels).toEqual(["Frontend", "bug"]);
	});

	it("rejects overlong title and description values", () => {
		expect(
			createTaskSchema.safeParse({
				title: "x".repeat(201),
				description: "x".repeat(2001),
				listId: validListId,
			}).success,
		).toBe(false);
	});
});

describe("updateTaskSchema", () => {
	it("does not apply creation defaults to omitted update fields", () => {
		expect(updateTaskSchema.parse({ title: "Edited title" })).toEqual({
			title: "Edited title",
		});
	});
});
