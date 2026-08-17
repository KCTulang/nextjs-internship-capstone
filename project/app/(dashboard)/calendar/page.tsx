import { getAllUserTasksAction } from "@/app/actions/tasks";
import {
	CalendarGrid,
	type CalendarTask,
} from "@/components/calendar/calendar-grid";
import { UpcomingDeadlines } from "@/components/calendar/upcoming-deadlines";

export default async function CalendarPage() {
	const res = await getAllUserTasksAction();

	const allTasks: CalendarTask[] =
		res.success && res.data
			? (res.data as CalendarTask[]).map((t) => ({
					...t,

					dueDate: t.dueDate ? new Date(t.dueDate) : null,
				}))
			: [];

	const tasksWithDates = allTasks.filter(
		(t): t is CalendarTask & { dueDate: Date } =>
			t.dueDate instanceof Date && !Number.isNaN(t.dueDate.getTime()),
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
		</div>
	);
}
