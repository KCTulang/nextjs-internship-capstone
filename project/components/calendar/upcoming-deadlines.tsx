"use client";

import { CheckCircle2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
	bulkDeleteTasksAction,
	bulkMarkCompleteAction,
	bulkUpdateTasksPriorityAction,
} from "@/app/actions/tasks";
import { useCalendarShortcuts } from "@/hooks/use-calendar-shortcuts";
import { useTasksStore } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";
import { priorityClass } from "@/utils";
import type { CalendarTask } from "./calendar-grid";

const DONE_LIST_NAMES = new Set([
	"done",
	"complete",
	"completed",
	"finished",
	"closed",
]);

function isCompletedList(listName?: string | null): boolean {
	return DONE_LIST_NAMES.has((listName ?? "").toLowerCase().trim());
}

function isOverdue(
	dueDate: Date | null | undefined,
	listName?: string | null,
): boolean {
	if (!dueDate) return false;
	if (isCompletedList(listName)) return false;
	const due = new Date(dueDate);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return due < today;
}

interface UpcomingDeadlinesProps {
	tasksWithDates: CalendarTask[];
}

export function UpcomingDeadlines({ tasksWithDates }: UpcomingDeadlinesProps) {
	const router = useRouter();
	const { selectedTaskIds, toggleTaskSelection, clearSelection } =
		useTasksStore();
	const { addToast, setLoading, openConfirmModal } = useUIStore();
	const [isPending, startTransition] = useTransition();
	const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
		null,
	);

	const taskIds = tasksWithDates.map((t) => t.id);

	const handleBulkDelete = () => {
		if (selectedTaskIds.length === 0) return;
		openConfirmModal({
			title: "Delete Tasks",
			description: `Are you sure you want to delete ${selectedTaskIds.length} tasks? This action cannot be undone.`,
			confirmText: "Delete",
			onConfirm: async () => {
				setLoading(true, "Deleting tasks...");
				const res = await bulkDeleteTasksAction(selectedTaskIds);
				setLoading(false);
				if (res.success) {
					addToast({
						type: "success",
						message: `Deleted ${selectedTaskIds.length} tasks`,
					});
					clearSelection();
				} else {
					addToast({
						type: "error",
						message: res.error || "Failed to delete tasks",
					});
				}
			},
		});
	};

	useCalendarShortcuts(taskIds, handleBulkDelete);

	const handleBulkComplete = async () => {
		if (selectedTaskIds.length === 0) return;
		startTransition(async () => {
			setLoading(true, "Marking tasks complete...");
			const res = await bulkMarkCompleteAction(selectedTaskIds);
			setLoading(false);
			if (res.success) {
				addToast({
					type: "success",
					message: `Marked ${selectedTaskIds.length} tasks as complete`,
				});
				clearSelection();
			} else {
				addToast({
					type: "error",
					message: res.error || "Failed to mark tasks complete",
				});
			}
		});
	};

	const handleBulkPriority = async (priority: string) => {
		if (selectedTaskIds.length === 0) return;
		startTransition(async () => {
			setLoading(true, "Updating priorities...");
			const res = await bulkUpdateTasksPriorityAction(
				selectedTaskIds,
				priority,
			);
			setLoading(false);
			if (res.success) {
				addToast({
					type: "success",
					message: `Updated priority for ${selectedTaskIds.length} tasks`,
				});
				clearSelection();
			} else {
				addToast({
					type: "error",
					message: res.error || "Failed to update priority",
				});
			}
		});
	};

	function handleTaskClick(task: CalendarTask, e: React.MouseEvent) {
		if ((e.target as HTMLElement).closest(".task-checkbox")) {
			return;
		}
		if (task.projectSlug) {
			router.push(`/projects/${task.projectSlug}?taskId=${task.id}`, {
				scroll: false,
			});
		}
	}

	function handleCheckboxClick(
		taskId: string,
		index: number,
		e: React.MouseEvent,
	) {
		e.stopPropagation();
		if (e.shiftKey && lastSelectedIndex !== null) {
			const start = Math.min(lastSelectedIndex, index);
			const end = Math.max(lastSelectedIndex, index);
			const rangeIds = tasksWithDates.slice(start, end + 1).map((t) => t.id);

			useTasksStore
				.getState()
				.setSelectedTaskIds(
					Array.from(new Set([...selectedTaskIds, ...rangeIds])),
				);
		} else {
			toggleTaskSelection(taskId);
			setLastSelectedIndex(index);
		}
	}

	if (tasksWithDates.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<p>No upcoming deadlines found.</p>
			</div>
		);
	}

	return (
		<div className="space-y-3 relative pb-16">
			{selectedTaskIds.length > 0 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 bg-card border border-border shadow-xl rounded-full animate-in slide-in-from-bottom-5">
					<div className="flex items-center gap-2 pr-4 border-r border-border">
						<span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
							{selectedTaskIds.length}
						</span>
						<span className="text-sm font-medium hidden sm:inline-block">
							Selected
						</span>
					</div>

					<button
						type="button"
						title="Mark Complete"
						onClick={handleBulkComplete}
						disabled={isPending}
						className="p-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-full transition-colors disabled:opacity-50"
					>
						<CheckCircle2 size={18} />
					</button>

					<select
						title="Change Priority"
						disabled={isPending}
						className="text-sm bg-transparent outline-none border-none text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
						onChange={(e) => {
							if (e.target.value) handleBulkPriority(e.target.value);
							e.target.value = "";
						}}
						value=""
					>
						<option value="" disabled>
							Set Priority...
						</option>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
						<option value="urgent">Urgent</option>
					</select>

					<button
						type="button"
						title="Delete Tasks"
						onClick={handleBulkDelete}
						disabled={isPending}
						className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors disabled:opacity-50"
					>
						<Trash2 size={18} />
					</button>

					<div className="w-px h-6 bg-border mx-1" />

					<button
						type="button"
						title="Clear Selection"
						onClick={clearSelection}
						className="p-2 text-muted-foreground hover:text-foreground rounded-full transition-colors"
					>
						<X size={18} />
					</button>
				</div>
			)}

			{tasksWithDates.map((task, index) => {
				const overdue = isOverdue(task.dueDate, task.listName);
				const hasLink = !!task.projectSlug;
				const isSelected = selectedTaskIds.includes(task.id);

				const rowContent = (
					<>
						<div className="min-w-0 flex-1">
							<h4
								className={`font-medium truncate ${
									overdue ? "text-destructive" : "text-foreground"
								}`}
							>
								{task.title}
							</h4>
							<div className="flex items-center flex-wrap gap-2 mt-1">
								{task.projectName && (
									<p className="text-sm text-muted-foreground">
										{task.projectName}
									</p>
								)}
								<span
									className={`text-[10px] uppercase font-bold border px-1.5 py-0.5 rounded ${priorityClass(task.priority)}`}
								>
									{(task.priority ?? "medium").toLowerCase()}
								</span>
								{task.labels?.slice(0, 3).map((label) => (
									<span
										key={label}
										className="text-[10px] font-medium text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded"
									>
										{label}
									</span>
								))}
								{task.labels && task.labels.length > 3 && (
									<span className="text-[10px] text-muted-foreground">
										+{task.labels.length - 3}
									</span>
								)}
							</div>
						</div>
					</>
				);

				const containerClasses = `relative flex items-start w-full p-4 rounded-lg border transition-all focus-within:ring-2 focus-within:ring-primary ${
					isSelected
						? "bg-primary/5 border-primary/20 shadow-sm"
						: "bg-muted/50 border-border hover:bg-muted/80"
				} ${!hasLink ? "opacity-60" : ""}`;

				return (
					<div
						key={task.id}
						data-task-id={task.id}
						className={containerClasses}
					>
						<button
							type="button"
							className="task-checkbox hidden sm:flex pt-1 cursor-pointer shrink-0 mt-0.5"
							onClick={(e) => handleCheckboxClick(task.id, index, e)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									handleCheckboxClick(
										task.id,
										index,
										e as unknown as React.MouseEvent,
									);
								}
							}}
							tabIndex={-1}
						>
							<div
								className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
									isSelected
										? "bg-primary border-primary text-primary-foreground"
										: "border-muted-foreground/30 hover:border-foreground/50"
								}`}
							>
								{isSelected && <CheckCircle2 size={12} className="stroke-3" />}
							</div>
						</button>

						{hasLink ? (
							<button
								type="button"
								onClick={(e) => handleTaskClick(task, e)}
								className="flex flex-1 items-start justify-between min-w-0 ml-3 text-left focus:outline-none"
							>
								{rowContent}
							</button>
						) : (
							<div
								className="flex flex-1 items-start justify-between min-w-0 ml-3 text-left"
								title="No linked project"
							>
								{rowContent}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
