"use client";

import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { useCollaboration } from "@/hooks/use-collaboration";

interface PresenceAvatarsProps {
	projectId: string;
}

interface ActiveUser {
	id: string;
	info: {
		name: string;
		imageUrl?: string;
	};
}

interface PusherMember {
	id: string;
	info: {
		name: string;
		imageUrl?: string;
	};
}

interface PusherMembers {
	each: (callback: (member: PusherMember) => void) => void;
}

export function PresenceAvatars({ projectId }: PresenceAvatarsProps) {
	const { pusher, useEvent } = useCollaboration(projectId);
	const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
	const [focusingUserIds, setFocusingUserIds] = useState<Set<string>>(
		new Set(),
	);

	useEvent("focus.started", (e) => {
		setFocusingUserIds((prev) => {
			const next = new Set(prev);
			next.add(e.actorId);
			return next;
		});
	});

	useEvent("focus.completed", (e) => {
		setFocusingUserIds((prev) => {
			const next = new Set(prev);
			next.delete(e.actorId);
			return next;
		});
	});

	useEvent("focus.cancelled", (e) => {
		setFocusingUserIds((prev) => {
			const next = new Set(prev);
			next.delete(e.actorId);
			return next;
		});
	});

	useEffect(() => {
		if (!pusher) return;

		const channelName = `presence-project-${projectId}`;
		const channel = pusher.subscribe(channelName);

		channel.bind("pusher:subscription_succeeded", (members: PusherMembers) => {
			const users: ActiveUser[] = [];
			members.each((member: PusherMember) => {
				users.push({ id: member.id, info: member.info });
			});
			setActiveUsers(users);
		});

		channel.bind("pusher:member_added", (member: PusherMember) => {
			setActiveUsers((prev) => {
				if (prev.find((u) => u.id === member.id)) return prev;
				return [...prev, { id: member.id, info: member.info }];
			});
		});

		channel.bind("pusher:member_removed", (member: PusherMember) => {
			setActiveUsers((prev) => prev.filter((u) => u.id !== member.id));
		});

		return () => {
			channel.unbind("pusher:subscription_succeeded");
			channel.unbind("pusher:member_added");
			channel.unbind("pusher:member_removed");
			pusher.unsubscribe(channelName);
		};
	}, [pusher, projectId]);

	if (activeUsers.length === 0) return null;

	const maxDisplay = 4;
	const displayUsers = activeUsers.slice(0, maxDisplay);
	const remainingCount = Math.max(0, activeUsers.length - maxDisplay);

	return (
		<div className="flex items-center">
			<div className="flex -space-x-2 mr-2">
				{displayUsers.map((user) => (
					<div
						key={user.id}
						className="relative w-8 h-8 rounded-full border-2 border-background overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 group cursor-default"
						title={user.info.name}
					>
						<UserAvatar
							customAvatarUrl={user.info.imageUrl ?? null}
							googleAvatarUrl={null}
							firstName={user.info.name.split(" ")[0]}
							lastName={user.info.name.split(" ").slice(1).join(" ") || null}
							size={32}
						/>
						{focusingUserIds.has(user.id) && (
							<div
								className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 z-20"
								title="Focusing"
							>
								<span className="text-[10px]">🔒</span>
							</div>
						)}
					</div>
				))}
				{remainingCount > 0 && (
					<div
						className="relative w-8 h-8 rounded-full border-2 border-background overflow-hidden bg-muted flex items-center justify-center shrink-0 z-10"
						title={`${remainingCount} more users`}
					>
						<span className="text-[10px] font-medium text-foreground">
							+{remainingCount}
						</span>
					</div>
				)}
			</div>
			{activeUsers.length > 1 && (
				<span className="text-xs text-muted-foreground mr-4 hidden md:inline-block">
					{activeUsers.length} active
				</span>
			)}
		</div>
	);
}
