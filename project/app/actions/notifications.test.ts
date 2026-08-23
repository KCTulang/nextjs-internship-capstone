import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNotificationAction } from "./notifications";

const {
	mockReturning,
	mockInsert,
	mockFindFirstUser,
	mockFindFirstNotification,
	mockGetByUserId,
	mockPublishUserEvent,
} = vi.hoisted(() => {
	const returning = vi.fn();
	const values = vi.fn(() => ({ returning }));
	return {
		mockReturning: returning,
		mockInsert: vi.fn(() => ({ values })),
		mockFindFirstUser: vi.fn(),
		mockFindFirstNotification: vi.fn(),
		mockGetByUserId: vi.fn(),
		mockPublishUserEvent: vi.fn(),
	};
});

vi.mock("@/lib/db", () => ({
	db: {
		insert: mockInsert,
		query: {
			users: {
				findFirst: mockFindFirstUser,
			},
			notifications: {
				findFirst: mockFindFirstNotification,
			},
		},
	},
	queries: {
		notificationPreferences: {
			getByUserId: mockGetByUserId,
		},
	},
}));

vi.mock("@/services/realtime/events", () => ({
	publishUserEvent: mockPublishUserEvent,
}));

vi.mock("@clerk/nextjs/server", () => ({
	auth: vi.fn(),
}));

describe("createNotificationAction", () => {
	const defaultArgs = {
		userId: "user-recipient",
		actorId: "user-actor",
		taskId: "task-1",
		projectId: "project-1",
		message: "hello",
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockReturning.mockResolvedValue([{ id: "notif-1" }]);
		mockFindFirstUser.mockResolvedValue({
			id: "user-recipient",
			clerkId: "clerk-recipient",
		});
		mockFindFirstNotification.mockResolvedValue({
			id: "notif-1",
			type: "assignment",
			entityId: "task-1",
			actor: {
				id: "user-actor",
				name: "Actor Name",
				email: "actor@example.com",
			},
			project: { id: "project-1", name: "Project Name", slug: "project-slug" },
		});
	});

	const expectDelivered = () => {
		expect(mockInsert).toHaveBeenCalled();
		expect(mockFindFirstNotification).toHaveBeenCalled();
		expect(mockPublishUserEvent).toHaveBeenCalledWith(
			"clerk-recipient",
			expect.objectContaining({
				type: "notification.received",
				payload: expect.objectContaining({
					id: "notif-1",
					actor: expect.objectContaining({
						id: "user-actor",
						name: "Actor Name",
						email: "actor@example.com",
					}),
					project: expect.objectContaining({
						id: "project-1",
						name: "Project Name",
						slug: "project-slug",
					}),
				}),
			}),
		);
	};

	const expectSuppressed = () => {
		expect(mockInsert).not.toHaveBeenCalled();
		expect(mockFindFirstNotification).not.toHaveBeenCalled();
		expect(mockPublishUserEvent).not.toHaveBeenCalled();
	};

	describe("Assignment notifications", () => {
		it("inserts and delivers when taskAssignments = true", async () => {
			mockGetByUserId.mockResolvedValue({ taskAssignments: true });
			const result = await createNotificationAction({
				...defaultArgs,
				type: "assignment",
			});

			expect(result.success).toBe(true);
			expectDelivered();
		});

		it("suppresses when taskAssignments = false", async () => {
			mockGetByUserId.mockResolvedValue({ taskAssignments: false });
			const result = await createNotificationAction({
				...defaultArgs,
				type: "assignment",
			});

			expect(result.success).toBe(true);
			expectSuppressed();
		});
	});

	describe("Mention notifications", () => {
		it("inserts and delivers when mentions = true", async () => {
			mockGetByUserId.mockResolvedValue({ mentions: true });
			const result = await createNotificationAction({
				...defaultArgs,
				type: "mention",
			});

			expect(result.success).toBe(true);
			expectDelivered();
		});

		it("suppresses when mentions = false", async () => {
			mockGetByUserId.mockResolvedValue({ mentions: false });
			const result = await createNotificationAction({
				...defaultArgs,
				type: "mention",
			});

			expect(result.success).toBe(true);
			expectSuppressed();
		});
	});

	describe("Comment notifications", () => {
		it("inserts and delivers when comments = true", async () => {
			mockGetByUserId.mockResolvedValue({ comments: true });
			const result = await createNotificationAction({
				...defaultArgs,
				type: "comment",
			});

			expect(result.success).toBe(true);
			expectDelivered();
		});

		it("suppresses when comments = false", async () => {
			mockGetByUserId.mockResolvedValue({ comments: false });
			const result = await createNotificationAction({
				...defaultArgs,
				type: "comment",
			});

			expect(result.success).toBe(true);
			expectSuppressed();
		});
	});

	describe("Invitation notifications", () => {
		it("inserts and delivers when invitations = true", async () => {
			mockGetByUserId.mockResolvedValue({ invitations: true });
			const result = await createNotificationAction({
				...defaultArgs,
				type: "invitation",
			});

			expect(result.success).toBe(true);
			expectDelivered();
		});

		it("suppresses when invitations = false", async () => {
			mockGetByUserId.mockResolvedValue({ invitations: false });
			const result = await createNotificationAction({
				...defaultArgs,
				type: "invitation",
			});

			expect(result.success).toBe(true);
			expectSuppressed();
		});
	});

	describe("Global Mute (muteAll)", () => {
		it("overrides enabled specific types and suppresses delivery", async () => {
			mockGetByUserId.mockResolvedValue({
				muteAll: true,
				taskAssignments: true,
			});
			const result = await createNotificationAction({
				...defaultArgs,
				type: "assignment",
			});

			expect(result.success).toBe(true);
			expectSuppressed();
		});
	});

	describe("Temporary Mute (mutedUntil)", () => {
		it("suppresses delivery if mutedUntil is in the future", async () => {
			const futureDate = new Date();
			futureDate.setHours(futureDate.getHours() + 1);

			mockGetByUserId.mockResolvedValue({
				mutedUntil: futureDate,
				taskAssignments: true,
			});
			const result = await createNotificationAction({
				...defaultArgs,
				type: "assignment",
			});

			expect(result.success).toBe(true);
			expectSuppressed();
		});

		it("delivers normally if mutedUntil is in the past", async () => {
			const pastDate = new Date();
			pastDate.setHours(pastDate.getHours() - 1);

			mockGetByUserId.mockResolvedValue({
				mutedUntil: pastDate,
				taskAssignments: true,
			});
			const result = await createNotificationAction({
				...defaultArgs,
				type: "assignment",
			});

			expect(result.success).toBe(true);
			expectDelivered();
		});
	});

	describe("Missing Preference Row", () => {
		it("creates defaults and proceeds normally if helper returns them", async () => {
			mockGetByUserId.mockResolvedValue({
				muteAll: false,
				taskAssignments: true,
				mentions: true,
				comments: true,
				invitations: true,
			});

			const result = await createNotificationAction({
				...defaultArgs,
				type: "assignment",
			});

			expect(result.success).toBe(true);
			expectDelivered();
		});
	});
});
