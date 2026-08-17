"use client";

import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
	Calendar,
	dateFnsLocalizer,
	type ToolbarProps,
	type View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { priorityClass } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

export type CalendarTask = {
	id: string;
	title: string;
	description?: string | null;
	projectName?: string | null;
	projectSlug?: string | null;
	priority?: string | null;
	dueDate?: Date | null;
	labels?: string[] | null;
	listName?: string | null;
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

export type LockInCalendarEvent = {
	id: string;
	title: string;
	start: Date;
	end: Date;
	resource: CalendarTask;
};

interface CalendarGridProps {
	tasksWithDates: (CalendarTask & { dueDate: Date })[];
}

export function CalendarGrid({ tasksWithDates }: CalendarGridProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { openCreateTaskModal, openPreviewTaskModal } = useUIStore();

	const [view, setView] = useState<View>("month");
	const [date, setDate] = useState(new Date());

	const events = useMemo(() => {
		return tasksWithDates.map((task) => {
			const start = new Date(task.dueDate);
			const end = new Date(task.dueDate);

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
			openCreateTaskModal({ initialDueDate: slotInfo.start });
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
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-4 border-b border-border gap-4 bg-card rounded-t-xl">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={goToBack}
							aria-label="Previous"
							className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border bg-background"
						>
							<ChevronLeft size={16} />
						</button>
						<button
							type="button"
							onClick={goToCurrent}
							className="px-3 py-1.5 text-xs font-medium text-foreground border border-border rounded-md hover:bg-muted transition-colors bg-background"
						>
							Today
						</button>
						<button
							type="button"
							onClick={goToNext}
							aria-label="Next"
							className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border bg-background"
						>
							<ChevronRight size={16} />
						</button>
						<h2 className="text-base font-semibold text-foreground ml-3 hidden sm:block">
							{label()}
						</h2>
					</div>
					<h2 className="text-base font-semibold text-foreground sm:hidden">
						{label()}
					</h2>
					<div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border">
						{(["month", "week"] as View[]).map((v) => (
							<button
								key={v}
								type="button"
								onClick={() => toolbarProps.onView(v)}
								className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
									toolbarProps.view === v
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/80"
								}`}
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

	const EventComponent = useCallback(
		({ event }: { event: LockInCalendarEvent }) => {
			const pClass = priorityClass(event.resource.priority);
			return (
				<div
					className={`p-1.5 rounded text-xs w-full h-full flex flex-col gap-1 shadow-sm border ${pClass}`}
					title={`${event.title} \nProject: ${event.resource.projectName || "None"}`}
				>
					<div className="font-semibold text-foreground truncate">
						{event.title}
					</div>
					{event.resource.description && (
						<div className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
							{event.resource.description}
						</div>
					)}
					<div className="mt-auto pt-1 flex items-center gap-1.5 text-[10px] font-medium text-foreground opacity-80 truncate">
						<div className={`w-1.5 h-1.5 rounded-full bg-current shrink-0`} />
						<span className="truncate">{event.resource.projectName}</span>
					</div>
				</div>
			);
		},
		[],
	);

	return (
		<div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col h-[700px] shadow-sm calendar-container">
			<Calendar
				localizer={localizer}
				events={events}
				startAccessor="start"
				endAccessor="end"
				views={["month", "week"]}
				style={{ height: "100%", flex: 1 }}
				view={view}
				onView={setView}
				date={date}
				onNavigate={setDate}
				components={{
					toolbar: CustomToolbar,
					event: EventComponent,
				}}
				onSelectEvent={handleSelectEvent}
				onSelectSlot={handleSelectSlot}
				selectable
				popup
				tooltipAccessor={(e) => e.title}
			/>
		</div>
	);
}
