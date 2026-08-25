"use client";

import { useDroppable } from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence } from "framer-motion";
import {
	CheckCircle2,
	GripHorizontal,
	MoreHorizontal,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { List, Task } from "@/stores/board-store";
import { useTasksStore } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";
import { COLUMN_COLORS, getDefaultColor } from "@/utils/list-colors";
import { TaskCard } from "./task-card";

interface KanbanColumnProps {
	list: List;
	projectId: string;
	projectName?: string;
	isOverlay?: boolean;
	isMobileView?: boolean;
	canManageColumns?: boolean;
	canMutateTasks?: boolean;
	onMoveTaskClick?: (task: Task) => void;
}

export function KanbanColumn({
	list,
	projectId,
	projectName,
	isOverlay = false,
	isMobileView = false,
	canManageColumns = false,
	canMutateTasks = true,
	onMoveTaskClick,
}: KanbanColumnProps) {
	const { renameList, removeList, setCompletedList } = useTasksStore();
	const { addToast, openCreateTaskModal, openConfirmModal } = useUIStore();

	const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
		id: `drop-${list.id}`,
		data: { type: "Column", list },
		disabled: !canMutateTasks,
	});

	const {
		setNodeRef: setSortableNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: list.id,
		data: { type: "Column", list },
		disabled: isOverlay || isMobileView || !canManageColumns,
	});

	const style = {
		transition,
		transform: CSS.Translate.toString(transform),
	};

	const colorKey = `kanban-color-${list.id}`;
	const [colorIdx, setColorIdx] = useState<number>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem(colorKey);
			if (saved !== null) return parseInt(saved, 10);
		}
		return COLUMN_COLORS.indexOf(getDefaultColor(list.name, list.isCompleted));
	});
	const color = COLUMN_COLORS[colorIdx] ?? COLUMN_COLORS[0];

	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(list.name);
	const renameInputRef = useRef<HTMLInputElement>(null);

	const [menuOpen, setMenuOpen] = useState(false);
	const [showColorPicker, setShowColorPicker] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isRenaming) renameInputRef.current?.select();
	}, [isRenaming]);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
				setShowColorPicker(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const commitRename = () => {
		const trimmed = renameValue.trim();
		if (trimmed && trimmed !== list.name) {
			renameList(list.id, trimmed, projectId);
		} else {
			setRenameValue(list.name);
		}
		setIsRenaming(false);
	};

	const handleColorSelect = (idx: number) => {
		setColorIdx(idx);
		localStorage.setItem(colorKey, String(idx));
		setShowColorPicker(false);
		setMenuOpen(false);
	};

	const handleDelete = () => {
		if (list.isCompleted) {
			addToast({
				type: "error",
				message: "Set another column as completed before deleting this column.",
			});
			setMenuOpen(false);
			return;
		}
		setMenuOpen(false);
		openConfirmModal({
			title: "Delete column?",
			description: `This will permanently delete "${list.name}" and all its tasks. This action cannot be undone.`,
			confirmText: "Delete Column",
			onConfirm: async () => {
				await removeList(list.id, projectId);
			},
		});
	};

	if (isDragging && !isOverlay) {
		return (
			<div
				ref={setSortableNodeRef}
				style={style}
				className="flex flex-col rounded-2xl shrink-0 w-75 h-125 bg-card/40 border-2 border-dashed border-primary/50 opacity-40 backdrop-blur-sm"
			/>
		);
	}

	return (
		<div
			ref={setSortableNodeRef}
			style={style}
			className={`flex shrink-0 flex-col max-h-full transition-colors duration-200
				bg-card dark:bg-white/3 border
				${isOver ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border/60"}
				backdrop-blur-sm shadow-sm group/column
				${isMobileView ? "w-full rounded-none border-x-0 border-t-0" : "w-68.75 self-start rounded-2xl sm:w-75"}
			`}
		>
			<div
				className="h-1 rounded-t-2xl w-full"
				style={{ background: color.accent }}
			/>

			<div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 pt-3 pb-3">
				<div className="flex items-center gap-2 flex-1 min-w-0">
					{!isMobileView && canManageColumns && (
						<div
							{...attributes}
							{...listeners}
							className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-transparent group-hover/column:text-muted-foreground hover:bg-muted rounded-md transition-colors"
						>
							<GripHorizontal size={14} />
						</div>
					)}

					<span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
					{list.isCompleted && (
						<CheckCircle2
							aria-label="Completed column"
							className="size-4 shrink-0 text-emerald-500"
						/>
					)}

					{isRenaming ? (
						<input
							ref={renameInputRef}
							type="text"
							value={renameValue}
							onChange={(e) => setRenameValue(e.target.value)}
							onBlur={commitRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") commitRename();
								if (e.key === "Escape") {
									setRenameValue(list.name);
									setIsRenaming(false);
								}
							}}
							className="flex-1 min-w-0 text-sm font-semibold bg-transparent border-b border-primary outline-none text-foreground"
						/>
					) : (
						<h3
							className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
							title="Double-click to rename"
							onDoubleClick={() => {
								if (!canManageColumns) return;
								setIsRenaming(true);
								setRenameValue(list.name);
							}}
						>
							{list.name}
						</h3>
					)}

					<span
						className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}
					>
						{list.tasks?.length || 0}
					</span>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={() =>
							openCreateTaskModal({
								listId: list.id,
								projectId,
								projectName,
								source: "column",
							})
						}
						title="Add task"
						className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
					>
						<Plus size={15} />
					</button>

					{canManageColumns && (
						<div ref={menuRef} className="relative">
							<button
								type="button"
								onClick={() => {
									setMenuOpen((v) => !v);
									setShowColorPicker(false);
								}}
								title="Column options"
								aria-label={`Manage ${list.name} column`}
								aria-expanded={menuOpen}
								className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<MoreHorizontal size={15} />
							</button>

							{menuOpen && (
								<div className="absolute right-0 top-full mt-1 w-44 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
									<button
										type="button"
										disabled={list.isCompleted}
										onClick={() => {
											void setCompletedList(list.id, projectId);
											setMenuOpen(false);
										}}
										className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:text-emerald-600 disabled:hover:bg-transparent dark:disabled:text-emerald-400"
									>
										<CheckCircle2 size={14} />
										{list.isCompleted ? "Completed column" : "Set as completed"}
									</button>
									{list.isCompleted && (
										<p className="px-3 pb-2 text-xs leading-4 text-muted-foreground">
											Set another column as completed before deleting this one.
										</p>
									)}
									<button
										type="button"
										onClick={() => {
											setIsRenaming(true);
											setRenameValue(list.name);
											setMenuOpen(false);
										}}
										className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
									>
										<Pencil size={14} className="text-muted-foreground" />
										Rename column
									</button>
									<button
										type="button"
										onClick={() => setShowColorPicker((v) => !v)}
										className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
									>
										<span className={`w-3.5 h-3.5 rounded-full ${color.dot}`} />
										Color
									</button>
									{showColorPicker && (
										<div className="px-3 pb-3 pt-1">
											<div className="flex flex-wrap gap-2">
												{COLUMN_COLORS.map((c, i) => (
													<button
														key={c.name}
														type="button"
														title={c.name}
														onClick={() => handleColorSelect(i)}
														className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${c.dot} ${colorIdx === i ? "ring-2 ring-offset-1 ring-foreground/40 scale-110" : ""}`}
													/>
												))}
											</div>
										</div>
									)}
									<div className="h-px bg-border my-1" />
									<button
										type="button"
										onClick={handleDelete}
										disabled={list.isCompleted}
										title={
											list.isCompleted
												? "Set another column as completed before deleting this one"
												: undefined
										}
										className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
									>
										<Trash2 size={14} />
										Delete column
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<div
				ref={setDroppableNodeRef}
				className={`min-h-24 space-y-2.5 overflow-y-auto px-3 pt-3 pb-2 transition-colors duration-150 ${
					isOver ? "bg-primary/3 rounded-b-2xl" : ""
				}`}
			>
				<SortableContext
					items={list.tasks?.map((t) => t.id) || []}
					strategy={verticalListSortingStrategy}
				>
					<AnimatePresence mode="popLayout">
						{list.tasks?.map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								isMobileView={isMobileView}
								canMutateTasks={canMutateTasks}
								onMoveClick={onMoveTaskClick}
							/>
						))}
					</AnimatePresence>
				</SortableContext>

				{(list.tasks?.length || 0) === 0 && (
					<div
						className={`rounded-xl border border-dashed px-4 py-3 text-center transition-colors ${
							isOver ? `${color.border} ${color.bg}` : "border-border/40"
						}`}
					>
						<p className="text-xs text-muted-foreground">
							{canMutateTasks ? "Drop tasks here" : "No tasks"}
						</p>
					</div>
				)}
			</div>

			{canMutateTasks && (
				<button
					type="button"
					onClick={() =>
						openCreateTaskModal({
							listId: list.id,
							projectId,
							projectName,
							source: "column",
						})
					}
					className="flex items-center gap-2 mx-3 mb-3 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors border border-dashed border-border/50 hover:border-border"
				>
					<Plus size={14} />
					Add task
				</button>
			)}
		</div>
	);
}
