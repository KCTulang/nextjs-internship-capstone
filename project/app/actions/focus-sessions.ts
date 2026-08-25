"use server";

import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
	requireProjectCapability,
	requireTaskCapability,
} from "@/lib/db/project-permissions";
import * as schema from "@/lib/db/schema";
import { publishProjectEvent } from "@/services/realtime/events";

async function requireAuth() {
	const { userId: clerkId } = await auth();
	if (!clerkId) throw new Error("Unauthorized");

	const user = await db.query.users.findFirst({
		where: eq(schema.users.clerkId, clerkId),
	});

	if (!user) throw new Error("User not found");
	return user;
}

export async function saveFocusSession(data: {
	taskId: string;
	startTime: Date;
	endTime: Date;
	duration: number; // in seconds
}) {
	try {
		const user = await requireAuth();
		await requireTaskCapability(user.clerkId, data.taskId, "canMutateTasks");

		await db.insert(schema.focusSessions).values({
			userId: user.id,
			taskId: data.taskId,
			startTime: data.startTime,
			endTime: data.endTime,
			duration: data.duration,
			status: "completed",
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to save focus session:", error);
		return { success: false, error: "Failed to save focus session" };
	}
}

export async function broadcastFocusStateAction(
	taskId: string,
	projectId: string,
	state: "started" | "completed" | "cancelled",
) {
	try {
		const user = await requireAuth();
		await requireProjectCapability(user.clerkId, projectId, "canMutateTasks");

		await publishProjectEvent({
			type: `focus.${state}` as
				| "focus.started"
				| "focus.completed"
				| "focus.cancelled",
			projectId,
			actorId: user.id,
			entityId: taskId,
			timestamp: new Date().toISOString(),
		});

		return { success: true };
	} catch (error) {
		console.error("Failed to broadcast focus state:", error);
		return { success: false, error: "Failed to broadcast focus state" };
	}
}

export async function getFocusSessionsByTaskAction(taskId: string) {
	try {
		const user = await requireAuth();
		await requireTaskCapability(user.clerkId, taskId, "canViewProject");

		const sessions = await db.query.focusSessions.findMany({
			where: eq(schema.focusSessions.taskId, taskId),
			orderBy: [desc(schema.focusSessions.startTime)],
		});

		return { success: true, data: sessions };
	} catch (error) {
		console.error("Failed to fetch focus sessions:", error);
		return { success: false, error: "Failed to fetch focus sessions" };
	}
}
