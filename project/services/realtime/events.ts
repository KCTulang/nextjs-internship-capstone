import {
	getProjectChannel,
	getUserPrivateChannel,
} from "@/services/realtime/channels";
import { pusherServer } from "@/services/realtime/pusher";

export type RealtimeEventType =
	| "task.created"
	| "task.updated"
	| "task.deleted"
	| "task.moved"
	| "task.reordered"
	| "task.assigned"
	| "task.unassigned"
	| "list.created"
	| "list.updated"
	| "list.deleted"
	| "list.reordered"
	| "comment.created"
	| "comment.updated"
	| "comment.deleted"
	| "member.added"
	| "member.updated"
	| "member.removed"
	| "focus.started"
	| "focus.completed"
	| "focus.cancelled"
	| "notification.created";

export interface CollaborationEvent {
	type: RealtimeEventType;
	projectId: string;
	actorId: string;
	entityId: string;
	timestamp: string;
	payload?: {
		task?: unknown;
		list?: unknown;
		comment?: unknown;
		notification?: unknown;
		[key: string]: unknown;
	};
}

export async function publishProjectEvent(event: CollaborationEvent) {
	try {
		const channel = getProjectChannel(event.projectId);
		await pusherServer.trigger(channel, event.type, event);
	} catch (error) {
		console.error("Failed to publish real-time event:", error);
	}
}

export async function publishUserEvent(
	userId: string,
	event: { type: string; payload: unknown; [key: string]: unknown },
) {
	try {
		const channel = getUserPrivateChannel(userId);
		await pusherServer.trigger(channel, event.type, event);
	} catch (error) {
		console.error("Failed to publish user event:", error);
	}
}
