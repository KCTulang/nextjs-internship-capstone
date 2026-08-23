import { describe, expect, it } from "vitest";
import type { TaskDTO } from "@/types/task";
import {
	applyCompletedListDesignation,
	type BoardList,
	upsertListById,
	upsertTaskById,
} from "./board-state";

const task = (overrides: Partial<TaskDTO> = {}): TaskDTO => ({
	id: "task-1",
	title: "Task",
	description: null,
	listId: "list-1",
	assigneeId: null,
	priority: "medium",
	dueDate: null,
	position: 1024,
	labels: [],
	createdAt: "2026-08-23T00:00:00.000Z",
	updatedAt: null,
	assignee: null,
	comments: [],
	...overrides,
});

const list = (overrides: Partial<BoardList> = {}): BoardList => ({
	id: "list-1",
	name: "To Do",
	projectId: "project-1",
	position: 1024,
	isCompleted: false,
	createdAt: null,
	updatedAt: null,
	tasks: [],
	...overrides,
});

describe("upsertListById", () => {
	it("is idempotent when the Pusher event arrives before the response", () => {
		const eventState = upsertListById([], list());
		const responseState = upsertListById(eventState, list());
		expect(responseState).toHaveLength(1);
		expect(responseState[0].id).toBe("list-1");
	});

	it("is idempotent when the response arrives before Pusher or is replayed", () => {
		const responseState = upsertListById([], list());
		const eventState = upsertListById(responseState, list());
		const replayState = upsertListById(eventState, list());
		expect(replayState.map((item) => item.id)).toEqual(["list-1"]);
	});

	it("merges at the existing index and preserves loaded tasks", () => {
		const existingTask = task();
		const initial = [
			list({ id: "list-0", position: 512 }),
			list({ tasks: [existingTask] }),
		];
		const result = upsertListById(initial, {
			...list({ name: "Renamed" }),
			tasks: undefined,
		});

		expect(result[1].name).toBe("Renamed");
		expect(result[1].tasks).toEqual([existingTask]);
	});
});

describe("upsertTaskById", () => {
	it("produces one task for response/event delivery in either order", () => {
		const initial = [list()];
		const responseFirst = upsertTaskById(
			upsertTaskById(initial, task()),
			task(),
		);
		const eventFirst = upsertTaskById(upsertTaskById(initial, task()), task());

		expect(responseFirst[0].tasks).toHaveLength(1);
		expect(eventFirst[0].tasks).toHaveLength(1);
	});

	it("replaces an existing same-list task in place and removes replays", () => {
		const initialTask = task();
		const initial = [list({ tasks: [initialTask, initialTask] })];
		const result = upsertTaskById(initial, task({ title: "Updated" }));

		expect(result[0].tasks).toHaveLength(1);
		expect(result[0].tasks[0].title).toBe("Updated");
	});

	it("moves and merges an existing task exactly once", () => {
		const initial = [
			list({ tasks: [task()] }),
			list({ id: "list-2", name: "Done", position: 2048 }),
		];
		const result = upsertTaskById(
			initial,
			task({ listId: "list-2", title: "Updated" }),
		);

		expect(result[0].tasks).toHaveLength(0);
		expect(result[1].tasks).toHaveLength(1);
		expect(result[1].tasks[0].title).toBe("Updated");
	});
});

describe("applyCompletedListDesignation", () => {
	it("applies a known completed-list event idempotently", () => {
		const initial = [
			list({ id: "list-1", isCompleted: true }),
			list({ id: "list-2" }),
		];
		const first = applyCompletedListDesignation(initial, "list-2");
		expect(first.status).toBe("applied");
		const second = applyCompletedListDesignation(first.lists, "list-2");
		expect(second.lists.map((item) => item.isCompleted)).toEqual([false, true]);
	});

	it("preserves local completion state when the event references an unknown list", () => {
		const initial = [list({ id: "list-1", isCompleted: true })];
		const result = applyCompletedListDesignation(initial, "list-missing");
		expect(result).toEqual({ status: "unknown", lists: initial });
	});
});
