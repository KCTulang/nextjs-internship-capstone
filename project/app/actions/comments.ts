"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { queries } from "@/lib/db";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

const createCommentSchema = z.object({
	content: z.string().min(1, "Comment cannot be empty"),
	taskId: z.string().uuid(),
});

export async function getCommentsAction(taskId: string) {
	try {
		await requireAuth();
		const comments = await queries.comments.getByTask(taskId);
		return { success: true, data: comments };
	} catch (error) {
		console.error("Failed to fetch comments:", error);
		return { success: false, error: "Failed to fetch comments" };
	}
}

export async function createCommentAction(rawData: {
	content: string;
	taskId: string;
}) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		const data = createCommentSchema.parse(rawData);
		const newComment = await queries.comments.create({
			content: data.content,
			taskId: data.taskId,
			authorId: user.id,
		});

		import("./activity").then(({ logActivity }) => {
			logActivity(data.taskId, "comment_added");
		});

		revalidatePath(`/`, "layout");
		return { success: true, data: newComment[0] };
	} catch (error) {
		console.error("Failed to create comment:", error);
		return { success: false, error: "Failed to create comment" };
	}
}

export async function deleteCommentAction(commentId: string) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		const comment = await queries.comments.getById(commentId);
		if (!comment) return { success: false, error: "Comment not found" };
		if (comment.authorId !== user.id)
			return { success: false, error: "Not authorized to delete this comment" };

		await queries.comments.delete(commentId);
		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete comment:", error);
		return { success: false, error: "Failed to delete comment" };
	}
}
