"use client";

import {
	closestCenter,
	DndContext,
	type DragCancelEvent,
	type DragEndEvent,
	type DragMoveEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	MeasuringStrategy,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type List, type Task, useTasksStore } from "@/stores/board-store";
import { KanbanColumn } from "./kanban-column";
import { ManageColumnsSheet } from "./modals/manage-columns-sheet";
import { StatusPickerSheet } from "./modals/status-picker-sheet";
import { KanbanBoardSkeleton } from "./skeletons/kanban-board-skeleton";
import { TaskCard } from "./task-card";

interface MobileKanbanBoardProps {
	projectId: string;
	projectName: string;
	canManageColumns?: boolean;
	canMutateTasks?: boolean;
}

const edgeThreshold = 40;
const edgeHoverDelay = 600;
const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) =>
	Math.abs(offset) * velocity;

export function MobileKanbanBoard({
	projectId,
	projectName,
	canManageColumns = false,
	canMutateTasks = true,
}: MobileKanbanBoardProps) {
	const { lists, fetchBoard, isLoading, error, moveTask } = useTasksStore();
	const [activeListIndex, setActiveListIndex] = useState(0);
	const [tuple, setTuple] = useState([0, 0]);
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [isTaskDragging, setIsTaskDragging] = useState(false);

	const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
	const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
	const [taskToMove, setTaskToMove] = useState<Task | null>(null);

	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const activeListIndexRef = useRef(0);
	const dragTaskRef = useRef<Task | null>(null);
	const dragSourceListIdRef = useRef<string | null>(null);
	const edgeHoverRef = useRef<"left" | "right" | null>(null);
	const pagedEdgeRef = useRef<"left" | "right" | null>(null);
	const edgeHoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	useEffect(() => {
		const activeTab = tabRefs.current[activeListIndex];
		if (activeTab) {
			const prefersReducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			activeTab.scrollIntoView({
				behavior: prefersReducedMotion ? "auto" : "smooth",
				block: "nearest",
				inline: "center",
			});
		}
	}, [activeListIndex]);

	useEffect(() => {
		fetchBoard(projectId);
	}, [fetchBoard, projectId]);

	useEffect(() => {
		activeListIndexRef.current = activeListIndex;
	}, [activeListIndex]);

	useEffect(
		() => () => {
			if (edgeHoverTimeoutRef.current) {
				clearTimeout(edgeHoverTimeoutRef.current);
			}
			edgeHoverTimeoutRef.current = null;
			edgeHoverRef.current = null;
			pagedEdgeRef.current = null;
			dragTaskRef.current = null;
			dragSourceListIdRef.current = null;
		},
		[],
	);

	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint: { delay: 300, tolerance: 6 },
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 300,
				tolerance: 6,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	if (isLoading && lists.length === 0) {
		return <KanbanBoardSkeleton />;
	}

	if (error) {
		return (
			<div className="flex min-h-100 flex-1 flex-col items-center justify-center px-6 text-center">
				<p className="text-sm font-medium text-destructive">{error}</p>
				<button
					type="button"
					onClick={() => void fetchBoard(projectId)}
					className="mt-3 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Try again
				</button>
			</div>
		);
	}

	if (!lists.length) return null;
	const activeList = lists[activeListIndex] || lists[0];
	const [page, direction] = tuple;

	const paginate = (newDirection: number) => {
		const currentIndex = activeListIndexRef.current;
		const newIndex = currentIndex + newDirection;
		if (newIndex < 0 || newIndex >= lists.length) return false;

		activeListIndexRef.current = newIndex;
		setActiveListIndex(newIndex);
		setTuple(([currentPage]) => [currentPage + newDirection, newDirection]);
		return true;
	};

	const variants = {
		enter: (direction: number) => ({
			x: direction > 0 ? "100%" : "-100%",
			opacity: 0,
		}),
		center: {
			zIndex: 1,
			x: 0,
			opacity: 1,
		},
		exit: (direction: number) => ({
			zIndex: 0,
			x: direction < 0 ? "100%" : "-100%",
			opacity: 0,
		}),
	};

	function handleDragStart(event: DragStartEvent) {
		if (!canMutateTasks) return;
		const { active } = event;
		if (active.data.current?.type === "Task") {
			const task = active.data.current.task as Task;
			dragTaskRef.current = task;
			dragSourceListIdRef.current = task.listId;
			setActiveTask(task);
			setIsTaskDragging(true);
		}
	}

	function clearEdgeHover() {
		if (edgeHoverTimeoutRef.current) {
			clearTimeout(edgeHoverTimeoutRef.current);
		}
		edgeHoverTimeoutRef.current = null;
		edgeHoverRef.current = null;
		pagedEdgeRef.current = null;
	}

	function clearDragState() {
		clearEdgeHover();
		dragTaskRef.current = null;
		dragSourceListIdRef.current = null;
		setActiveTask(null);
		setIsTaskDragging(false);
	}

	function handleDragMove(event: DragMoveEvent) {
		if (!canMutateTasks) return;
		if (!dragTaskRef.current) return;
		const rect = event.active.rect.current.translated;
		if (!rect) return;

		const nextEdge =
			rect.left < edgeThreshold
				? "left"
				: rect.right > window.innerWidth - edgeThreshold
					? "right"
					: null;

		if (nextEdge !== edgeHoverRef.current) {
			if (edgeHoverTimeoutRef.current) {
				clearTimeout(edgeHoverTimeoutRef.current);
				edgeHoverTimeoutRef.current = null;
			}
			edgeHoverRef.current = nextEdge;
			pagedEdgeRef.current = null;
		}

		if (!nextEdge || pagedEdgeRef.current === nextEdge) return;
		if (edgeHoverTimeoutRef.current) return;

		const direction = nextEdge === "left" ? -1 : 1;
		const destinationIndex = activeListIndexRef.current + direction;
		if (destinationIndex < 0 || destinationIndex >= lists.length) return;

		edgeHoverTimeoutRef.current = setTimeout(() => {
			edgeHoverTimeoutRef.current = null;
			if (edgeHoverRef.current !== nextEdge) return;
			if (paginate(direction)) pagedEdgeRef.current = nextEdge;
		}, edgeHoverDelay);
	}

	function handleDragEnd(event: DragEndEvent) {
		if (!canMutateTasks) return;
		const { active, over } = event;
		const task = dragTaskRef.current;
		const sourceListId = dragSourceListIdRef.current;

		try {
			if (!over || active.id === over.id || !sourceListId || !task) return;
			let destListId: string | null = null;
			let destIndex: number | null = null;

			if (over.data.current?.type === "Task") {
				const overTask = over.data.current.task as Task;
				destListId = overTask.listId;
				const destinationTasks =
					lists.find((list) => list.id === destListId)?.tasks ?? [];
				destIndex = destinationTasks.findIndex((item) => item.id === over.id);
			} else if (over.data.current?.type === "Column") {
				const overColumn = over.data.current.list as List;
				destListId = overColumn.id;
				destIndex = overColumn.tasks.length;
			}

			if (!destListId || destIndex === null || destIndex < 0) return;
			if (!lists.some((list) => list.id === destListId)) return;

			void moveTask(task.id, sourceListId, destListId, destIndex, projectId);
		} finally {
			clearDragState();
		}
	}

	function handleDragCancel(_event: DragCancelEvent) {
		clearDragState();
	}

	return (
		<div className="flex h-[calc(100vh-140px)] w-full min-w-0 max-w-full flex-col overflow-hidden bg-background">
			<div className="sticky top-0 z-10 flex w-full min-w-0 flex-col border-b border-border bg-card shadow-sm">
				<div className="relative flex w-full min-w-0 items-center">
					<div className="absolute left-0 top-0 bottom-0 w-6 bg-linear-to-r from-card to-transparent pointer-events-none z-10" />

					<div className="scrollbar-none flex w-full min-w-0 max-w-full items-center space-x-2 overflow-x-auto px-4 py-2 snap-x scroll-smooth">
						{lists.map((list, idx) => {
							const isActive = idx === activeListIndex;
							return (
								<button
									key={list.id}
									ref={(el) => {
										tabRefs.current[idx] = el;
									}}
									type="button"
									disabled={isTaskDragging}
									onClick={() => {
										if (idx !== activeListIndex) {
											setTuple([
												page + (idx > activeListIndex ? 1 : -1),
												idx > activeListIndex ? 1 : -1,
											]);
											setActiveListIndex(idx);
										}
									}}
									className={`min-h-11 shrink-0 snap-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
										isActive
											? "bg-primary text-primary-foreground shadow-sm"
											: "text-muted-foreground hover:bg-muted hover:text-foreground"
									}`}
								>
									{list.name}{" "}
									<span className="opacity-60 ml-1 text-xs">
										({list.tasks?.length || 0})
									</span>
								</button>
							);
						})}
					</div>

					<div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-card to-transparent pointer-events-none z-10" />
				</div>

				{canManageColumns && (
					<div className="z-10 border-t border-border/50 bg-card p-2">
						<button
							type="button"
							onClick={() => setIsManageColumnsOpen(true)}
							className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label="Add column"
							title="Add column"
						>
							<Plus size={16} className="shrink-0" />
							<span>Add column</span>
						</button>
					</div>
				)}
			</div>

			<div className="relative min-w-0 flex-1 overflow-hidden bg-background">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					measuring={{
						droppable: { strategy: MeasuringStrategy.Always },
					}}
					onDragStart={handleDragStart}
					onDragMove={handleDragMove}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}
				>
					<AnimatePresence
						initial={false}
						custom={direction}
						mode={isTaskDragging ? "sync" : "popLayout"}
					>
						<motion.div
							key={activeListIndex}
							custom={direction}
							variants={variants}
							initial={isTaskDragging ? false : "enter"}
							animate="center"
							exit={isTaskDragging ? undefined : "exit"}
							transition={
								isTaskDragging
									? { duration: 0 }
									: {
											x: { type: "spring", stiffness: 300, damping: 30 },
											opacity: { duration: 0.2 },
										}
							}
							drag={isTaskDragging ? false : "x"}
							dragConstraints={{ left: 0, right: 0 }}
							dragElastic={1}
							onDragEnd={(_event, { offset, velocity }) => {
								if (isTaskDragging) return;
								const swipe = swipePower(offset.x, velocity.x);
								if (swipe < -swipeConfidenceThreshold) paginate(1);
								if (swipe > swipeConfidenceThreshold) paginate(-1);
							}}
							className="absolute inset-0 flex min-w-0 flex-col pt-3"
						>
							<div className="w-full min-w-0 max-w-full flex-1 overflow-y-auto px-3 pb-20 sm:px-4">
								<KanbanColumn
									list={activeList}
									projectId={projectId}
									projectName={projectName}
									canManageColumns={canManageColumns}
									canMutateTasks={canMutateTasks}
									isMobileView={true}
									onMoveTaskClick={(task) => {
										setTaskToMove(task);
										setIsStatusPickerOpen(true);
									}}
								/>
							</div>
						</motion.div>
					</AnimatePresence>

					<DragOverlay>
						{activeTask ? (
							<div className="opacity-90 cursor-grabbing pointer-events-none">
								<TaskCard
									task={activeTask}
									isMobileView={true}
									canMutateTasks={canMutateTasks}
									isOverlay={true}
								/>
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			</div>

			{canMutateTasks && taskToMove && (
				<StatusPickerSheet
					isOpen={isStatusPickerOpen}
					setIsOpen={setIsStatusPickerOpen}
					taskTitle={taskToMove.title}
					currentListId={taskToMove.listId}
					lists={lists}
					onSelect={(destListId) => {
						const destListTasks =
							lists.find((l) => l.id === destListId)?.tasks || [];
						moveTask(
							taskToMove.id,
							taskToMove.listId,
							destListId,
							destListTasks.length,
							projectId,
						);

						const destIndex = lists.findIndex((l) => l.id === destListId);
						if (destIndex >= 0 && destIndex !== activeListIndex) {
							setTuple([
								page + (destIndex > activeListIndex ? 1 : -1),
								destIndex > activeListIndex ? 1 : -1,
							]);
							setActiveListIndex(destIndex);
						}
					}}
				/>
			)}

			{canManageColumns && (
				<ManageColumnsSheet
					isOpen={isManageColumnsOpen}
					setIsOpen={setIsManageColumnsOpen}
					projectId={projectId}
				/>
			)}
		</div>
	);
}
