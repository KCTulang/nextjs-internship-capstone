import { describe, expect, it } from "vitest";
import {
	getProjectCompletionStats,
	getTasksNeedingCompletionMove,
	hasExactlyOneCompletedList,
	resolveCompletionDestinations,
} from "./completion";

const list = (
	id: string,
	projectId: string,
	isCompleted: boolean,
	taskCount = 0,
) => ({
	id,
	projectId,
	isCompleted,
	tasks: Array.from({ length: taskCount }, (_, index) => ({ id: index })),
});

describe("semantic completed columns", () => {
	it("calculates progress from metadata instead of column names or positions", () => {
		const lists = [
			{
				...list("done-by-name", "project-1", false, 2),
				name: "Done",
				position: 3,
			},
			{
				...list("release", "project-1", true, 1),
				name: "Release",
				position: 1,
			},
		];

		expect(getProjectCompletionStats(lists)).toEqual({
			success: true,
			totalTasks: 3,
			completedTasks: 1,
			progress: 33,
		});
	});

	it("renaming and reordering the completed list do not change progress", () => {
		const before = [
			{ ...list("todo", "project-1", false, 2), name: "To Do", position: 1 },
			{ ...list("complete", "project-1", true, 2), name: "Done", position: 2 },
		];
		const after = [
			{ ...before[1], name: "Shipped", position: 1 },
			{ ...before[0], position: 2 },
		];

		expect(getProjectCompletionStats(after)).toEqual(
			getProjectCompletionStats(before),
		);
	});

	it("resolves one completed destination per project", () => {
		const result = resolveCompletionDestinations(
			["project-1", "project-2"],
			[
				list("complete-1", "project-1", true),
				list("todo-1", "project-1", false),
				list("complete-2", "project-2", true),
			],
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.destinations.get("project-1")?.id).toBe("complete-1");
			expect(result.destinations.get("project-2")?.id).toBe("complete-2");
		}
	});

	it("returns a clear error when completion metadata is missing", () => {
		const result = resolveCompletionDestinations(
			["project-1"],
			[list("todo", "project-1", false)],
		);

		expect(result).toEqual({
			success: false,
			code: "MISSING_COMPLETED_LIST",
			error: "This project has no designated completed column.",
			guidance: "Ask a project owner or admin to set a column as completed.",
		});
	});

	it("rejects invalid multiple completed destinations", () => {
		const result = resolveCompletionDestinations(
			["project-1"],
			[
				list("complete-1", "project-1", true),
				list("complete-2", "project-1", true),
			],
		);

		expect(result).toEqual({
			success: false,
			code: "MULTIPLE_COMPLETED_LISTS",
			error: "This project has multiple designated completed columns.",
			guidance: "Ask a project owner or admin to repair the completed column.",
		});
	});

	it("does not report zero progress when completion metadata is invalid", () => {
		expect(
			getProjectCompletionStats([list("todo", "project-1", false, 3)]),
		).toMatchObject({
			success: false,
			code: "MISSING_COMPLETED_LIST",
		});
		expect(
			getProjectCompletionStats([
				list("done-1", "project-1", true, 1),
				list("done-2", "project-1", true, 2),
			]),
		).toMatchObject({
			success: false,
			code: "MULTIPLE_COMPLETED_LISTS",
		});
	});

	it("recognizes only an exactly-one completed-list state as valid", () => {
		expect(hasExactlyOneCompletedList([])).toBe(false);
		expect(hasExactlyOneCompletedList([{ isCompleted: true }])).toBe(true);
		expect(
			hasExactlyOneCompletedList([
				{ isCompleted: true },
				{ isCompleted: true },
			]),
		).toBe(false);
	});

	it("does not move an already-completed task again", () => {
		const tasks = [
			{ id: "already-complete", listId: "complete" },
			{ id: "still-open", listId: "todo" },
		];

		expect(getTasksNeedingCompletionMove(tasks, "complete")).toEqual([
			{ id: "still-open", listId: "todo" },
		]);
	});
});
