"use client";

import { CalendarDays, CheckCircle2, Circle, Trash2, X } from "lucide-react";
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
import {
	formatDateOnly,
	formatDateOnlyDeadlineLabel,
	isDateOnlyOverdue,
} from "@/utils/date-only";
import type { CalendarTask } from "./calendar-grid";

function isOverdue(
	dueDate: string | null | undefined,
	isCompleted: boolean,
): boolean {
	if (!dueDate) return false;
	if (isCompleted) return false;
	return isDateOnlyOverdue(dueDate);
}

interface UpcomingDeadlinesProps {
	tasksWithDates: CalendarTask[];
}

export function UpcomingDeadlines({ tasksWithDates }: UpcomingDeadlinesProps) {
	const {
		selectedTaskIds,
		toggleTaskSelection,
		clearSelection,
		reconcileTasks,
	} = useTasksStore();
	const { addToast, setLoading, openConfirmModal, openPreviewTaskModal } =
		useUIStore();
	const [isPending, startTransition] = useTransition();
	const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
		null,
	);

	const taskIds = tasksWithDates
		.filter((task) => task.canMutateTasks !== false)
		.map((task) => task.id);

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
				reconcileTasks(res.data);
				addToast({
					type: "success",
					message:
						res.movedTaskIds.length === 0
							? "Selected tasks were already complete"
							: `Marked ${res.movedTaskIds.length} task${res.movedTaskIds.length === 1 ? "" : "s"} as complete`,
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

	function handleTaskClick(task: CalendarTask) {
		openPreviewTaskModal(task);
	}

	function handleCheckboxClick(
		taskId: string,
		index: number,
		shiftKey: boolean,
	) {
		if (shiftKey && lastSelectedIndex !== null) {
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
			<div className="flex flex-col items-center py-8 text-center">
				<div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
					<CalendarDays size={18} aria-hidden="true" />
				</div>
				<p className="text-sm font-semibold text-foreground">
					No deadlines yet
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Tasks with due dates will appear here.
				</p>
			</div>
		);
	}

	return (
		<div
			className={`relative w-full min-w-0 space-y-1 ${selectedTaskIds.length > 0 ? "pb-16" : ""}`}
		>
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
				if (!task.dueDate) return null;
				const overdue = isOverdue(task.dueDate, task.listIsCompleted);
				const hasLink = !!task.projectSlug;
				const isSelected = selectedTaskIds.includes(task.id);
				const showDateHeading =
					index === 0 || tasksWithDates[index - 1]?.dueDate !== task.dueDate;

				const rowContent = (
					<>
						<div className="min-w-0 flex-1 py-0.5">
							<h4
								className={`truncate text-sm font-medium ${
									overdue ? "text-destructive" : "text-foreground"
								} ${task.listIsCompleted ? "line-through opacity-60" : ""}`}
							>
								{task.title}
							</h4>
							<div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
								{task.projectName && (
									<p className="truncate">{task.projectName}</p>
								)}
								{task.listName && (
									<>
										<span aria-hidden="true">·</span>
										<span className="truncate">{task.listName}</span>
									</>
								)}
							</div>
						</div>
						<span
							className={`hidden shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide min-[430px]:inline-flex ${priorityClass(task.priority)}`}
						>
							{task.priority ?? "medium"}
						</span>
						<span
							className={`hidden w-18 shrink-0 text-right text-xs font-medium sm:block ${overdue ? "text-destructive" : "text-muted-foreground"}`}
						>
							{formatDateOnly(task.dueDate, { month: "short", day: "numeric" })}
						</span>
					</>
				);

				const containerClasses = `relative flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 transition-all focus-within:ring-2 focus-within:ring-primary ${
					isSelected
						? "bg-primary/5 border-primary/20 shadow-sm"
						: "bg-card border-transparent hover:border-border hover:bg-muted/50"
				} ${!hasLink ? "opacity-60" : ""}`;

				return (
					<div key={task.id}>
						{showDateHeading && (
							<div
								className={`px-3 pb-1.5 text-xs font-semibold text-muted-foreground ${index === 0 ? "pt-0" : "pt-3"}`}
							>
								{overdue && "Overdue · "}
								{formatDateOnlyDeadlineLabel(task.dueDate)}
							</div>
						)}
						<div data-task-id={task.id} className={containerClasses}>
							{task.canMutateTasks !== false && (
								<button
									type="button"
									className="task-checkbox flex shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
									onClick={(e) => {
										e.stopPropagation();
										handleCheckboxClick(task.id, index, e.shiftKey);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											handleCheckboxClick(task.id, index, e.shiftKey);
										}
									}}
									aria-label={isSelected ? "Deselect task" : "Select task"}
								>
									{isSelected || task.listIsCompleted ? (
										<CheckCircle2
											size={17}
											className={
												isSelected ? "text-primary" : "text-emerald-500"
											}
										/>
									) : (
										<Circle size={17} />
									)}
								</button>
							)}

							{hasLink ? (
								<button
									type="button"
									onClick={() => handleTaskClick(task)}
									className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none"
								>
									{rowContent}
								</button>
							) : (
								<div
									className="flex min-w-0 flex-1 items-center gap-3 text-left"
									title="No linked project"
								>
									{rowContent}
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
