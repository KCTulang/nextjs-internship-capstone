import { useAuth } from "@clerk/nextjs";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDropdown } from "./notification-dropdown";

vi.mock("@clerk/nextjs", () => ({
	useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

vi.mock("@/app/actions/notifications", () => ({
	getNotificationPreferencesAction: vi.fn().mockResolvedValue({
		success: true,
		data: { muteAll: false },
	}),
	getNotificationsAction: vi.fn().mockResolvedValue({
		success: true,
		data: [
			{
				id: "notif-1",
				type: "assignment",
				message: "You have been assigned to a task",
				createdAt: new Date().toISOString(),
				readAt: null,
			},
		],
	}),
	markAllNotificationsReadAction: vi.fn(),
	markNotificationReadAction: vi.fn(),
	updateNotificationPreferencesAction: vi.fn(),
}));

describe("NotificationDropdown", () => {
	const mockRouter = { push: vi.fn() };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue(
			mockRouter as unknown as ReturnType<typeof useRouter>,
		);
		vi.mocked(useAuth).mockReturnValue({
			userId: "user-1",
		} as unknown as ReturnType<typeof useAuth>);
	});

	it("renders bell icon and fetches notifications", async () => {
		const user = userEvent.setup();
		render(<NotificationDropdown />);

		const bellButton = screen.getByRole("button", { name: /notifications/i });
		expect(bellButton).toBeInTheDocument();

		await user.click(bellButton);

		await waitFor(() => {
			expect(
				screen.getByText("You have been assigned to a task"),
			).toBeInTheDocument();
		});
	});
});
