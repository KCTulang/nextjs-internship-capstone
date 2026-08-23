import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createListAction,
	deleteListAction,
	getListsAction,
	setCompletedListAction,
} from "@/app/actions/lists";
import { createTaskAction } from "@/app/actions/tasks";
import { useTasksStore } from "./board-store";

vi.mock("@/app/actions/lists", () => ({
	bulkUpdateListOrderAction: vi.fn(),
	createListAction: vi.fn(),
	deleteListAction: vi.fn(),
	generateDefaultListsAction: vi.fn(),
	getListsAction: vi.fn(),
	setCompletedListAction: vi.fn(),
	updateListAction: vi.fn(),
}));

vi.mock("@/app/actions/tasks", () => ({
	bulkUpdateTaskOrderAction: vi.fn(),
	createTaskAction: vi.fn(),
	deleteTaskAction: vi.fn(),
	updateTaskAction: vi.fn(),
}));

const boardList = (id: string, isCompleted: boolean) => ({
	id,
	name: id,
	projectId: "project-1",
	position: id === "list-1" ? 1024 : 2048,
	isCompleted,
	createdAt: null,
	updatedAt: null,
	tasks: [],
});

describe("creation submission guards", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useTasksStore.setState({
			lists: [],
			isCreatingTask: false,
			isCreatingList: false,
		});
	});

	it("allows only one task request while creation is pending", async () => {
		let finishRequest:
			| ((value: { success: false; error: string }) => void)
			| undefined;
		vi.mocked(createTaskAction).mockReturnValue(
			new Promise((resolve) => {
				finishRequest = resolve;
			}),
		);

		const first = useTasksStore.getState().createTask(
			{
				title: "Only once",
				listId: "00000000-0000-4000-8000-000000000001",
			},
			"00000000-0000-4000-8000-000000000002",
		);
		const second = await useTasksStore.getState().createTask(
			{
				title: "Only once",
				listId: "00000000-0000-4000-8000-000000000001",
			},
			"00000000-0000-4000-8000-000000000002",
		);

		expect(createTaskAction).toHaveBeenCalledTimes(1);
		expect(second).toEqual({
			success: false,
			error: "Task creation is already in progress.",
		});
		finishRequest?.({ success: false, error: "Expected test failure" });
		await first;
		expect(useTasksStore.getState().isCreatingTask).toBe(false);
	});

	it("allows only one list request while creation is pending", async () => {
		let finishRequest:
			| ((value: { success: false; error: string }) => void)
			| undefined;
		vi.mocked(createListAction).mockReturnValue(
			new Promise((resolve) => {
				finishRequest = resolve;
			}),
		);

		const first = useTasksStore
			.getState()
			.addList("Only once", "00000000-0000-4000-8000-000000000002");
		const second = await useTasksStore
			.getState()
			.addList("Only once", "00000000-0000-4000-8000-000000000002");

		expect(createListAction).toHaveBeenCalledTimes(1);
		expect(second).toEqual({
			success: false,
			error: "List creation is already in progress.",
		});
		finishRequest?.({ success: false, error: "Expected test failure" });
		await first;
		expect(useTasksStore.getState().isCreatingList).toBe(false);
	});
});

describe("completed-column state", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useTasksStore.setState({
			lists: [boardList("list-1", true), boardList("list-2", false)],
		});
	});

	it("applies completion changes idempotently in every tab", () => {
		const event = {
			type: "list.completion_changed" as const,
			projectId: "project-1",
			actorId: "user-1",
			entityId: "list-2",
			timestamp: "2026-08-23T00:00:00.000Z",
			payload: { completedListId: "list-2" },
		};

		useTasksStore.getState().applyRealtimeEvent(event);
		useTasksStore.getState().applyRealtimeEvent(event);

		expect(
			useTasksStore
				.getState()
				.lists.filter((list) => list.isCompleted)
				.map((list) => list.id),
		).toEqual(["list-2"]);
	});

	it("refetches instead of clearing every flag for an unknown completed list", async () => {
		vi.mocked(getListsAction).mockResolvedValue({
			success: true,
			data: [boardList("list-1", true)],
		});

		useTasksStore.getState().applyRealtimeEvent({
			type: "list.completion_changed",
			projectId: "project-1",
			actorId: "user-1",
			entityId: "list-missing",
			timestamp: "2026-08-23T00:00:00.000Z",
			payload: { completedListId: "list-missing" },
		});

		expect(useTasksStore.getState().lists[0].isCompleted).toBe(true);
		await vi.waitFor(() =>
			expect(getListsAction).toHaveBeenCalledWith("project-1"),
		);
	});

	it("blocks deleting the currently completed column", async () => {
		await useTasksStore.getState().removeList("list-1", "project-1");

		expect(deleteListAction).not.toHaveBeenCalled();
		expect(useTasksStore.getState().lists).toHaveLength(2);
	});

	it("designates a replacement before allowing the old column to be removed", async () => {
		vi.mocked(setCompletedListAction).mockResolvedValue({
			success: true,
			data: [],
		});
		vi.mocked(deleteListAction).mockResolvedValue({ success: true });

		await useTasksStore.getState().setCompletedList("list-2", "project-1");
		await useTasksStore.getState().removeList("list-1", "project-1");

		expect(
			useTasksStore.getState().lists.map((list) => [list.id, list.isCompleted]),
		).toEqual([["list-2", true]]);
	});
});
