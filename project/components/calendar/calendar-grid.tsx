"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { priorityClass } from "@/lib/utils";

export type CalendarTask = {
	id: string;
	title: string;
	projectName?: string | null;
	projectSlug?: string | null;
	priority?: string | null;
	dueDate?: Date | null;
	labels?: string[] | null;
	listName?: string | null;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const VISIBLE_LIMIT = 3;

function toDateKey(d: Date): string {
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function buildMonthGrid(year: number, month: number): Date[] {
	const startOffset = new Date(year, month, 1).getDay();
	const cells: Date[] = [];
	for (let i = -startOffset; i < 42 - startOffset; i++) {
		cells.push(new Date(year, month, 1 + i));
	}
	return cells;
}

interface DayCellProps {
	date: Date;
	tasks: CalendarTask[];
	isCurrentMonth: boolean;
	isToday: boolean;
	onTaskClick: (task: CalendarTask) => void;
}

function DayCell({
	date,
	tasks,
	isCurrentMonth,
	isToday,
	onTaskClick,
}: DayCellProps) {
	const [expanded, setExpanded] = useState(false);
	const visible = expanded ? tasks : tasks.slice(0, VISIBLE_LIMIT);
	const overflow = tasks.length - VISIBLE_LIMIT;

	return (
		<div
			className={`min-h-22.5 p-1.5 flex flex-col gap-0.5 border-b border-r border-border transition-colors ${
				isCurrentMonth ? "bg-card" : "bg-muted/30"
			}`}
		>
			<span
				className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 shrink-0 ${
					isToday
						? "bg-primary text-primary-foreground"
						: isCurrentMonth
							? "text-foreground"
							: "text-muted-foreground/50"
				}`}
			>
				{date.getDate()}
			</span>

			{visible.map((task) => {
				const hasLink = !!task.projectSlug;
				return hasLink ? (
					<button
						key={task.id}
						type="button"
						onClick={() => onTaskClick(task)}
						title={task.title}
						className={`w-full text-left text-[10px] font-medium truncate px-1.5 py-0.5 rounded border leading-snug transition-opacity hover:opacity-80 active:opacity-60 cursor-pointer ${priorityClass(task.priority)}`}
					>
						{task.title}
					</button>
				) : (
					<span
						key={task.id}
						title={`${task.title} (no linked project)`}
						className={`w-full text-[10px] font-medium truncate px-1.5 py-0.5 rounded border leading-snug opacity-40 cursor-not-allowed ${priorityClass(task.priority)}`}
					>
						{task.title}
					</span>
				);
			})}

			{!expanded && overflow > 0 && (
				<button
					type="button"
					onClick={() => setExpanded(true)}
					className="text-[10px] text-muted-foreground hover:text-foreground font-medium text-left px-1 transition-colors"
				>
					+{overflow} more
				</button>
			)}
			{expanded && tasks.length > VISIBLE_LIMIT && (
				<button
					type="button"
					onClick={() => setExpanded(false)}
					className="text-[10px] text-muted-foreground hover:text-foreground font-medium text-left px-1 transition-colors"
				>
					Show less
				</button>
			)}
		</div>
	);
}

interface CalendarGridProps {
	tasksWithDates: CalendarTask[];
}

export function CalendarGrid({ tasksWithDates }: CalendarGridProps) {
	const router = useRouter();

	const today = new Date();
	const [viewYear, setViewYear] = useState(today.getFullYear());
	const [viewMonth, setViewMonth] = useState(today.getMonth());

	const tasksByDay = new Map<string, CalendarTask[]>();
	for (const task of tasksWithDates) {
		if (!task.dueDate) continue;
		const key = toDateKey(new Date(task.dueDate));
		if (!tasksByDay.has(key)) tasksByDay.set(key, []);
		tasksByDay.get(key)?.push(task);
	}

	const cells = buildMonthGrid(viewYear, viewMonth);
	const todayKey = toDateKey(today);

	function prevMonth() {
		if (viewMonth === 0) {
			setViewYear((y) => y - 1);
			setViewMonth(11);
		} else {
			setViewMonth((m) => m - 1);
		}
	}

	function nextMonth() {
		if (viewMonth === 11) {
			setViewYear((y) => y + 1);
			setViewMonth(0);
		} else {
			setViewMonth((m) => m + 1);
		}
	}

	function goToToday() {
		setViewYear(today.getFullYear());
		setViewMonth(today.getMonth());
	}

	function handleTaskClick(task: CalendarTask) {
		if (task.projectSlug) {
			router.push(`/projects/${task.projectSlug}?taskId=${task.id}`, {
				scroll: false,
			});
		}
	}

	return (
		<div className="bg-card rounded-lg border border-border overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border">
				<div className="flex items-center gap-3">
					<h2 className="text-base font-semibold text-foreground">
						{MONTH_NAMES[viewMonth]} {viewYear}
					</h2>
					<button
						type="button"
						onClick={goToToday}
						className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 transition-colors"
					>
						Today
					</button>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={prevMonth}
						aria-label="Previous month"
						className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
					>
						<ChevronLeft size={16} />
					</button>
					<button
						type="button"
						onClick={nextMonth}
						aria-label="Next month"
						className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
					>
						<ChevronRight size={16} />
					</button>
				</div>
			</div>

			<div className="grid grid-cols-7 border-b border-border">
				{DAY_LABELS.map((d) => (
					<div
						key={d}
						className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-r border-border last:border-r-0"
					>
						{d}
					</div>
				))}
			</div>

			<div className="grid grid-cols-7">
				{cells.map((date) => {
					const key = toDateKey(date);
					const dayTasks = tasksByDay.get(key) ?? [];
					return (
						<DayCell
							key={key}
							date={date}
							tasks={dayTasks}
							isCurrentMonth={date.getMonth() === viewMonth}
							isToday={key === todayKey}
							onTaskClick={handleTaskClick}
						/>
					);
				})}
			</div>
		</div>
	);
}
