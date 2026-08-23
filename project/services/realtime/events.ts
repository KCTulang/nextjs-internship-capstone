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
	| "list.completion_changed"
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

interface BaseCollaborationEvent<TType extends RealtimeEventType> {
	type: TType;
	projectId: string;
	actorId: string;
	entityId: string;
	timestamp: string;
}

export interface ListCompletionChangedEvent
	extends BaseCollaborationEvent<"list.completion_changed"> {
	payload: {
		completedListId: string;
	};
}

type GeneralRealtimeEventType = Exclude<
	RealtimeEventType,
	"list.completion_changed"
>;

type GeneralEventPayload = {
	task?: unknown;
	list?: unknown;
	comment?: unknown;
	notification?: unknown;
	[key: string]: unknown;
};

export type GeneralCollaborationEvent = {
	[TType in GeneralRealtimeEventType]: BaseCollaborationEvent<TType> & {
		payload?: GeneralEventPayload;
	};
}[GeneralRealtimeEventType];

export type CollaborationEvent =
	| ListCompletionChangedEvent
	| GeneralCollaborationEvent;

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
