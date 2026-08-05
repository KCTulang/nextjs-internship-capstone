"use client";

import {
	closestCorners,
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
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Check, Plus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { type List, type Task, useTasksStore } from "@/hooks/use-tasks";
import { KanbanColumn } from "./kanban-column";
import { MobileKanbanBoard } from "./mobile-kanban-board";
import { TaskCard } from "./task-card";
import { TaskDetailPanel } from "./task-detail-panel";

interface KanbanBoardProps {
	projectId: string;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
	// 768px is the 'md' breakpoint in Tailwind
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const searchParams = useSearchParams();
	const taskId = searchParams.get("taskId");

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
			{/* Task Detail Slide-over Panel */}
			<TaskDetailPanel key={taskId || "empty"} taskId={taskId} projectId={projectId} />
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
	} = useTasksStore();
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [activeColumn, setActiveColumn] = useState<List | null>(null);

	// Add list state
	const [isAddingList, setIsAddingList] = useState(false);
	const [newListTitle, setNewListTitle] = useState("");
	const addListInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetchBoard(projectId);
	}, [fetchBoard, projectId]);

	useEffect(() => {
		if (isAddingList) {
			addListInputRef.current?.focus();
		}
	}, [isAddingList]);

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
				<div className="animate-pulse flex gap-6 overflow-x-auto w-full h-[600px]">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="w-[300px] bg-card border border-border/50 rounded-2xl shrink-0"
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
			<div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[400px]">
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
			const overIndex = lists.findIndex((l) => l.id === overId);
			if (activeIndex !== overIndex) {
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

				// Adjust insertion index depending on direction
				const isBelowOverItem =
					over &&
					active.rect.current.translated &&
					active.rect.current.translated.top > over.rect.top + over.rect.height;

				const modifier = isBelowOverItem ? 1 : 0;
				destIndex =
					destIndex >= 0 ? destIndex + modifier : destListTasks.length + 1;
			} else if (isOverColumn) {
				destListId = overId as string;
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
		<DndContext
			sensors={sensors}
			collisionDetection={closestCorners}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="flex h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)] lg:h-[calc(100vh-140px)] gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden pb-4 sm:pb-6 scrollbar-thin">
				<SortableContext
					items={lists.map((l) => l.id)}
					strategy={horizontalListSortingStrategy}
				>
					{lists.map((list) => (
						<KanbanColumn key={list.id} list={list} projectId={projectId} />
					))}
				</SortableContext>

				{/* Add Column Button */}
				<div className="shrink-0 w-[275px] sm:w-[300px]">
					{isAddingList ? (
						<div className="bg-card dark:bg-white/[0.03] border border-border/60 rounded-2xl p-3 shadow-sm">
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
						<KanbanColumn list={activeColumn} projectId={projectId} isOverlay />
					</div>
				) : activeTask ? (
					<div className="rotate-3 scale-105 shadow-2xl cursor-grabbing pointer-events-none">
						<TaskCard task={activeTask} isOverlay />
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
