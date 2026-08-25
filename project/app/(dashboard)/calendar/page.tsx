import type { Metadata } from "next";
import Link from "next/link";
import { getAllUserTasksAction } from "@/app/actions/tasks";
import {
	CalendarGrid,
	type CalendarTask,
} from "@/components/calendar/calendar-grid";
import { UpcomingDeadlines } from "@/components/calendar/upcoming-deadlines";
import { TaskDetailPanel } from "@/components/task-detail-panel";
import { isDateOnly } from "@/utils/date-only";

export const metadata: Metadata = {
	title: "Calendar",
};

export default async function CalendarPage(props: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const searchParams = await props.searchParams;
	const taskId =
		typeof searchParams.taskId === "string" ? searchParams.taskId : null;

	const res = await getAllUserTasksAction();
	if (!res.success) {
		return (
			<div className="mx-auto w-full min-w-0 max-w-400 space-y-6">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Calendar
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
						View project deadlines and upcoming tasks
					</p>
				</div>
				<div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
					<p className="text-sm font-semibold text-destructive">
						Unable to load calendar tasks
					</p>
					<p className="mt-1 text-sm text-destructive/80">{res.error}</p>
					<Link
						href="/calendar"
						className="mt-4 inline-flex rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						Try again
					</Link>
				</div>
			</div>
		);
	}

	const allTasks: CalendarTask[] = res.data ?? [];

	const tasksWithDates = allTasks.filter(
		(t): t is CalendarTask & { dueDate: string } => isDateOnly(t.dueDate),
	);
	const deadlineTasks = tasksWithDates.filter((task) => !task.listIsCompleted);
	const selectedTask = taskId
		? tasksWithDates.find((task) => task.id === taskId)
		: undefined;

	return (
		<div className="mx-auto w-full min-w-0 max-w-400 space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Calendar
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
						View project deadlines and upcoming tasks
					</p>
				</div>
			</div>

			<CalendarGrid tasksWithDates={tasksWithDates} />

			<div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
				<div className="mb-4 flex items-end justify-between gap-4 border-b border-border pb-4">
					<div>
						<h2 className="text-base font-semibold text-foreground">
							Upcoming Deadlines
						</h2>
						<p className="mt-1 text-xs text-muted-foreground">
							Due dates across all accessible projects
						</p>
					</div>
					<span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
						{deadlineTasks.length}
					</span>
				</div>
				<UpcomingDeadlines tasksWithDates={deadlineTasks} />
			</div>
			{taskId && (
				<TaskDetailPanel
					taskId={taskId}
					initialTask={selectedTask}
					readOnly={selectedTask?.canMutateTasks === false}
				/>
			)}
		</div>
	);
}
