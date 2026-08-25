"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Calendar, GripVertical, MessageSquare } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Task } from "@/stores/board-store";
import { useTasksStore } from "@/stores/board-store";
import { priorityAccentClass, priorityClass } from "@/utils";
import { formatDateOnly } from "@/utils/date-only";

interface TaskCardProps {
	task: Task;
	isOverlay?: boolean;
	isMobileView?: boolean;
	onMoveClick?: (task: Task) => void;
}

export function TaskCard({
	task,
	isOverlay = false,
	isMobileView = false,
	onMoveClick,
}: TaskCardProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { selectedTaskIds, toggleTaskSelection } = useTasksStore();

	const isSelected = selectedTaskIds.includes(task.id);
	const hasSelection = selectedTaskIds.length > 0;
	const suppressClickAfterDragRef = useRef(false);
	const suppressClickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const handleCardClick = (e: React.MouseEvent | React.KeyboardEvent) => {
		if (isOverlay) return;
		if (isDragging || suppressClickAfterDragRef.current) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		if (hasSelection) {
			e.preventDefault();
			e.stopPropagation();
			toggleTaskSelection(task.id);
			return;
		}
		const params = new URLSearchParams(searchParams.toString());
		params.set("taskId", task.id);
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};
	const {
		setNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: task.id,
		data: {
			type: "Task",
			task,
		},
		disabled: isOverlay,
	});

	useEffect(() => {
		if (suppressClickTimeoutRef.current) {
			clearTimeout(suppressClickTimeoutRef.current);
			suppressClickTimeoutRef.current = null;
		}

		if (isDragging) {
			suppressClickAfterDragRef.current = true;
			return;
		}

		if (suppressClickAfterDragRef.current) {
			suppressClickTimeoutRef.current = setTimeout(() => {
				suppressClickAfterDragRef.current = false;
				suppressClickTimeoutRef.current = null;
			}, 250);
		}

		return () => {
			if (suppressClickTimeoutRef.current) {
				clearTimeout(suppressClickTimeoutRef.current);
				suppressClickTimeoutRef.current = null;
			}
		};
	}, [isDragging]);

	const [overlayMounted, setOverlayMounted] = useState(false);

	useEffect(() => {
		if (isOverlay) {
			const timer = requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setOverlayMounted(true);
				});
			});
			return () => cancelAnimationFrame(timer);
		}
	}, [isOverlay]);

	const style = {
		transition,
		transform: CSS.Transform.toString(transform),
	};

	const pColor = priorityClass(task.priority);
	const priorityAccent = priorityAccentClass(task.priority);

	let stateClasses = "shadow-sm hover:shadow-md active:scale-[0.98]";
	if (isDragging && !isOverlay) {
		stateClasses = "opacity-40 border-dashed border-2 pointer-events-none";
	} else if (isOverlay) {
		stateClasses = overlayMounted
			? "scale-[1.04] rotate-1 shadow-xl z-50 motion-reduce:scale-100 motion-reduce:rotate-0 motion-reduce:shadow-md motion-reduce:border-primary/50"
			: "scale-100 rotate-0 shadow-sm z-50";
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.9 }}
			transition={{ duration: 0.2 }}
			ref={setNodeRef}
			style={style}
			className={`relative w-full group transition-all duration-200 ease-out z-0 ${stateClasses}`}
		>
			<div
				className={`absolute left-0 top-3 bottom-3 w-0.75 rounded-r-full ${priorityAccent}`}
			/>

			<div
				className={`absolute top-0 left-0 z-20 ${isSelected || hasSelection || isMobileView ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
			>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						toggleTaskSelection(task.id);
					}}
					aria-label={isSelected ? "Deselect task" : "Select task"}
					className="p-2 cursor-pointer"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center border ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 group-hover:border-foreground bg-background"}`}
					>
						{isSelected && (
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="3"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="w-3 h-3"
							>
								<polyline points="20 6 9 17 4 12"></polyline>
							</svg>
						)}
					</div>
				</button>
			</div>

			<button
				type="button"
				{...(isMobileView && !isOverlay ? { ...attributes, ...listeners } : {})}
				onPointerDown={(event) => {
					if (isMobileView && !isOverlay) event.stopPropagation();
				}}
				onClick={handleCardClick}
				className={`text-left w-full h-full bg-card dark:bg-white/2 border rounded-xl p-3.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
					isSelected && (!isDragging || isOverlay)
						? "border-primary ring-1 ring-primary"
						: "border-border/60 hover:border-border"
				}`}
			>
				<div className="flex items-start justify-between gap-3 pl-6">
					<div className="flex-1 min-w-0 space-y-1">
						<h4 className="font-medium text-foreground text-[13px] leading-snug line-clamp-2">
							{task.title}
						</h4>

						{task.description && (
							<p className="text-xs text-muted-foreground line-clamp-2 pr-4 leading-relaxed">
								{task.description}
							</p>
						)}
						{task.labels && task.labels.length > 0 && (
							<div className="flex flex-wrap gap-1 mt-1.5">
								{task.labels.slice(0, 3).map((label) => (
									<span
										key={label}
										className="text-[9px] px-1.5 py-0.5 bg-muted/60 text-muted-foreground rounded border border-border/50 truncate max-w-20"
										title={label}
									>
										{label}
									</span>
								))}
								{task.labels.length > 3 && (
									<span className="text-[9px] px-1.5 py-0.5 bg-muted/30 text-muted-foreground rounded border border-border/30">
										+{task.labels.length - 3}
									</span>
								)}
							</div>
						)}
					</div>

					{!isMobileView && (
						<div
							{...attributes}
							{...listeners}
							className="p-1 -mr-1 -mt-1 text-muted-foreground/40 hover:text-foreground transition-opacity cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
						>
							<GripVertical size={14} />
						</div>
					)}
				</div>

				<div className="flex items-center justify-between mt-4 pl-2">
					<div className="flex items-center gap-2">
						<span
							className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${pColor} uppercase tracking-wider`}
						>
							{task.priority || "Medium"}
						</span>
					</div>

					<div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-medium">
						<div
							className="flex items-center gap-1 hover:text-foreground transition-colors"
							title="Comments"
						>
							<MessageSquare size={12} className="opacity-70" />
							{task.comments?.length || 0}
						</div>

						{task.dueDate && (
							<div className="flex items-center gap-1" title="Due date">
								<Calendar size={12} className="opacity-70" />
								{formatDateOnly(task.dueDate, {
									month: "short",
									day: "numeric",
								})}
							</div>
						)}

						{task.assignee ? (
							<div
								className="w-5 h-5 rounded-full bg-linear-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm ring-2 ring-background ml-1"
								title={`Assigned to ${task.assignee.name || task.assignee.email}`}
							>
								{(task.assignee.name || task.assignee.email || "U")
									.substring(0, 2)
									.toUpperCase()}
							</div>
						) : (
							<div
								className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-500 dark:text-slate-400 shadow-sm ring-2 ring-background ml-1"
								title="Unassigned"
							>
								?
							</div>
						)}
					</div>
				</div>
			</button>

			{isMobileView && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						if (onMoveClick) onMoveClick(task);
					}}
					className="absolute top-2 right-2 p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors z-10"
					aria-label="Move to column"
					title="Move to column"
				>
					<MessageSquare className="hidden" />{" "}
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="opacity-70"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="1" />
						<circle cx="19" cy="12" r="1" />
						<circle cx="5" cy="12" r="1" />
					</svg>
				</button>
			)}
		</motion.div>
	);
}
