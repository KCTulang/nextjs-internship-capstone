import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTasksStore } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";
import type { CalendarTask } from "./calendar-grid";
import { UpcomingDeadlines } from "./upcoming-deadlines";

const task: CalendarTask = {
	id: "task-1",
	title: "Preview me",
	projectName: "LockIn",
	projectSlug: "lockin",
	priority: "medium",
	dueDate: "2026-08-26",
	listName: "In Progress",
	listIsCompleted: false,
};

describe("UpcomingDeadlines", () => {
	afterEach(cleanup);

	beforeEach(() => {
		useTasksStore.getState().clearSelection();
		useUIStore.setState({
			isPreviewTaskModalOpen: false,
			selectedPreviewTask: null,
		});
	});

	it("opens the task preview modal before full task details", async () => {
		const user = userEvent.setup();
		render(<UpcomingDeadlines tasksWithDates={[task]} />);

		const taskButton = screen.getByText(task.title).closest("button");
		expect(taskButton).not.toBeNull();
		if (!taskButton) return;

		await user.click(taskButton);

		expect(useUIStore.getState().isPreviewTaskModalOpen).toBe(true);
		expect(useUIStore.getState().selectedPreviewTask).toEqual(task);
	});

	it("keeps checkbox selection separate from task preview", async () => {
		const user = userEvent.setup();
		render(<UpcomingDeadlines tasksWithDates={[task]} />);

		await user.click(screen.getByRole("button", { name: "Select task" }));

		expect(useTasksStore.getState().selectedTaskIds).toEqual([task.id]);
		expect(useUIStore.getState().isPreviewTaskModalOpen).toBe(false);
	});
});
