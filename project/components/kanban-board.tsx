"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCollaboration } from "@/hooks/use-collaboration";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
	type List,
	type Member,
	type Task,
	useTasksStore,
} from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";
import { KanbanColumn } from "./kanban-column";
import { MobileKanbanBoard } from "./mobile-kanban-board";
import { TaskCard } from "./task-card";
import { TaskDetailPanel } from "./task-detail-panel";

interface KanbanBoardProps {
	projectId: string;
	members?: Member[];
}

export function KanbanBoard({ projectId, members }: KanbanBoardProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const searchParams = useSearchParams();
	const taskId = searchParams.get("taskId");

	const { setMembers, applyRealtimeEvent, fetchBoard } = useTasksStore();
	useEffect(() => {
		if (members) setMembers(members);
	}, [members, setMembers]);

	const { useEvent } = useCollaboration(projectId);

	useEvent("task.created", applyRealtimeEvent);
	useEvent("task.updated", applyRealtimeEvent);
	useEvent("task.deleted", applyRealtimeEvent);
	useEvent("task.moved", applyRealtimeEvent);
	useEvent("task.reordered", applyRealtimeEvent);
	useEvent("list.created", applyRealtimeEvent);
	useEvent("list.updated", applyRealtimeEvent);
	useEvent("list.deleted", applyRealtimeEvent);
	useEvent("list.reordered", applyRealtimeEvent);

	useEvent("task.assigned", () => fetchBoard(projectId));
	useEvent("task.unassigned", () => fetchBoard(projectId));
	useEvent("member.added", () => fetchBoard(projectId));
	useEvent("member.removed", () => fetchBoard(projectId));
	useEvent("member.updated", () => fetchBoard(projectId));

	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	if (!mounted)
		return (
			<div className="h-[calc(100vh-140px)] animate-pulse bg-muted/20 rounded-2xl" />
		);

	return (
		<>
			{isDesktop ? (
				<DesktopKanbanBoard projectId={projectId} />
			) : (
				<MobileKanbanBoard projectId={projectId} />
			)}
			<TaskDetailPanel
				key={taskId ?? "empty"}
				taskId={taskId}
				projectId={projectId}
			/>
		</>
	);
}

function DesktopKanbanBoard({ projectId }: KanbanBoardProps) {
	const {
		lists,
		fetchBoard,
		moveTask,
		moveList,
		addList,
		generateDefaultLists,
		isLoading,
		error,
		isSyncing,
	} = useTasksStore();
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [activeColumn, setActiveColumn] = useState<List | null>(null);

	const [isAddingList, setIsAddingList] = useState(false);
	const [newListTitle, setNewListTitle] = useState("");
	const addListInputRef = useRef<HTMLInputElement>(null);

	const {
		selectedTaskIds,
		clearSelection,
		deleteSelectedTasks,
		moveSelectedTasks,
	} = useTasksStore();
	const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
	const { openCreateTaskModal } = useUIStore();

	useEffect(() => {
		fetchBoard(projectId);
	}, [fetchBoard, projectId]);

	useEffect(() => {
		if (isAddingList) {
			addListInputRef.current?.focus();
		}
	}, [isAddingList]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				document.activeElement?.tagName === "INPUT" ||
				document.activeElement?.tagName === "TEXTAREA" ||
				document.activeElement?.tagName === "SELECT"
			) {
				return;
			}

			if (e.key === "Escape" && selectedTaskIds.length > 0) {
				clearSelection();
				setIsBulkMoveOpen(false);
			} else if (
				(e.key === "Delete" || e.key === "Backspace") &&
				selectedTaskIds.length > 0
			) {
				if (
					window.confirm(`Delete ${selectedTaskIds.length} selected task(s)?`)
				) {
					deleteSelectedTasks(projectId);
				}
			} else if (e.key.toLowerCase() === "n") {
				if (lists.length > 0) {
					e.preventDefault();
					openCreateTaskModal({ listId: lists[0].id, projectId });
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		selectedTaskIds,
		lists,
		projectId,
		clearSelection,
		deleteSelectedTasks,
		openCreateTaskModal,
	]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center p-8 h-full">
				<div className="animate-pulse flex gap-6 overflow-x-auto w-full h-150">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="w-75 bg-card border border-border/50 rounded-2xl shrink-0"
						/>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return <div className="p-8 text-center text-destructive">{error}</div>;
	}

	if (!lists.length) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center p-8 min-h-100">
				<div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
					<svg
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden="true"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<line x1="9" y1="3" x2="9" y2="21" />
					</svg>
				</div>
				<h3 className="text-xl font-bold text-foreground mb-2">
					Build your board
				</h3>
				<p className="text-muted-foreground text-center max-w-md mb-8">
					Start by generating our default agile columns, or create your own
					custom workflow from scratch.
				</p>
				<div className="flex gap-4">
					<button
						type="button"
						onClick={() => generateDefaultLists(projectId)}
						className="px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
					>
						Generate Default Agile Board
					</button>
					<button
						type="button"
						onClick={() => setIsAddingList(true)}
						className="px-5 py-2.5 bg-card text-foreground border border-border font-medium rounded-xl hover:bg-muted transition-all"
					>
						Start Empty
					</button>
				</div>
			</div>
		);
	}

	function handleDragStart(event: DragStartEvent) {
		const { active } = event;
		if (active.data.current?.type === "Task") {
			setActiveTask(active.data.current.task);
		} else if (active.data.current?.type === "Column") {
			setActiveColumn(active.data.current.list);
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveTask(null);
		setActiveColumn(null);

		if (!over) return;

		const activeId = active.id;
		const overId = over.id;

		if (activeId === overId) return;

		const isActiveTask = active.data.current?.type === "Task";
		const isActiveColumn = active.data.current?.type === "Column";

		const isOverTask = over.data.current?.type === "Task";
		const isOverColumn = over.data.current?.type === "Column";

		if (isActiveColumn && isOverColumn) {
			const activeIndex = lists.findIndex((l) => l.id === activeId);
			const normalizedOverId = (overId as string).startsWith("drop-")
				? (overId as string).slice(5)
				: (overId as string);
			const overIndex = lists.findIndex((l) => l.id === normalizedOverId);
			if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
				moveList(activeId as string, overIndex, projectId);
			}
			return;
		}

		if (isActiveTask) {
			const task = active.data.current?.task as Task;
			const sourceListId = task.listId;
			let destListId = "";
			let destIndex = 0;

			if (isOverTask) {
				const overTask = over.data.current?.task as Task;
				destListId = overTask.listId;
				const destListTasks =
					lists.find((l) => l.id === destListId)?.tasks || [];
				destIndex = destListTasks.findIndex((t) => t.id === overId);
			} else if (isOverColumn) {
				const overColumnList = over.data.current?.list as List;
				destListId = overColumnList.id;
				const destListTasks =
					lists.find((l) => l.id === destListId)?.tasks || [];
				destIndex = destListTasks.length;
			}

			if (destListId) {
				moveTask(task.id, sourceListId, destListId, destIndex, projectId);
			}
		}
	}

	const commitAddList = () => {
		const trimmed = newListTitle.trim();
		if (trimmed) {
			addList(trimmed, projectId);
		}
		setNewListTitle("");
		setIsAddingList(false);
	};

	return (
		<>
			{selectedTaskIds.length > 0 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
					<div className="flex items-center gap-2 px-2 border-r border-background/20 font-medium">
						<span className="bg-background text-foreground w-6 h-6 flex items-center justify-center rounded-full text-xs">
							{selectedTaskIds.length}
						</span>
						<span className="text-sm">selected</span>
					</div>

					<div className="flex items-center gap-2">
						<div className="relative">
							<button
								type="button"
								onClick={() => setIsBulkMoveOpen(!isBulkMoveOpen)}
								className="text-sm px-3 py-1.5 hover:bg-background/20 rounded-lg transition-colors flex items-center gap-2"
							>
								Move to...
							</button>
							{isBulkMoveOpen && (
								<div className="absolute bottom-full left-0 mb-2 w-48 bg-card text-foreground border border-border rounded-xl shadow-xl overflow-hidden py-1">
									{lists.map((list) => (
										<button
											type="button"
											key={list.id}
											onClick={() => {
												moveSelectedTasks(list.id, projectId);
												setIsBulkMoveOpen(false);
											}}
											className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
										>
											{list.name}
										</button>
									))}
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={() => {
								if (
									window.confirm(
										`Delete ${selectedTaskIds.length} selected task(s)?`,
									)
								) {
									deleteSelectedTasks(projectId);
								}
							}}
							className="text-sm px-3 py-1.5 hover:bg-destructive hover:text-destructive-foreground text-destructive/90 rounded-lg transition-colors"
						>
							Delete
						</button>

						<button
							type="button"
							onClick={() => {
								clearSelection();
								setIsBulkMoveOpen(false);
							}}
							className="text-sm p-1.5 hover:bg-background/20 rounded-lg transition-colors ml-2"
						>
							<X size={16} />
						</button>
					</div>
				</div>
			)}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div
					className={`flex h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)] lg:h-[calc(100vh-140px)] gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden pb-4 sm:pb-6 scrollbar-thin ${isSyncing ? "pointer-events-none opacity-80" : ""}`}
				>
					<SortableContext
						items={lists.map((l) => l.id)}
						strategy={rectSortingStrategy}
					>
						{lists.map((list) => (
							<KanbanColumn key={list.id} list={list} projectId={projectId} />
						))}
					</SortableContext>

					<div className="shrink-0 w-68.75 sm:w-75">
						{isAddingList ? (
							<div className="bg-card dark:bg-white/3 border border-border/60 rounded-2xl p-3 shadow-sm">
								<input
									ref={addListInputRef}
									type="text"
									placeholder="Enter list title..."
									value={newListTitle}
									onChange={(e) => setNewListTitle(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") commitAddList();
										if (e.key === "Escape") {
											setNewListTitle("");
											setIsAddingList(false);
										}
									}}
									className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
								/>
								<div className="flex items-center gap-2 mt-3">
									<button
										type="button"
										onClick={commitAddList}
										className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
									>
										Add List
									</button>
									<button
										type="button"
										onClick={() => {
											setNewListTitle("");
											setIsAddingList(false);
										}}
										className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors"
									>
										<X size={16} />
									</button>
								</div>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setIsAddingList(true)}
								className="flex items-center gap-2 w-full px-4 py-3.5 bg-card/50 hover:bg-card border-2 border-dashed border-border/60 hover:border-border text-muted-foreground hover:text-foreground rounded-2xl transition-all"
							>
								<Plus size={18} />
								<span className="font-medium text-sm">Add Status</span>
							</button>
						)}
					</div>
				</div>

				<DragOverlay>
					{activeColumn ? (
						<div className="rotate-2 scale-105 shadow-2xl opacity-90 cursor-grabbing pointer-events-none">
							<KanbanColumn
								list={activeColumn}
								projectId={projectId}
								isOverlay
							/>
						</div>
					) : activeTask ? (
						<div className="cursor-grabbing pointer-events-none">
							<TaskCard task={activeTask} isOverlay />
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</>
	);
}
