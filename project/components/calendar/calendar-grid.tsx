"use client";

import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	Calendar,
	dateFnsLocalizer,
	type ToolbarProps,
	type View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useUIStore } from "@/stores/ui-store";
import { parseDateOnly, toDateOnly } from "@/utils/date-only";
import { getDefaultColor } from "@/utils/list-colors";

export type CalendarTask = {
	id: string;
	title: string;
	description?: string | null;
	projectName?: string | null;
	projectSlug?: string | null;
	priority?: string | null;
	dueDate?: string | null;
	labels?: string[] | null;
	listName?: string | null;
	listIsCompleted: boolean;
	canMutateTasks?: boolean;
	assignee?: { id: string; name: string | null; email: string | null } | null;
};

const locales = {
	"en-US": enUS,
};

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek,
	getDay,
	locales,
});

const calendarViews: View[] = ["month", "week"];

export type LockInCalendarEvent = {
	id: string;
	title: string;
	start: Date;
	end: Date;
	resource: CalendarTask;
};

interface CalendarGridProps {
	tasksWithDates: (CalendarTask & { dueDate: string })[];
}

export function CalendarGrid({ tasksWithDates }: CalendarGridProps) {
	const { openCreateTaskModal, openPreviewTaskModal } = useUIStore();

	const [view, setView] = useState<View>("month");
	const [date, setDate] = useState(new Date());

	const events = useMemo(() => {
		return tasksWithDates.map((task) => {
			const start = parseDateOnly(task.dueDate);
			const end = parseDateOnly(task.dueDate);
			end.setHours(end.getHours() + 1);

			return {
				id: task.id,
				title: task.title,
				start,
				end,
				allDay: true,
				resource: task,
			};
		});
	}, [tasksWithDates]);

	const handleSelectEvent = useCallback(
		(event: LockInCalendarEvent) => {
			openPreviewTaskModal(event.resource);
		},
		[openPreviewTaskModal],
	);

	const handleSelectSlot = useCallback(
		(slotInfo: {
			start: Date;
			end: Date;
			action: "select" | "click" | "doubleClick";
		}) => {
			openCreateTaskModal({
				initialDueDate: toDateOnly(slotInfo.start),
				source: "global",
			});
		},
		[openCreateTaskModal],
	);

	const CustomToolbar = useCallback(
		(toolbarProps: ToolbarProps<LockInCalendarEvent, object>) => {
			const goToBack = () => toolbarProps.onNavigate("PREV");
			const goToNext = () => toolbarProps.onNavigate("NEXT");
			const goToCurrent = () => toolbarProps.onNavigate("TODAY");

			const label = () => {
				const d = toolbarProps.date;
				if (toolbarProps.view === "month") {
					return format(d, "MMMM yyyy");
				}
				if (toolbarProps.view === "week") {
					return `Week of ${format(startOfWeek(d, { weekStartsOn: 0 }), "MMM do")}`;
				}
				if (toolbarProps.view === "day") {
					return format(d, "EEEE, MMM do");
				}
				return toolbarProps.label;
			};

			return (
				<div className="grid gap-3 border-b border-border bg-card px-3 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-4">
					<div className="flex items-center gap-1.5 sm:justify-self-start">
						<button
							type="button"
							onClick={goToBack}
							aria-label="Previous"
							className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<ChevronLeft size={16} />
						</button>
						<button
							type="button"
							onClick={goToCurrent}
							className="h-8 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Today
						</button>
						<button
							type="button"
							onClick={goToNext}
							aria-label="Next"
							className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<ChevronRight size={16} />
						</button>
					</div>
					<h2 className="text-lg font-semibold tracking-tight text-foreground sm:col-start-2 sm:row-start-1 sm:justify-self-center sm:text-xl">
						{label()}
					</h2>
					<div className="flex w-full items-center rounded-lg border border-border bg-muted/50 p-1 sm:col-start-3 sm:row-start-1 sm:w-auto sm:justify-self-end">
						{calendarViews.map((v) => (
							<button
								key={v}
								type="button"
								onClick={() => toolbarProps.onView(v)}
								aria-pressed={toolbarProps.view === v}
								className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all sm:flex-none ${
									toolbarProps.view === v
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:bg-accent hover:text-foreground"
								} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
							>
								{v}
							</button>
						))}
					</div>
				</div>
			);
		},
		[],
	);

	const MonthEventComponent = useCallback(
		({ event }: { event: LockInCalendarEvent }) => {
			const statusColor = getDefaultColor(
				event.resource.listName ?? "",
				event.resource.listIsCompleted,
			);
			return (
				<div
					className="calendar-event-card relative flex w-full min-w-0 items-center rounded-md border border-border/60 bg-card py-1 pr-1.5 pl-2.5 text-card-foreground transition-colors duration-150 hover:border-border hover:bg-accent"
					title={event.title}
				>
					<span
						aria-hidden="true"
						className={`absolute inset-y-1 left-0 w-0.5 rounded-r-full ${statusColor.dot}`}
					/>
					<div className="truncate text-xs font-semibold leading-3 text-foreground">
						{event.title}
					</div>
				</div>
			);
		},
		[],
	);

	const WeekEventComponent = useCallback(
		({ event }: { event: LockInCalendarEvent }) => {
			const statusColor = getDefaultColor(
				event.resource.listName ?? "",
				event.resource.listIsCompleted,
			);
			return (
				<div
					className="calendar-event-card relative flex w-full min-w-0 flex-col gap-px rounded-md border border-border/60 bg-card py-0.5 pr-1.5 pl-2.5 text-card-foreground transition-colors duration-150 hover:border-border hover:bg-accent"
					title={`${event.title}\nProject: ${event.resource.projectName || "None"}\nList: ${event.resource.listName || "None"}`}
				>
					<span
						aria-hidden="true"
						className={`absolute inset-y-1 left-0 w-0.5 rounded-r-full ${statusColor.dot}`}
					/>
					<div className="truncate text-xs font-semibold leading-3 text-foreground">
						{event.title}
					</div>
					<div className="hidden min-w-0 items-center gap-1 text-[10px] leading-2.5 text-muted-foreground sm:flex">
						<span className="truncate">
							{event.resource.projectName || "No project"}
						</span>
						{event.resource.listName && (
							<>
								<span aria-hidden="true">·</span>
								<span className="truncate">{event.resource.listName}</span>
							</>
						)}
					</div>
				</div>
			);
		},
		[],
	);

	return (
		<div
			className={`calendar-container calendar-container--${view} w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm`}
		>
			<Calendar
				localizer={localizer}
				events={events}
				startAccessor="start"
				endAccessor="end"
				views={["month", "week"]}
				view={view}
				onView={setView}
				date={date}
				onNavigate={setDate}
				components={{
					toolbar: CustomToolbar,
					month: { event: MonthEventComponent },
					week: { event: WeekEventComponent },
				}}
				onSelectEvent={handleSelectEvent}
				onSelectSlot={handleSelectSlot}
				selectable
				popup
				allDayMaxRows={4}
				tooltipAccessor={(e) => e.title}
			/>
		</div>
	);
}
