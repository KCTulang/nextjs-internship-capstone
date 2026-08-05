"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Circle, Flag, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type Task, useTasksStore } from "@/hooks/use-tasks";

interface TaskDetailPanelProps {
	taskId: string | null;
	projectId: string;
}

export function TaskDetailPanel({ taskId, projectId }: TaskDetailPanelProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { lists, updateTaskDetails, deleteTask } = useTasksStore();
	const isDesktop = useMediaQuery("(min-width: 768px)");

	// Find the task
	const task = taskId
		? lists.flatMap((l) => l.tasks).find((t) => t.id === taskId)
		: null;

	const [title, setTitle] = useState(task?.title || "");
	const [description, setDescription] = useState(task?.description || "");
	const titleRef = useRef<HTMLTextAreaElement>(null);

	const taskRef = useRef(task);
	taskRef.current = task;
	const updateTaskDetailsRef = useRef(updateTaskDetails);
	updateTaskDetailsRef.current = updateTaskDetails;
	const projectIdRef = useRef(projectId);
	projectIdRef.current = projectId;

	// Reset local state when task changes
	useEffect(() => {
		const currentTask = taskRef.current;
		if (currentTask) {
			setTitle(currentTask.title);
			setDescription(currentTask.description || "");
			// Auto resize title
			setTimeout(() => {
				if (titleRef.current) {
					titleRef.current.style.height = "auto";
					titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
				}
			}, 0);
		}
	}, []);

	// Auto-save logic
	useEffect(() => {
		if (!taskId) return;

		const handler = setTimeout(() => {
			const currentTask = taskRef.current;
			if (!currentTask) return;
			const updates: Partial<Task> = {};
			if (title !== currentTask.title) updates.title = title;
			if (description !== (currentTask.description || ""))
				updates.description = description;

			if (Object.keys(updates).length > 0) {
				updateTaskDetailsRef.current(currentTask.id, updates, projectIdRef.current);
			}
		}, 500);

		return () => clearTimeout(handler);
	}, [title, description, taskId]);

	const handleClose = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("taskId");
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	}, [router, pathname, searchParams]);

	// Escape key to close
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
	};

	const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (!task) return;
		updateTaskDetails(task.id, { priority: e.target.value }, projectId);
	};

	const handleDelete = async () => {
		if (!task) return;
		if (window.confirm("Are you sure you want to delete this task?")) {
			handleClose();
			await deleteTask(task.id, projectId);
		}
	};

	const priorities = ["low", "medium", "high", "urgent"];

	return (
		<AnimatePresence>
			{taskId && task && (
				<>
					{/* Backdrop - Solid/dim instead of blur */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={handleClose}
						className="fixed inset-0 z-50 bg-background/80"
					/>

					{/* Panel */}
					<motion.div
						initial={isDesktop ? { x: "100%" } : { y: "100%" }}
						animate={isDesktop ? { x: 0 } : { y: 0 }}
						exit={isDesktop ? { x: "100%" } : { y: "100%" }}
						transition={{ type: "spring", damping: 30, stiffness: 300 }}
						className={`fixed z-50 bg-background shadow-2xl overflow-y-auto ${
							isDesktop
								? "top-0 right-0 bottom-0 w-[600px] border-l border-border"
								: "bottom-0 left-0 right-0 h-[90vh] rounded-t-[24px] border-t border-border"
						}`}
						role="dialog"
						aria-modal="true"
					>
						{/* Ambient Glows */}
						<div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-[glow-drift_8s_ease-in-out_infinite] pointer-events-none" />
						<div className="absolute bottom-1/2 left-0 w-56 h-56 bg-primary/5 rounded-full blur-2xl animate-[glow-pulse_4s_ease-in-out_infinite] pointer-events-none" />

						{/* Mobile drag handle */}
						{!isDesktop && (
							<div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border rounded-full z-20" />
						)}

						<div className="flex flex-col min-h-full pb-20 relative z-10">
							{/* Header */}
							<div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-primary/10 mt-4 md:mt-0">
								<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
									<Circle size={12} className="fill-current opacity-70" />
									<span>{lists.find((l) => l.id === task.listId)?.name}</span>
								</div>
								<div className="flex items-center gap-1">
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

							{/* Content */}
							<div className="flex-1 px-6 py-8">
								{/* Title */}
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
										target.style.height = target.scrollHeight + "px";
									}}
								/>

								{/* Properties Grid - Styled as LockIn rounded cards */}
								<div className="mt-8 space-y-3 max-w-md">
									{/* Status */}
									<div className="flex items-center gap-4 group bg-card border border-border hover:border-primary/50 transition-all rounded-xl px-4 py-2.5 relative overflow-hidden">
										<div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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

									{/* Priority */}
									<div className="flex items-center gap-4 group bg-card border border-border hover:border-primary/50 transition-all rounded-xl px-4 py-2.5 relative overflow-hidden">
										<div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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

									{/* Due Date */}
									<div className="flex items-center gap-4 group bg-card border border-border hover:border-primary/50 transition-all rounded-xl px-4 py-2.5 relative overflow-hidden">
										<div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
												updateTaskDetails(
													task.id,
													{ dueDate: date },
													projectId,
												);
											}}
											className="flex-1 bg-transparent text-sm font-medium text-foreground focus:outline-none transition-colors dark:[color-scheme:dark] relative z-10"
										/>
									</div>
								</div>

								{/* Description Area */}
								<div className="mt-10 pt-8 border-t border-primary/10 relative">
									<div className="absolute top-0 left-0 w-24 h-[1px] bg-gradient-to-r from-primary/40 to-transparent -translate-y-[1px]" />
									<textarea
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder="Add a more detailed description..."
										className="w-full min-h-[400px] text-[15px] leading-relaxed bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-foreground/90 placeholder:text-muted-foreground/40"
									/>
								</div>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
