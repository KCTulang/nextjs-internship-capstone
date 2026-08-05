"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	Calendar,
	CheckCircle2,
	GripVertical,
	MessageSquare,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Task } from "@/hooks/use-tasks";

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

	const handleCardClick = () => {
		if (isOverlay) return;
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

	const style = {
		transition,
		transform: CSS.Transform.toString(transform),
	};

	const priorityColors = {
		low: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20",
		medium:
			"bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
		high: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
		urgent:
			"bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
	};

	const pColor =
		priorityColors[
			(task.priority?.toLowerCase() as keyof typeof priorityColors) || "medium"
		];

	if (isDragging && !isOverlay) {
		return (
			<div
				ref={setNodeRef}
				style={style}
				className="bg-card/40 border-2 border-dashed border-border/60 rounded-xl p-4 h-[110px] opacity-40 backdrop-blur-sm z-50"
			/>
		);
	}

	return (
		<button
			type="button"
			ref={setNodeRef}
			style={style}
			{...(isMobileView ? { ...attributes, ...listeners } : {})}
			onClick={handleCardClick}
			className="text-left w-full group relative bg-card dark:bg-white/[0.02] border border-border/60 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-border transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
		>
			<div
				className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${pColor.split(" ")[1].replace("text-", "bg-")}`}
			/>

			<div className="flex items-start justify-between gap-3 pl-2">
				<div className="flex-1 min-w-0 space-y-1">
					<h4 className="font-medium text-foreground text-[13px] leading-snug line-clamp-2">
						{task.title}
					</h4>

					{task.description && (
						<p className="text-xs text-muted-foreground line-clamp-2 pr-4 leading-relaxed">
							{task.description}
						</p>
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

			{isMobileView && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						if (onMoveClick) onMoveClick(task);
					}}
					className="absolute top-2 right-2 p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors z-10"
					title="Move Task"
				>
					<MessageSquare className="hidden" />{" "}
					{/* keeping import valid, but using better icon below */}
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

			<div className="flex items-center justify-between mt-4 pl-2">
				<div className="flex items-center gap-2">
					<span
						className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${pColor} uppercase tracking-wider`}
					>
						{task.priority || "Medium"}
					</span>

					<div
						className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium"
						title="Checklist items"
					>
						<CheckCircle2 size={12} className="opacity-70" />
						0/3
					</div>
				</div>

				<div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-medium">
					<div
						className="flex items-center gap-1 hover:text-foreground transition-colors"
						title="Comments"
					>
						<MessageSquare size={12} className="opacity-70" />2
					</div>

					{task.dueDate && (
						<div className="flex items-center gap-1" title="Due date">
							<Calendar size={12} className="opacity-70" />
							{new Date(task.dueDate).toLocaleDateString(undefined, {
								month: "short",
								day: "numeric",
							})}
						</div>
					)}

					<div
						className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white shadow-sm ring-2 ring-background ml-1"
						title="Assigned to you"
					>
						KC
					</div>
				</div>
			</div>
		</button>
	);
}
