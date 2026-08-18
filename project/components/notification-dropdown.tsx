"use client";

import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, Check, ChevronRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
	getNotificationPreferencesAction,
	getNotificationsAction,
	markAllNotificationsReadAction,
	markNotificationReadAction,
	updateNotificationPreferencesAction,
} from "@/app/actions/notifications";

type NotificationType = {
	id: string;
	type: string;
	entityId?: string | null;
	message?: string | null;
	readAt?: string | Date | null;
	createdAt: string | Date | null;
	actor?: { name?: string | null } | null;
	project?: { name: string; slug: string } | null;
};

interface PusherInstance {
	subscribe: (channel: string) => {
		bind: (
			event: string,
			callback: (data: { payload: NotificationType }) => void,
		) => void;
		unbind: (event: string) => void;
	};
	unsubscribe: (channel: string) => void;
}

export function NotificationDropdown() {
	const { userId } = useAuth();
	const router = useRouter();
	const [notifications, setNotifications] = useState<NotificationType[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [showMuteMenu, setShowMuteMenu] = useState(false);
	const [prefs, setPrefs] = useState<{
		muteAll?: boolean;
		mutedUntil?: Date | null;
	} | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const [pusher, setPusher] = useState<PusherInstance | null>(null);

	useEffect(() => {
		import("pusher-js").then((PusherModule) => {
			const Pusher = PusherModule.default;
			const p = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "dummy-key", {
				cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
				authEndpoint: "/api/pusher/auth",
			});
			setPusher(p);
		});
	}, []);

	useEffect(() => {
		if (!pusher || !userId) return;

		const channelName = `private-user-${userId}`;
		const channel = pusher.subscribe(channelName);

		channel.bind(
			"notification.received",
			(data: { payload: NotificationType }) => {
				setNotifications((prev) => [data.payload, ...prev]);
			},
		);

		return () => {
			channel.unbind("notification.received");
			pusher.unsubscribe(channelName);
		};
	}, [pusher, userId]);

	useEffect(() => {
		if (!userId) return;
		setIsLoading(true);
		Promise.all([
			getNotificationsAction(),
			getNotificationPreferencesAction(),
		]).then(([notifRes, prefsRes]) => {
			if (notifRes.success && notifRes.data) {
				setNotifications(notifRes.data);
			}
			if (prefsRes.success && prefsRes.data) {
				setPrefs(prefsRes.data);
			}
			setIsLoading(false);
		});
	}, [userId]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
				setShowMuteMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const unreadCount = notifications.filter((n) => !n.readAt).length;

	const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
		if (e) e.stopPropagation();
		await markNotificationReadAction(id);
		setNotifications((prev) =>
			prev.map((n) =>
				n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
			),
		);
	};

	const handleMarkAllRead = async () => {
		await markAllNotificationsReadAction();
		setNotifications((prev) =>
			prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
		);
	};

	const handleNotificationClick = (n: NotificationType) => {
		if (!n.readAt) {
			handleMarkAsRead(n.id);
		}
		setIsOpen(false);

		if (n.type === "invitation") {
			router.push("/projects");
		} else if (n.project?.slug) {
			let url = `/projects/${n.project.slug}`;
			if (
				n.entityId &&
				(n.type === "assignment" ||
					n.type === "mention" ||
					n.type === "comment")
			) {
				url += `?taskId=${n.entityId}`;
			}
			router.push(url);
		}
	};

	const handleMute = async (option: string) => {
		let updateData: { muteAll?: boolean; mutedUntil?: Date | null } = {};

		if (option === "off") {
			updateData = { muteAll: false, mutedUntil: null };
		} else if (option === "30m") {
			updateData = { mutedUntil: new Date(Date.now() + 30 * 60 * 1000) };
		} else if (option === "1h") {
			updateData = { mutedUntil: new Date(Date.now() + 60 * 60 * 1000) };
		} else if (option === "2h") {
			updateData = { mutedUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) };
		} else if (option === "tomorrow") {
			const tomorrow = new Date();
			tomorrow.setHours(24, 0, 0, 0);
			updateData = { mutedUntil: tomorrow };
		} else if (option === "always") {
			updateData = { muteAll: true, mutedUntil: null };
		}

		setPrefs((prev) => ({ ...prev, ...updateData }));
		setShowMuteMenu(false);

		await updateNotificationPreferencesAction(updateData);
	};

	const formatRelativeTime = (dateStr: string | Date | null) => {
		if (!dateStr) return "";
		const diff = Date.now() - new Date(dateStr).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	};

	const isMuted =
		prefs?.muteAll ||
		(prefs?.mutedUntil && new Date(prefs.mutedUntil) > new Date());

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				type="button"
				onClick={() => {
					setIsOpen(!isOpen);
					setShowMuteMenu(false);
				}}
				className={`relative p-2 rounded-full transition-colors ${
					isMuted
						? "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted"
						: "text-muted-foreground hover:text-foreground hover:bg-muted"
				}`}
				title={isMuted ? "Notifications muted" : "Notifications"}
			>
				{isMuted ? <BellOff size={20} /> : <Bell size={20} />}
				{unreadCount > 0 && (
					<span
						className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-background ${isMuted ? "bg-muted-foreground/50" : "bg-red-500"}`}
					></span>
				)}
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: 10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
					>
						<div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
							<h3 className="font-semibold text-sm flex items-center gap-2">
								{showMuteMenu ? (
									<>
										<button
											type="button"
											onClick={() => setShowMuteMenu(false)}
											className="text-muted-foreground hover:text-foreground"
										>
											<ChevronRight size={16} className="rotate-180" />
										</button>
										Mute notifications
									</>
								) : (
									"Notifications"
								)}
							</h3>
							{!showMuteMenu && unreadCount > 0 && (
								<button
									type="button"
									onClick={handleMarkAllRead}
									className="text-xs text-primary hover:underline font-medium"
								>
									Mark all as read
								</button>
							)}
						</div>

						{showMuteMenu ? (
							<div className="p-2 space-y-1">
								<button
									type="button"
									onClick={() => handleMute("off")}
									className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center justify-between"
								>
									<span>Off</span>
									{!isMuted && <Check size={14} className="text-primary" />}
								</button>
								<button
									type="button"
									onClick={() => handleMute("30m")}
									className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
								>
									30 minutes
								</button>
								<button
									type="button"
									onClick={() => handleMute("1h")}
									className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
								>
									1 hour
								</button>
								<button
									type="button"
									onClick={() => handleMute("2h")}
									className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
								>
									2 hours
								</button>
								<button
									type="button"
									onClick={() => handleMute("tomorrow")}
									className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
								>
									Until tomorrow
								</button>
								<button
									type="button"
									onClick={() => handleMute("always")}
									className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex items-center justify-between"
								>
									<span>Until turned off</span>
									{prefs?.muteAll && (
										<Check size={14} className="text-primary" />
									)}
								</button>
							</div>
						) : (
							<>
								<div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
									{isLoading ? (
										<div className="p-8 text-center text-muted-foreground text-sm">
											Loading...
										</div>
									) : notifications.length === 0 ? (
										<div className="p-8 text-center flex flex-col items-center">
											<Bell
												size={32}
												className="text-muted-foreground/30 mb-3"
											/>
											<p className="text-muted-foreground text-sm">
												No notifications yet
											</p>
										</div>
									) : (
										<div className="divide-y divide-border/50">
											{notifications.map((n) => (
												<div
													key={n.id}
													className={`w-full relative group ${!n.readAt ? "bg-primary/5" : ""}`}
												>
													<button
														type="button"
														onClick={() => handleNotificationClick(n)}
														className="w-full text-left p-4 hover:bg-muted/30 transition-colors flex gap-3 outline-none focus-visible:bg-muted/30"
													>
														<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
															<span className="text-xs font-bold text-primary">
																{n.actor?.name?.substring(0, 2).toUpperCase() ||
																	"U"}
															</span>
														</div>
														<div className="flex-1 min-w-0 pr-6">
															<p className="text-sm text-foreground/90 leading-snug">
																<span className="font-semibold text-foreground mr-1">
																	{n.actor?.name}
																</span>
																{n.message}
															</p>
															<div className="flex items-center gap-2 mt-1">
																{n.project && (
																	<span className="text-xs text-primary/80 font-medium truncate">
																		{n.project.name}
																	</span>
																)}
																<span className="text-[10px] text-muted-foreground">
																	{formatRelativeTime(n.createdAt)}
																</span>
															</div>
														</div>
													</button>

													{!n.readAt && (
														<button
															type="button"
															onClick={(e) => handleMarkAsRead(n.id, e)}
															className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10 focus-visible:opacity-100"
															title="Mark as read"
														>
															<Check size={14} />
														</button>
													)}
												</div>
											))}
										</div>
									)}
								</div>
								<div className="p-2 border-t border-border bg-muted/10 grid grid-cols-2 gap-2">
									<button
										type="button"
										onClick={() => setShowMuteMenu(true)}
										className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
									>
										<BellOff size={14} />
										Mute
									</button>
									<button
										type="button"
										onClick={() => {
											setIsOpen(false);
											router.push("/settings/notifications");
										}}
										className="flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
									>
										<Settings size={14} />
										Settings
									</button>
								</div>
							</>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
