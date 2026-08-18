"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Circle, Flag, Target, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	createCommentAction,
	deleteCommentAction,
	getCommentsAction,
} from "@/app/actions/comments";
import type { CalendarTask } from "@/components/calendar/calendar-grid";
import { useCollaboration } from "@/hooks/use-collaboration";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type Task, useTasksStore } from "@/stores/board-store";
import { useFocusStore } from "@/stores/focus-store";
import { formatFocusDuration } from "@/utils";

interface TaskDetailPanelProps {
	taskId: string | null;
	projectId?: string | null;
	initialTask?: Task | CalendarTask | null;
	onClose?: () => void;
	onUpdate?: () => void;
}

export function TaskDetailPanel({
	taskId,
	projectId,
	initialTask,
	onClose,
	onUpdate,
}: TaskDetailPanelProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { lists, members, updateTaskDetails, deleteTask } = useTasksStore();
	const { startLockIn, isLockedIn } = useFocusStore();
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const storeTask =
		taskId && projectId
			? lists.flatMap((l) => l.tasks).find((t) => t.id === taskId)
			: null;
	const task = (storeTask as Task) || (initialTask as Task) || null;

	const [title, setTitle] = useState(task?.title || "");
	const [description, setDescription] = useState(task?.description || "");
	const [labelsString, setLabelsString] = useState(
		task?.labels?.join(", ") || "",
	);
	type Comment = {
		id: string;
		content?: string | null;
		createdAt?: string | Date | null;
		author?: {
			id?: string;
			name?: string | null;
			email?: string | null;
		} | null;
		[key: string]: unknown;
	};
	type Activity = {
		id: string;
		type: string;
		createdAt: string | Date | null;
		user?: {
			id?: string;
			name?: string;
			email?: string;
			createdAt?: string | Date | null;
		} | null;
		fromValue?: string | null;
		toValue?: string | null;
		[key: string]: unknown;
	};
	const [comments, setComments] = useState<Comment[]>([]);
	const [activities, setActivities] = useState<Activity[]>([]);
	const [activeTab, setActiveTab] = useState<"comments" | "activity">(
		"comments",
	);
	const [newComment, setNewComment] = useState("");
	const [isCommentsLoading, setIsCommentsLoading] = useState(false);
	const [isActivityLoading, setIsActivityLoading] = useState(false);
	const titleRef = useRef<HTMLTextAreaElement>(null);

	type FocusSession = {
		id: string;
		duration: number | null;
		startTime: Date;
	};
	const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);

	const fetchFocusSessions = useCallback((id: string) => {
		import("@/app/actions/focus-sessions").then(
			({ getFocusSessionsByTaskAction }) => {
				getFocusSessionsByTaskAction(id).then((res) => {
					if (res.success && res.data) {
						setFocusSessions(res.data as unknown as FocusSession[]);
					}
				});
			},
		);
	}, []);

	useEffect(() => {
		if (taskId) fetchFocusSessions(taskId);
	}, [taskId, fetchFocusSessions]);

	const prevLockedInRef = useRef(isLockedIn);
	useEffect(() => {
		if (prevLockedInRef.current && !isLockedIn && taskId) {
			fetchFocusSessions(taskId);
		}
		prevLockedInRef.current = isLockedIn;
	}, [isLockedIn, taskId, fetchFocusSessions]);

	const taskRef = useRef(task);
	taskRef.current = task;
	const updateTaskDetailsRef = useRef(updateTaskDetails);
	updateTaskDetailsRef.current = updateTaskDetails;
	const projectIdRef = useRef(projectId);
	projectIdRef.current = projectId;

	useEffect(() => {
		const currentTask = taskRef.current;
		if (currentTask && currentTask.id === taskId) {
			setTitle(currentTask.title);
			setDescription(currentTask.description || "");
			setLabelsString(currentTask.labels?.join(", ") || "");

			setIsCommentsLoading(true);
			getCommentsAction(currentTask.id).then((res) => {
				if (res.success && res.data) {
					setComments(res.data);
					useTasksStore.getState().updateTaskComments(
						currentTask.id,
						res.data.map((c) => ({ id: c.id })),
					);
				}
				setIsCommentsLoading(false);
			});

			setIsActivityLoading(true);
			import("@/app/actions/activity").then(({ getActivityByTaskAction }) => {
				getActivityByTaskAction(currentTask.id).then((res) => {
					if (res.success && res.data) {
						setActivities(res.data);
					}
					setIsActivityLoading(false);
				});
			});

			setTimeout(() => {
				if (titleRef.current) {
					titleRef.current.style.height = "auto";
					titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
				}
			}, 0);
		}
	}, [taskId]);

	const { useEvent } = useCollaboration(projectId);
	useEvent(
		"comment.created",
		(event) => {
			const commentData = event.payload?.comment as
				| { taskId?: string }
				| undefined;
			if (taskId && commentData?.taskId === taskId) {
				getCommentsAction(taskId).then((res) => {
					if (res.success && res.data) {
						setComments(res.data);
						useTasksStore.getState().updateTaskComments(
							taskId,
							res.data.map((c) => ({ id: c.id })),
						);
					}
				});
			}
		},
		[taskId],
	);
	useEvent(
		"comment.deleted",
		(event) => {
			if (taskId) {
				setComments((prev) => prev.filter((c) => c.id !== event.entityId));
			}
		},
		[taskId],
	);

	useEffect(() => {
		if (!taskId) return;

		const handler = setTimeout(() => {
			const currentTask = taskRef.current;
			if (!currentTask) return;
			const updates: Partial<Task> = {};
			if (title !== currentTask.title) updates.title = title;
			if (description !== (currentTask.description || ""))
				updates.description = description;

			const newLabelsArray = labelsString
				.split(",")
				.map((l) => l.trim())
				.filter(Boolean);
			const currentLabelsArray = currentTask.labels || [];
			if (newLabelsArray.join(",") !== currentLabelsArray.join(",")) {
				updates.labels = newLabelsArray;
			}

			if (Object.keys(updates).length > 0) {
				updateTaskDetailsRef.current(
					currentTask.id,
					updates,
					projectIdRef.current,
				);

				setTimeout(() => {
					import("@/app/actions/activity").then(
						({ getActivityByTaskAction }) => {
							getActivityByTaskAction(currentTask.id).then((res) => {
								if (res.success && res.data) {
									setActivities(res.data);
								}
							});
						},
					);
				}, 1000);
			}
		}, 500);

		return () => clearTimeout(handler);
	}, [title, description, labelsString, taskId]);

	const handleClose = useCallback(() => {
		if (onClose) {
			onClose();
		} else {
			const params = new URLSearchParams(searchParams.toString());
			params.delete("taskId");
			router.push(`${pathname}?${params.toString()}`, { scroll: false });
		}
	}, [router, pathname, searchParams, onClose]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && taskId) {
				handleClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [taskId, handleClose]);

	const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (!task) return;
		updateTaskDetails(task.id, { listId: e.target.value }, projectId);
		setTimeout(() => {
			import("@/app/actions/activity").then(({ getActivityByTaskAction }) => {
				getActivityByTaskAction(task.id).then((res) => {
					if (res.success && res.data) {
						setActivities(res.data);
					}
				});
			});
		}, 1000);
	};

	const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (!task) return;
		updateTaskDetails(
			task.id,
			{ priority: e.target.value as "low" | "medium" | "high" },
			projectId,
		);
		setTimeout(() => {
			import("@/app/actions/activity").then(({ getActivityByTaskAction }) => {
				getActivityByTaskAction(task.id).then((res) => {
					if (res.success && res.data) {
						setActivities(res.data);
					}
				});
			});
		}, 1000);
	};

	const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (!task) return;
		const assigneeId = e.target.value === "unassigned" ? null : e.target.value;
		const assignee = assigneeId
			? members.find((m) => m.id === assigneeId)
			: null;
		updateTaskDetails(
			task.id,
			{
				assigneeId,
				assignee: assignee
					? { id: assignee.id, name: assignee.name, email: assignee.email }
					: null,
			},
			projectId,
		);
		setTimeout(() => {
			import("@/app/actions/activity").then(({ getActivityByTaskAction }) => {
				getActivityByTaskAction(task.id).then((res) => {
					if (res.success && res.data) setActivities(res.data);
				});
			});
		}, 1000);
	};

	const handleDelete = async () => {
		if (!task) return;
		setIsConfirmingDelete(true);
	};

	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

	const confirmDelete = async () => {
		if (!task) return;
		await deleteTask(task.id);
		if (onUpdate) onUpdate();
		handleClose();
	};

	const handleAddComment = async () => {
		if (!task || !newComment.trim()) return;
		const res = await createCommentAction({
			taskId: task.id,
			content: newComment.trim(),
		});
		if (res.success && res.data) {
			getCommentsAction(task.id).then((res) => {
				if (res.success && res.data) {
					setComments(res.data);
					useTasksStore.getState().updateTaskComments(
						task.id,
						res.data.map((c) => ({ id: c.id })),
					);
				}
			});
			setNewComment("");
			setTimeout(() => {
				import("@/app/actions/activity").then(({ getActivityByTaskAction }) => {
					getActivityByTaskAction(task.id).then((res) => {
						if (res.success && res.data) setActivities(res.data);
					});
				});
			}, 1000);
		}
	};

	const handleDeleteComment = async (commentId: string) => {
		if (!task) return;
		const res = await deleteCommentAction(commentId);
		if (res.success) {
			setComments((prev) => {
				const newComments = prev.filter((c) => c.id !== commentId);
				useTasksStore.getState().updateTaskComments(
					task.id,
					newComments.map((c) => ({ id: c.id })),
				);
				return newComments;
			});
		}
	};

	const priorities = ["low", "medium", "high", "urgent"];

	const now = new Date();
	const todayStart = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	).getTime();
	const yesterdayStart = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() - 1,
	).getTime();

	let totalDuration = 0;
	let todayDuration = 0;
	let yesterdayDuration = 0;
	let todayCount = 0;
	let yesterdayCount = 0;

	for (const session of focusSessions) {
		const duration = session.duration || 0;
		if (duration <= 0) continue;

		totalDuration += duration;
		const startTime = new Date(session.startTime).getTime();

		if (startTime >= todayStart) {
			todayDuration += duration;
			todayCount++;
		} else if (startTime >= yesterdayStart && startTime < todayStart) {
			yesterdayDuration += duration;
			yesterdayCount++;
		}
	}

	const formatActivityMessage = (activity: Activity) => {
		const type = activity.type as string;
		switch (type) {
			case "status_changed":
				return "moved the task";
			case "priority_changed":
				return `changed priority from ${activity.fromValue} to ${activity.toValue}`;
			case "assigned":
				return `assigned the task`;
			case "unassigned":
				return `removed the assignee`;
			case "due_date_changed":
				return `updated the due date`;
			case "title_changed":
				return `renamed the task`;
			case "description_changed":
				return `updated the description`;
			case "label_added":
				return `added label "${activity.toValue}"`;
			case "label_removed":
				return `removed label "${activity.fromValue}"`;
			case "comment_added":
				return `added a comment`;
			default:
				return "updated the task";
		}
	};

	if (!mounted) return null;

	return (
		<AnimatePresence>
			{taskId && task && (
				<motion.div
					key="backdrop"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					onClick={handleClose}
					className="fixed inset-0 z-50 bg-background/80"
				/>
			)}

			{taskId && task && (
				<motion.div
					key="panel"
					initial={isDesktop ? { x: "100%", y: 0 } : { y: "100%", x: 0 }}
					animate={{ x: 0, y: 0 }}
					exit={isDesktop ? { x: "100%", y: 0 } : { y: "100%", x: 0 }}
					transition={{ type: "spring", damping: 30, stiffness: 300 }}
					className={`fixed z-50 bg-background shadow-2xl overflow-y-auto ${
						isDesktop
							? "top-0 right-0 bottom-0 w-150 border-l border-border"
							: "bottom-0 left-0 right-0 h-[90vh] rounded-t-3xl border-t border-border"
					}`}
					role="dialog"
					aria-modal="true"
				>
					<div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-[glow-drift_8s_ease-in-out_infinite] pointer-events-none" />
					<div className="absolute bottom-1/2 left-0 w-56 h-56 bg-primary/5 rounded-full blur-2xl animate-[glow-pulse_4s_ease-in-out_infinite] pointer-events-none" />

					{!isDesktop && (
						<div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full z-20" />
					)}

					{isConfirmingDelete && (
						<div className="absolute inset-0 z-50 bg-background/95 backdrop-blur flex items-center justify-center p-6">
							<div className="bg-card border border-border p-6 rounded-xl shadow-2xl w-full max-w-sm text-center">
								<h4 className="text-lg font-semibold text-foreground mb-2">
									Delete Task?
								</h4>
								<p className="text-muted-foreground text-sm mb-6">
									This action cannot be undone.
								</p>
								<div className="flex gap-3 justify-center">
									<button
										type="button"
										onClick={() => setIsConfirmingDelete(false)}
										className="px-4 py-2 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/80"
									>
										Cancel
									</button>
									<button
										type="button"
										onClick={confirmDelete}
										className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90"
									>
										Yes, Delete
									</button>
								</div>
							</div>
						</div>
					)}

					<div className="flex flex-col min-h-full pb-20 relative z-10">
						<div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-primary/10 mt-4 md:mt-0">
							<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
								<Circle size={12} className="fill-current opacity-70" />
								<span>{lists.find((l) => l.id === task.listId)?.name}</span>
							</div>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => {
										if (task) {
											startLockIn(task);
											window.dispatchEvent(new Event("prime-audio"));
										}
									}}
									className="p-2 text-primary hover:text-primary-foreground hover:bg-primary rounded-xl transition-all"
									title="Lock In"
								>
									<Target size={18} />
								</button>
								<button
									type="button"
									onClick={handleDelete}
									className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
									title="Delete Task"
								>
									<Trash2 size={18} />
								</button>
								<button
									type="button"
									onClick={handleClose}
									className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
								>
									<X size={20} />
								</button>
							</div>
						</div>

						<div className="flex-1 px-6 py-8">
							<textarea
								ref={titleRef}
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Task Title"
								className="w-full text-2xl md:text-3xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 resize-none overflow-hidden text-foreground placeholder:text-muted-foreground/30 leading-tight tracking-tight mt-2"
								rows={1}
								onInput={(e) => {
									const target = e.target as HTMLTextAreaElement;
									target.style.height = "auto";
									target.style.height = `${target.scrollHeight}px`;
								}}
							/>

							<div className="mt-8 space-y-3 max-w-md">
								<div className="flex items-center gap-4 group bg-card border border-border hover:border-primary/50 transition-all rounded-xl px-4 py-2.5 relative overflow-hidden">
									<div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
									<div className="flex items-center gap-2 text-sm text-muted-foreground w-28 shrink-0 relative z-10">
										<Circle size={15} className="text-primary/70" />
										<span className="font-medium">Status</span>
									</div>
									<select
										value={task.listId}
										onChange={handleStatusChange}
										className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none appearance-none cursor-pointer relative z-10"
									>
										{lists.map((list) => (
											<option
												key={list.id}
												value={list.id}
												className="bg-card text-foreground"
											>
												{list.name}
											</option>
										))}
									</select>
								</div>

								<div className="flex items-center gap-4 group bg-card border border-border hover:border-primary/50 transition-all rounded-xl px-4 py-2.5 relative overflow-hidden">
									<div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
									<div className="flex items-center gap-2 text-sm text-muted-foreground w-28 shrink-0 relative z-10">
										<Flag size={15} className="text-primary/70" />
										<span className="font-medium">Priority</span>
									</div>
									<select
										value={task.priority}
										onChange={handlePriorityChange}
										className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none appearance-none cursor-pointer relative z-10 capitalize"
									>
										{priorities.map((p) => (
											<option
												key={p}
												value={p}
												className="bg-card text-foreground capitalize"
											>
												{p}
											</option>
										))}
									</select>
								</div>

								<div className="flex items-center gap-4 group bg-card border border-border hover:border-primary/50 transition-all rounded-xl px-4 py-2.5 relative overflow-hidden">
									<div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
									<div className="flex items-center gap-2 text-sm text-muted-foreground w-28 shrink-0 relative z-10">
										<svg
											aria-hidden="true"
											width="15"
											height="15"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="text-primary/70"
										>
											<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
											<circle cx="12" cy="7" r="4"></circle>
										</svg>
										<span className="font-medium">Assignee</span>
									</div>
									<select
										value={task.assigneeId || "unassigned"}
										onChange={handleAssigneeChange}
										className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none appearance-none cursor-pointer relative z-10"
									>
										<option
											value="unassigned"
											className="bg-card text-foreground"
										>
											Unassigned
										</option>
										{members?.map((m) => (
											<option
												key={m.id}
												value={m.id}
												className="bg-card text-foreground"
											>
												{m.name || m.email}
											</option>
										))}
									</select>
								</div>

								<div className="flex items-center gap-4 group bg-card border border-border hover:border-primary/50 transition-all rounded-xl px-4 py-2.5 relative overflow-hidden">
									<div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
									<div className="flex items-center gap-2 text-sm text-muted-foreground w-28 shrink-0 relative z-10">
										<Calendar size={15} className="text-primary/70" />
										<span className="font-medium">Due Date</span>
									</div>
									<input
										type="date"
										value={
											task.dueDate
												? new Date(task.dueDate).toISOString().split("T")[0]
												: ""
										}
										onChange={(e) => {
											const date = e.target.value
												? new Date(e.target.value)
												: null;
											updateTaskDetails(task.id, { dueDate: date });
											setTimeout(() => {
												import("@/app/actions/activity").then(
													({ getActivityByTaskAction }) => {
														getActivityByTaskAction(task.id).then((res) => {
															if (res.success && res.data)
																setActivities(res.data);
														});
													},
												);
											}, 1000);
										}}
										className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none transition-colors dark:[scheme:dark] relative z-10"
									/>
								</div>

								<div className="flex items-center gap-4 group bg-card border border-border hover:border-primary/50 transition-all rounded-xl px-4 py-2.5 relative overflow-hidden">
									<div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
									<div className="flex items-center gap-2 text-sm text-muted-foreground w-28 shrink-0 relative z-10">
										<svg
											aria-hidden="true"
											width="15"
											height="15"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="text-primary/70"
										>
											<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
											<line x1="7" y1="7" x2="7.01" y2="7"></line>
										</svg>
										<span className="font-medium">Labels</span>
									</div>
									<input
										type="text"
										value={labelsString}
										onChange={(e) => setLabelsString(e.target.value)}
										placeholder="Comma-separated"
										className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none transition-colors relative z-10 placeholder:text-muted-foreground/40"
									/>
								</div>
							</div>

							<div className="mt-8 space-y-3 max-w-md">
								<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
									<Target size={15} className="text-primary" />
									Focus Time
								</h3>
								<div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-6 items-start">
									{focusSessions.length === 0 ? (
										<p className="text-sm text-muted-foreground">0m total</p>
									) : (
										<>
											<div>
												<p className="text-xl font-bold text-foreground">
													{formatFocusDuration(totalDuration)}{" "}
													<span className="text-sm font-normal text-muted-foreground">
														total
													</span>
												</p>
											</div>
											{(todayCount > 0 || yesterdayCount > 0) && (
												<div className="flex gap-6 border-l border-border pl-6">
													{todayCount > 0 && (
														<div>
															<p className="text-sm font-medium text-foreground">
																Today
															</p>
															<p className="text-xs text-muted-foreground mt-0.5">
																{formatFocusDuration(todayDuration)} ·{" "}
																{todayCount} session
																{todayCount !== 1 ? "s" : ""}
															</p>
														</div>
													)}
													{yesterdayCount > 0 && (
														<div>
															<p className="text-sm font-medium text-foreground">
																Yesterday
															</p>
															<p className="text-xs text-muted-foreground mt-0.5">
																{formatFocusDuration(yesterdayDuration)} ·{" "}
																{yesterdayCount} session
																{yesterdayCount !== 1 ? "s" : ""}
															</p>
														</div>
													)}
												</div>
											)}
										</>
									)}
								</div>
							</div>

							<div className="mt-10 pt-8 border-t border-primary/10 relative">
								<div className="absolute top-0 left-0 w-24 h-px bg-linear-to-r from-primary/40 to-transparent -translate-y-px" />
								<textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Add a more detailed description..."
									className="w-full min-h-37.5 text-[15px] leading-relaxed bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-foreground/90 placeholder:text-muted-foreground/40"
								/>
							</div>

							<div className="mt-8 pt-8 border-t border-border">
								<div className="flex items-center gap-4 mb-6 border-b border-border">
									<button
										type="button"
										className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "comments" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
										onClick={() => setActiveTab("comments")}
									>
										Comments
									</button>
									<button
										type="button"
										className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === "activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
										onClick={() => setActiveTab("activity")}
									>
										Activity Log
									</button>
								</div>

								{activeTab === "comments" && (
									<div>
										<div className="space-y-4 mb-6">
											{isCommentsLoading ? (
												<p className="text-sm text-muted-foreground">
													Loading comments...
												</p>
											) : comments.length === 0 ? (
												<p className="text-sm text-muted-foreground">
													No comments yet.
												</p>
											) : (
												comments.map((comment) => (
													<div
														key={comment.id}
														className="bg-muted/30 rounded-lg p-3 border border-border group relative"
													>
														<div className="flex items-center justify-between mb-1">
															<span className="text-sm font-medium text-foreground">
																{comment.author?.name ||
																	comment.author?.email ||
																	"Unknown User"}
															</span>
															<span
																className="text-xs text-muted-foreground"
																suppressHydrationWarning
															>
																{comment.createdAt
																	? new Date(
																			comment.createdAt,
																		).toLocaleDateString()
																	: "Unknown date"}
															</span>
														</div>
														<p className="text-sm text-foreground/90 whitespace-pre-wrap">
															{comment.content}
														</p>
														<button
															type="button"
															onClick={() => handleDeleteComment(comment.id)}
															className="absolute top-2 right-2 p-1.5 bg-background rounded-md text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
															title="Delete comment"
														>
															<Trash2 size={14} />
														</button>
													</div>
												))
											)}
										</div>

										<div className="flex flex-col gap-2">
											<textarea
												value={newComment}
												onChange={(e) => setNewComment(e.target.value)}
												placeholder="Write a comment..."
												className="w-full min-h-20p-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
											/>
											<div className="flex justify-end">
												<button
													type="button"
													onClick={handleAddComment}
													disabled={!newComment.trim()}
													className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
												>
													Comment
												</button>
											</div>
										</div>
									</div>
								)}

								{activeTab === "activity" && (
									<div className="space-y-4">
										{isActivityLoading ? (
											<p className="text-sm text-muted-foreground">
												Loading history...
											</p>
										) : activities.length === 0 ? (
											<p className="text-sm text-muted-foreground">
												No activity recorded yet.
											</p>
										) : (
											activities.map((activity) => (
												<div
													key={activity.id}
													className="flex items-start gap-3 text-sm"
												>
													<div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
														<span className="text-[9px] font-bold text-primary">
															{(
																activity.user?.name ||
																activity.user?.email ||
																"U"
															)
																.substring(0, 2)
																.toUpperCase()}
														</span>
													</div>
													<div>
														<p className="text-foreground/90">
															<span className="font-medium text-foreground mr-1">
																{activity.user?.name ||
																	activity.user?.email ||
																	"Unknown User"}
															</span>
															{formatActivityMessage(activity)}
														</p>
														<p
															className="text-xs text-muted-foreground mt-0.5"
															suppressHydrationWarning
														>
															{activity.createdAt &&
																new Date(activity.createdAt).toLocaleString(
																	undefined,
																	{
																		month: "short",
																		day: "numeric",
																		hour: "numeric",
																		minute: "2-digit",
																	},
																)}
														</p>
													</div>
												</div>
											))
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
