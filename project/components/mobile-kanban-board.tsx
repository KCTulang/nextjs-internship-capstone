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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutList, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Task, useTasksStore } from "@/hooks/use-tasks";
import { KanbanColumn } from "./kanban-column";
import { ManageColumnsSheet } from "./modals/manage-columns-sheet";
import { StatusPickerSheet } from "./modals/status-picker-sheet";
import { TaskCard } from "./task-card";

interface MobileKanbanBoardProps {
	projectId: string;
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
	return Math.abs(offset) * velocity;
};

export function MobileKanbanBoard({ projectId }: MobileKanbanBoardProps) {
	const { lists, fetchBoard, isLoading, error, moveTask } = useTasksStore();
	const [activeListIndex, setActiveListIndex] = useState(0);
	const [tuple, setTuple] = useState([0, 0]); // [page, direction]
	const [activeTask, setActiveTask] = useState<Task | null>(null);

	// Sheets state
	const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
	const [isManageColumnsOpen, setIsManageColumnsOpen] = useState(false);
	const [taskToMove, setTaskToMove] = useState<Task | null>(null);

	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

	// Auto-scroll active tab into view
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

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
				delay: 250, // Long press to drag on mobile to avoid swipe conflict
				tolerance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center p-8 h-[calc(100vh-140px)]">
				<div className="animate-pulse w-full max-w-sm h-full bg-card border border-border/50 rounded-2xl" />
			</div>
		);
	}

	if (error || !lists.length) return null; // Desktop view handles empty state and errors

	const activeList = lists[activeListIndex] || lists[0];
	const [page, direction] = tuple;

	const paginate = (newDirection: number) => {
		const newIndex = activeListIndex + newDirection;
		if (newIndex >= 0 && newIndex < lists.length) {
			setActiveListIndex(newIndex);
			setTuple([page + newDirection, newDirection]);
		}
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
		const { active } = event;
		if (active.data.current?.type === "Task") {
			setActiveTask(active.data.current.task);
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveTask(null);

		if (!over) return;
		if (active.id === over.id) return;

		const isActiveTask = active.data.current?.type === "Task";
		const isOverTask = over.data.current?.type === "Task";
		const isOverColumn = over.data.current?.type === "Column";

		if (isActiveTask) {
			const task = active.data.current?.task as Task;
			const sourceListId = task.listId;
			let destListId = sourceListId; // Mobile drag is only within same column
			let destIndex = 0;

			if (isOverTask) {
				const overTask = over.data.current?.task as Task;
				destListId = overTask.listId;
				const destListTasks =
					lists.find((l) => l.id === destListId)?.tasks || [];
				destIndex = destListTasks.findIndex((t) => t.id === over.id);

				const isBelowOverItem =
					over &&
					active.rect.current.translated &&
					active.rect.current.translated.top > over.rect.top + over.rect.height;

				const modifier = isBelowOverItem ? 1 : 0;
				destIndex =
					destIndex >= 0 ? destIndex + modifier : destListTasks.length + 1;
			} else if (isOverColumn) {
				destListId = over.id as string;
				const destListTasks =
					lists.find((l) => l.id === destListId)?.tasks || [];
				destIndex = destListTasks.length;
			}

			if (destListId === activeList.id) {
				moveTask(task.id, sourceListId, destListId, destIndex, projectId);
			}
		}
	}

	return (
		<div className="flex flex-col h-[calc(100vh-140px)] w-full overflow-hidden bg-background">
			{/* Tab Bar Container */}
			<div className="flex items-center justify-between border-b border-border bg-card sticky top-0 z-10 shadow-sm relative">
				{/* Left Edge Fade */}
				<div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />

				<div className="flex-1 overflow-x-auto scrollbar-none flex items-center space-x-2 py-2 px-4 snap-x relative scroll-smooth">
					{lists.map((list, idx) => {
						const isActive = idx === activeListIndex;
						return (
							<button
								key={list.id}
								ref={(el) => {
									tabRefs.current[idx] = el;
								}}
								type="button"
								onClick={() => {
									if (idx !== activeListIndex) {
										setTuple([
											page + (idx > activeListIndex ? 1 : -1),
											idx > activeListIndex ? 1 : -1,
										]);
										setActiveListIndex(idx);
									}
								}}
								className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all snap-center shrink-0 ${
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

				{/* Right Edge Fade */}
				<div className="absolute right-10 top-0 bottom-0 w-10 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />

				<div className="px-2 border-l border-border/50 bg-card z-10 shrink-0 flex items-center justify-center">
					<button
						type="button"
						onClick={() => setIsManageColumnsOpen(true)}
						className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
						title="Manage Columns"
					>
						<LayoutList size={18} />
					</button>
				</div>
			</div>

			{/* Swipeable Single Column */}
			<div className="flex-1 relative overflow-hidden bg-background">
				<DndContext
					sensors={sensors}
					collisionDetection={closestCorners}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<AnimatePresence initial={false} custom={direction} mode="popLayout">
						<motion.div
							key={activeListIndex}
							custom={direction}
							variants={variants}
							initial="enter"
							animate="center"
							exit="exit"
							transition={{
								x: { type: "spring", stiffness: 300, damping: 30 },
								opacity: { duration: 0.2 },
							}}
							drag="x"
							dragConstraints={{ left: 0, right: 0 }}
							dragElastic={1}
							onDragEnd={(_e, { offset, velocity }) => {
								const swipe = swipePower(offset.x, velocity.x);
								if (swipe < -swipeConfidenceThreshold) {
									paginate(1);
								} else if (swipe > swipeConfidenceThreshold) {
									paginate(-1);
								}
							}}
							className="absolute inset-0 flex flex-col pt-4"
						>
							<div className="flex-1 overflow-y-auto px-4 pb-20">
								<KanbanColumn
									list={activeList}
									projectId={projectId}
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
							<div className="rotate-2 scale-105 shadow-2xl opacity-90 cursor-grabbing pointer-events-none">
								<TaskCard
									task={activeTask}
									isMobileView={true}
									isOverlay={true}
								/>
							</div>
						) : null}
					</DragOverlay>
				</DndContext>
			</div>

			{/* Bottom Sheets */}
			{taskToMove && (
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

						// Optionally switch to the destination tab immediately
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

			<ManageColumnsSheet
				isOpen={isManageColumnsOpen}
				setIsOpen={setIsManageColumnsOpen}
				projectId={projectId}
			/>
		</div>
	);
}
