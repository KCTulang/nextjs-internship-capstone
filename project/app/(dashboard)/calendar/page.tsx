import { getAllUserTasksAction } from "@/app/actions/tasks";
import {
	CalendarGrid,
	type CalendarTask,
} from "@/components/calendar/calendar-grid";
import { UpcomingDeadlines } from "@/components/calendar/upcoming-deadlines";

import { TaskDetailPanel } from "@/components/task-detail-panel";
import { isDateOnly } from "@/utils/date-only";

export default async function CalendarPage(props: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const searchParams = await props.searchParams;
	const taskId =
		typeof searchParams.taskId === "string" ? searchParams.taskId : null;

	const res = await getAllUserTasksAction();

	const allTasks: CalendarTask[] =
		res.success && res.data ? (res.data as CalendarTask[]) : [];

	const tasksWithDates = allTasks.filter(
		(t): t is CalendarTask & { dueDate: string } => isDateOnly(t.dueDate),
	);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Timeline</h1>
					<p className="text-muted-foreground mt-2">
						View project deadlines and upcoming tasks
					</p>
				</div>
			</div>

			<CalendarGrid tasksWithDates={tasksWithDates} />

			<div className="bg-card rounded-lg border border-border p-6">
				<h3 className="text-lg font-semibold text-foreground mb-4">
					Upcoming Deadlines
				</h3>
				<UpcomingDeadlines tasksWithDates={tasksWithDates} />
			</div>
			{taskId && (
				<TaskDetailPanel
					taskId={taskId}
					initialTask={tasksWithDates.find((t) => t.id === taskId)}
				/>
			)}
		</div>
	);
}
