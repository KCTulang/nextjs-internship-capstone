import { describe, expect, it } from "vitest";
import {
	parseTaskOrderRequest,
	parseUniqueTaskIds,
} from "./task-movement-guards";

const PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const TASK_ID = "00000000-0000-4000-8000-000000000002";
const LIST_ID = "00000000-0000-4000-8000-000000000003";

describe("task movement input guards", () => {
	it("rejects a non-UUID project before a lock key can be built", () => {
		expect(
			parseTaskOrderRequest("not-a-project", [
				{ id: TASK_ID, listId: LIST_ID, position: 1024 },
			]),
		).toEqual({ success: false, error: "Invalid project ID." });
	});

	it("normalizes accepted project UUID text before deterministic lock ordering", () => {
		const result = parseTaskOrderRequest(PROJECT_ID.toUpperCase(), [
			{ id: TASK_ID, listId: LIST_ID, position: 1024 },
		]);
		expect(result.success).toBe(true);
		if (result.success) expect(result.projectId).toBe(PROJECT_ID);
	});

	it("rejects duplicate task updates so one request cannot partially reorder", () => {
		expect(
			parseTaskOrderRequest(PROJECT_ID, [
				{ id: TASK_ID, listId: LIST_ID, position: 1024 },
				{ id: TASK_ID, listId: LIST_ID, position: 2048 },
			]),
		).toEqual({ success: false, error: "Duplicate task movement." });
	});

	it("accepts only unique UUID task IDs for authoritative completion", () => {
		expect(parseUniqueTaskIds([TASK_ID])).toEqual([TASK_ID]);
		expect(parseUniqueTaskIds([TASK_ID, TASK_ID])).toBeNull();
		expect(parseUniqueTaskIds(["not-a-task"])).toBeNull();
	});
});
