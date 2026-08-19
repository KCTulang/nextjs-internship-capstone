"use server";

import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db, queries } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { publishUserEvent } from "@/services/realtime/events";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

export async function getNotificationsAction() {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		const userNotifications = await db.query.notifications.findMany({
			where: eq(notifications.recipientId, user.id),
			orderBy: [desc(notifications.createdAt)],
			limit: 50,
			with: {
				actor: {
					columns: {
						id: true,
						name: true,
						email: true,
					},
				},

				project: {
					columns: {
						id: true,
						name: true,
						slug: true,
					},
				},
			},
		});

		return { success: true, data: userNotifications };
	} catch (error) {
		console.error("Failed to fetch notifications:", error);
		return { success: false, error: "Failed to fetch notifications" };
	}
}

export async function markNotificationReadAction(notificationId: string) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		await db
			.update(notifications)
			.set({ readAt: new Date() })
			.where(
				and(
					eq(notifications.id, notificationId),
					eq(notifications.recipientId, user.id),
				),
			);

		return { success: true };
	} catch (error) {
		console.error("Failed to mark notification as read:", error);
		return { success: false, error: "Failed to mark notification as read" };
	}
}

export async function markAllNotificationsReadAction() {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		await db
			.update(notifications)
			.set({ readAt: new Date() })
			.where(eq(notifications.recipientId, user.id));

		return { success: true };
	} catch (error) {
		console.error("Failed to mark all notifications as read:", error);
		return {
			success: false,
			error: "Failed to mark all notifications as read",
		};
	}
}

export async function createNotificationAction({
	userId,
	actorId,
	type,
	taskId,
	projectId,
	message,
}: {
	userId: string;
	actorId: string;
	type: string;
	taskId?: string;
	projectId: string;
	message?: string;
}) {
	if (!projectId) throw new Error("projectId is required");
	try {
		if (userId === actorId) return { success: true };

		const newNotification = await db
			.insert(notifications)
			.values({
				recipientId: userId,
				actorId,
				type,
				entityId: taskId || null,
				projectId,
				message: message || null,
			})
			.returning();

		const recipient = await db.query.users.findFirst({
			where: eq(users.id, userId),
		});

		let shouldDeliver = true;

		const prefs = await queries.notificationPreferences.getByUserId(userId);
		if (prefs) {
			if (prefs.muteAll) shouldDeliver = false;
			if (prefs.mutedUntil && new Date() < prefs.mutedUntil)
				shouldDeliver = false;

			if (type === "assignment" && !prefs.taskAssignments)
				shouldDeliver = false;
			if (type === "mention" && !prefs.mentions) shouldDeliver = false;
			if (type === "comment" && !prefs.comments) shouldDeliver = false;
			if (type === "invitation" && !prefs.invitations) shouldDeliver = false;
			if (type === "dueDate" && !prefs.dueDates) shouldDeliver = false;

			if (prefs.muteDuringFocus) {
				const { focusSessions } = await import("@/lib/db/schema");
				const activeFocus = await db.query.focusSessions.findFirst({
					where: and(
						eq(focusSessions.userId, userId),
						eq(focusSessions.status, "active"),
					),
				});
				if (activeFocus) shouldDeliver = false;
			}
		}

		if (shouldDeliver && recipient) {
			await publishUserEvent(recipient.clerkId, {
				type: "notification.received",
				payload: newNotification[0],
			});
		}

		return { success: true, data: newNotification[0] };
	} catch (error) {
		console.error("Failed to create notification:", error);
		return { success: false, error: "Failed to create notification" };
	}
}

export async function getNotificationPreferencesAction() {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		const prefs = await queries.notificationPreferences.getByUserId(user.id);
		return { success: true, data: prefs };
	} catch (error) {
		console.error("Failed to fetch notification preferences:", error);
		return {
			success: false,
			error: "Failed to fetch notification preferences",
		};
	}
}

export async function updateNotificationPreferencesAction(data: {
	muteAll?: boolean;
	mutedUntil?: Date | null;
	muteDuringFocus?: boolean;
	taskAssignments?: boolean;
	mentions?: boolean;
	comments?: boolean;
	invitations?: boolean;
	dueDates?: boolean;
	projectActivity?: boolean;
}) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		await queries.notificationPreferences.update(user.id, data);
		return { success: true };
	} catch (error) {
		console.error("Failed to update notification preferences:", error);
		return {
			success: false,
			error: "Failed to update notification preferences",
		};
	}
}
