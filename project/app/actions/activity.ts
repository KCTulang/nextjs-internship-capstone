"use server";

import { auth } from "@clerk/nextjs/server";
import { queries } from "@/lib/db";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");

	const user = await queries.users.getByClerkId(userId);
	if (!user) throw new Error("User not found in database");
	return user;
}

export async function getActivityByTaskAction(taskId: string) {
	try {
		await requireAuth();
		const activities = await queries.activityLogs.getByTask(taskId);
		return { success: true, data: activities };
	} catch (error) {
		console.error("Failed to fetch activity logs:", error);
		return { success: false, error: "Failed to fetch activity logs" };
	}
}

export async function logActivity(
	taskId: string,
	type:
		| "task_created"
		| "task_updated"
		| "task_deleted"
		| "task_moved"
		| "task_reordered"
		| "task_assigned"
		| "task_unassigned"
		| "task_priority_changed"
		| "task_due_date_changed"
		| "comment_added"
		| "comment_updated"
		| "comment_deleted",
	fromValue?: string | null,
	toValue?: string | null,
) {
	try {
		const user = await requireAuth();
		await queries.activityLogs.create({
			taskId,
			userId: user.id,
			type,
			fromValue: fromValue || null,
			toValue: toValue || null,
		});
		return true;
	} catch (error) {
		console.error("Failed to log activity:", error);
		return false;
	}
}
