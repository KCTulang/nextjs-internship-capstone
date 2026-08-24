import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTasksStore } from "@/stores/board-store";
import { useFocusStore } from "@/stores/focus-store";
import { TaskDetailPanel } from "./task-detail-panel";

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	usePathname: vi.fn(),
	useSearchParams: vi.fn(),
}));

vi.mock("@/stores/board-store", () => ({
	useTasksStore: vi.fn(),
}));

vi.mock("@/stores/focus-store", () => ({
	useFocusStore: vi.fn(),
}));

vi.mock("@/app/actions/comments", () => ({
	getCommentsAction: vi.fn().mockResolvedValue({ success: true, data: [] }),
	createCommentAction: vi.fn().mockResolvedValue({ success: true, data: {} }),
	deleteCommentAction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/app/actions/activity", () => ({
	getActivityByTaskAction: vi
		.fn()
		.mockResolvedValue({ success: true, data: [] }),
	logActivity: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/app/actions/focus-sessions", () => ({
	getFocusSessionsByTaskAction: vi
		.fn()
		.mockResolvedValue({ success: true, data: [] }),
	createFocusSessionAction: vi
		.fn()
		.mockResolvedValue({ success: true, data: {} }),
	updateFocusSessionAction: vi
		.fn()
		.mockResolvedValue({ success: true, data: {} }),
}));

vi.mock("@/hooks/use-collaboration", () => ({
	useCollaboration: vi.fn().mockReturnValue({
		useEvent: vi.fn(),
		triggerEvent: vi.fn(),
	}),
}));
vi.mock("@/hooks/use-media-query", () => ({
	useMediaQuery: vi.fn().mockReturnValue(true), // assume desktop
}));

class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}
if (typeof global !== "undefined") {
	(
		global as unknown as { ResizeObserver: typeof ResizeObserver }
	).ResizeObserver = ResizeObserver;
}
if (typeof window !== "undefined") {
	window.ResizeObserver = ResizeObserver;
}

const mockTask = {
	id: "task-1",
	title: "Initial Task",
	description: "Task Description",
	listId: "list-1",
	assigneeId: "user-1",
	priority: "High",
	dueDate: null,
	labels: [],
};

describe("TaskDetailPanel", () => {
	const mockUpdateTaskDetails = vi.fn();
	const mockDeleteTask = vi.fn();
	const mockRouter = { push: vi.fn() };

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useRouter).mockReturnValue(
			mockRouter as unknown as ReturnType<typeof useRouter>,
		);
		vi.mocked(usePathname).mockReturnValue("/dashboard/projects/test");
		vi.mocked(useSearchParams).mockReturnValue({
			get: vi.fn(),
			getAll: vi.fn(),
			entries: vi.fn(),
			keys: vi.fn(),
			values: vi.fn(),
			forEach: vi.fn(),
			has: vi.fn(),
			toString: vi.fn(),
			size: 0,
		} as unknown as ReturnType<typeof useSearchParams>);

		const mockStoreState = {
			lists: [
				{
					id: "list-1",
					name: "To Do",
					tasks: [mockTask],
				},
			],
			members: [
				{ id: "user-1", name: "Alice", email: "alice@example.com" },
				{ id: "user-2", name: "Bob", email: "bob@example.com" },
			],
			updateTaskDetails: mockUpdateTaskDetails,
			updateTaskComments: vi.fn(),
			deleteTask: mockDeleteTask,
		};

		vi.mocked(useTasksStore).mockReturnValue(
			mockStoreState as unknown as ReturnType<typeof useTasksStore>,
		);
		(
			useTasksStore as unknown as { getState: () => typeof mockStoreState }
		).getState = vi.fn().mockReturnValue(mockStoreState);

		vi.mocked(useFocusStore).mockReturnValue({
			startLockIn: vi.fn(),
			isLockedIn: false,
		} as unknown as ReturnType<typeof useFocusStore>);
	});

	it("renders correctly with a task", () => {
		render(<TaskDetailPanel taskId="task-1" projectId="proj-1" />);

		expect(screen.getByDisplayValue("Initial Task")).toBeInTheDocument();
		expect(screen.getByDisplayValue("Task Description")).toBeInTheDocument();
	});

	it("can update task title", async () => {
		const user = userEvent.setup();
		render(<TaskDetailPanel taskId="task-1" projectId="proj-1" />);

		const titleInputs = await screen.findAllByDisplayValue("Initial Task");
		const titleInput = titleInputs[0];
		await user.clear(titleInput);
		await user.type(titleInput, "Updated Task");
		fireEvent.blur(titleInput); // explicitly trigger blur

		await waitFor(() => {
			expect(mockUpdateTaskDetails).toHaveBeenCalledWith(
				"task-1",
				expect.objectContaining({ title: "Updated Task" }),
				"proj-1",
			);
		});
	});

	it("can change assignee", async () => {
		render(<TaskDetailPanel taskId="task-1" projectId="proj-1" />);

		const selects = await screen.findAllByDisplayValue("Alice");
		const select = selects[0];

		fireEvent.change(select, { target: { value: "user-2" } });

		await waitFor(() => {
			expect(mockUpdateTaskDetails).toHaveBeenCalledWith(
				"task-1",
				expect.objectContaining({ assigneeId: "user-2" }),
				"proj-1",
			);
		});
	});
});
