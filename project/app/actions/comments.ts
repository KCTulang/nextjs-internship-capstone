"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNotificationAction } from "@/app/actions/notifications";
import { db, queries } from "@/lib/db";
import {
	getTaskProjectId,
	requireProjectCapability,
} from "@/lib/db/project-permissions";
import { lists, projectMembers, tasks } from "@/lib/db/schema";
import { publishProjectEvent } from "@/services/realtime/events";

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
		const clerkId = await requireAuth();
		const projectId = await getTaskProjectId(taskId);
		if (!projectId) return { success: false, error: "Task not found" };
		await requireProjectCapability(clerkId, projectId, "canViewProject");
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
		const projectId = await getTaskProjectId(data.taskId);
		if (!projectId) return { success: false, error: "Task not found" };
		await requireProjectCapability(clerkId, projectId, "canMutateTasks");
		const newComment = await queries.comments.create({
			content: data.content,
			taskId: data.taskId,
			authorId: user.id,
		});

		import("./activity").then(({ logActivity }) => {
			logActivity(data.taskId, "comment_added");
		});

		const task = await db.query.tasks.findFirst({
			where: eq(tasks.id, data.taskId),
		});
		if (task?.listId) {
			const list = await db.query.lists.findFirst({
				where: eq(lists.id, task.listId),
			});
			if (list?.projectId) {
				await publishProjectEvent({
					type: "comment.created",
					projectId: list.projectId,
					actorId: user.id,
					entityId: newComment[0].id,
					timestamp: new Date().toISOString(),
					payload: { comment: newComment[0] },
				});

				const mentionRegex = /@([a-zA-Z0-9_]+)/g;
				const matches = [...data.content.matchAll(mentionRegex)];
				const mentionedNames = matches.map((m) => m[1]);

				let mentionedUsers: Array<{ id: string; name: string | null }> = [];

				if (mentionedNames.length > 0) {
					const members = await db.query.projectMembers.findMany({
						where: eq(projectMembers.projectId, list.projectId),
						with: {
							user: true,
						},
					});

					mentionedUsers = members
						.map((m) => m.user)
						.filter(
							(u): u is NonNullable<typeof u> =>
								u !== null &&
								u.name !== null &&
								mentionedNames.some((name) =>
									u.name?.toLowerCase().includes(name.toLowerCase()),
								),
						);

					for (const mUser of mentionedUsers) {
						if (mUser.id !== user.id) {
							await createNotificationAction({
								userId: mUser.id,
								actorId: user.id,
								type: "mention",
								taskId: data.taskId,
								projectId: list.projectId,
								message: "mentioned you in a comment",
							});
						}
					}
				}

				if (task.assigneeId && task.assigneeId !== user.id) {
					const alreadyMentioned = mentionedUsers.some(
						(u) => u.id === task.assigneeId,
					);
					if (!alreadyMentioned) {
						await createNotificationAction({
							userId: task.assigneeId,
							actorId: user.id,
							type: "comment",
							taskId: data.taskId,
							projectId: list.projectId,
							message: "commented on a task you are assigned to",
						});
					}
				}
			}
		}

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
		const projectId = await getTaskProjectId(comment.taskId);
		if (!projectId) return { success: false, error: "Task not found" };
		await requireProjectCapability(clerkId, projectId, "canMutateTasks");
		if (comment.authorId !== user.id)
			return { success: false, error: "Not authorized to delete this comment" };

		await queries.comments.delete(commentId);

		const task = await db.query.tasks.findFirst({
			where: eq(tasks.id, comment.taskId),
		});
		if (task?.listId) {
			const list = await db.query.lists.findFirst({
				where: eq(lists.id, task.listId),
			});
			if (list?.projectId) {
				await publishProjectEvent({
					type: "comment.deleted",
					projectId: list.projectId,
					actorId: user.id,
					entityId: commentId,
					timestamp: new Date().toISOString(),
				});
			}
		}

		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete comment:", error);
		return { success: false, error: "Failed to delete comment" };
	}
}
