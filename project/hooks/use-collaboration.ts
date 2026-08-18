"use client";

import Pusher from "pusher-js";
import { useEffect, useState } from "react";
import type {
	CollaborationEvent,
	RealtimeEventType,
} from "@/services/realtime/events";

let globalPusherInstance: Pusher | null = null;

const getPusher = () => {
	if (typeof window === "undefined") return null;
	if (!globalPusherInstance) {
		globalPusherInstance = new Pusher(
			process.env.NEXT_PUBLIC_PUSHER_KEY || "dummy-key",
			{
				cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
				authEndpoint: "/api/pusher/auth",
			},
		);
	}
	return globalPusherInstance;
};

type EventHandler = (event: CollaborationEvent) => void;

export function useProjectEvent(
	pusher: Pusher | null,
	projectId: string | null | undefined,
	eventType: RealtimeEventType,
	handler: EventHandler,
	deps: unknown[] = [],
) {
	useEffect(() => {
		if (!pusher || !projectId) return;

		const channelName = `private-project-${projectId}`;
		const channel =
			pusher.channel(channelName) || pusher.subscribe(channelName);

		channel.bind(eventType, handler);

		return () => {
			channel.unbind(eventType, handler);
		};
	}, [pusher, projectId, eventType, handler, ...deps]);
}

export function useCollaboration(projectId: string | null | undefined) {
	const [pusher, setPusher] = useState<Pusher | null>(null);

	useEffect(() => {
		setPusher(getPusher());
	}, []);

	useEffect(() => {
		if (!pusher || !projectId) return;

		const channelName = `private-project-${projectId}`;
		pusher.subscribe(channelName);

		return () => {
			pusher.unsubscribe(channelName);
		};
	}, [pusher, projectId]);

	const useEvent = (
		eventType: RealtimeEventType,
		handler: EventHandler,
		deps: unknown[] = [],
	) => {
		useProjectEvent(pusher, projectId, eventType, handler, deps);
	};

	return { pusher, useEvent };
}
