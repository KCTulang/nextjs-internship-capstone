import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTasksStore } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";
import { CreateTaskModal } from "./create-task-modal";

vi.mock("@/stores/ui-store", () => ({
	useUIStore: vi.fn(),
}));

vi.mock("@/stores/board-store", () => ({
	useTasksStore: vi.fn(),
}));

vi.mock("@/app/actions/tasks", () => ({
	getTaskCreationOptionsAction: vi.fn().mockResolvedValue({
		success: true,
		data: {
			projects: [
				{
					id: "proj-1",
					name: "Test Project",
					lists: [{ id: "list-1", name: "To Do", isCompleted: false }],
					members: [
						{ id: "user-1", name: "Test User", email: "test@example.com" },
					],
				},
			],
		},
	}),
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
	window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

describe("CreateTaskModal", () => {
	const mockCloseCreateTaskModal = vi.fn();
	const mockCreateTask = vi.fn();

	const mockListId = "123e4567-e89b-12d3-a456-426614174000";
	const mockUserId = "123e4567-e89b-12d3-a456-426614174001";

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useUIStore).mockReturnValue({
			isCreateTaskModalOpen: true,
			closeCreateTaskModal: mockCloseCreateTaskModal,
			createTaskProjectId: "proj-1",
			activeProjectId: "proj-1",
			activeProjectName: "Test Project",
		} as unknown as ReturnType<typeof useUIStore>);

		vi.mocked(useTasksStore).mockReturnValue({
			lists: [
				{
					id: mockListId,
					name: "To Do",
				},
			],
			members: [{ id: mockUserId, name: "Alice", email: "alice@example.com" }],
			createTask: mockCreateTask,
			isCreatingTask: false,
		} as unknown as ReturnType<typeof useTasksStore>);
	});

	it("renders correctly when open", () => {
		render(<CreateTaskModal />);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: "Create New Task" }),
		).toBeInTheDocument();
	});

	it("validates required fields on submit", async () => {
		const user = userEvent.setup();
		render(<CreateTaskModal />);

		const submitButton = screen.getAllByRole("button", {
			name: "Create Task",
		})[0];
		await user.click(submitButton);

		await waitFor(() => {
			const errorEl = document.getElementById("task-title-error");
			expect(errorEl).toBeInTheDocument();
		});
	});

	it("submits successfully with valid data", async () => {
		const user = userEvent.setup();
		mockCreateTask.mockResolvedValue({ success: true });

		render(<CreateTaskModal />);

		const titleInput = await screen.findByLabelText(/Title/i);
		await user.type(titleInput, "New Task Title");

		const listSelect = await screen.findByLabelText(/List/i);
		await user.selectOptions(listSelect, mockListId);
		// fallback in case selectOptions fails in JSDOM
		if ((listSelect as HTMLSelectElement).value !== mockListId) {
			fireEvent.change(listSelect, { target: { value: mockListId } });
		}

		const submitButton = screen.getAllByRole("button", {
			name: "Create Task",
		})[0];
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockCreateTask).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "New Task Title",
					listId: mockListId,
				}),
				"proj-1",
			);
		});

		expect(mockCloseCreateTaskModal).toHaveBeenCalled();
	});
});
