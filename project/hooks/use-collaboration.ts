"use client";

import Pusher from "pusher-js";
import { useEffect, useRef, useState } from "react";
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

type EventHandler<TType extends RealtimeEventType> = (
	event: Extract<CollaborationEvent, { type: TType }>,
) => void;

export function useProjectEvent<TType extends RealtimeEventType>(
	pusher: Pusher | null,
	projectId: string | null | undefined,
	eventType: TType,
	handler: EventHandler<TType>,
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

export function usePusherReconnect(pusher: Pusher | null, handler: () => void) {
	const handlerRef = useRef(handler);
	const hasConnected = useRef(false);
	handlerRef.current = handler;

	useEffect(() => {
		if (!pusher) return;
		hasConnected.current = pusher.connection.state === "connected";
		const handleConnected = () => {
			if (hasConnected.current) handlerRef.current();
			hasConnected.current = true;
		};
		pusher.connection.bind("connected", handleConnected);
		return () => {
			pusher.connection.unbind("connected", handleConnected);
		};
	}, [pusher]);
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

	const useEvent = <TType extends RealtimeEventType>(
		eventType: TType,
		handler: EventHandler<TType>,
		deps: unknown[] = [],
	) => {
		useProjectEvent(pusher, projectId, eventType, handler, deps);
	};
	return { pusher, useEvent };
}
