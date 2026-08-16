"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

async function requireAuth() {
	const { userId: clerkId } = await auth();
	if (!clerkId) throw new Error("Unauthorized");

	const user = await db.query.users.findFirst({
		where: eq(schema.users.clerkId, clerkId),
	});

	if (!user) throw new Error("User not found");
	return user.id;
}

export async function saveFocusSession(data: {
	taskId: string;
	startTime: Date;
	endTime: Date;
	duration: number; // in seconds
}) {
	try {
		const userId = await requireAuth();

		await db.insert(schema.focusSessions).values({
			userId,
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
