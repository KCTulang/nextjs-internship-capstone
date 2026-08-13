import { getAllUserTasksAction } from "@/app/actions/tasks";

type Task = {
	id: string | number;
	title: string;
	projectName?: string;
	priority?: string;
	dueDate?: string | null;
};

export default async function CalendarPage() {
	const res = await getAllUserTasksAction();
	const tasks: Task[] = res.success ? (res.data as Task[]) : [];

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

			<div className="bg-card rounded-lg border border-border p-6">
				<h3 className="text-lg font-semibold text-foreground mb-4">
					Upcoming Deadlines
				</h3>
				<div className="space-y-3">
					{tasks && tasks.length > 0 ? (
						tasks.map((task: Task) => (
							<div
								key={task.id}
								className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
							>
								<div>
									<h4 className="font-medium text-foreground">{task.title}</h4>
									<div className="flex items-center gap-2 mt-1">
										<p className="text-sm text-muted-foreground">
											{task.projectName}
										</p>
										<span className="text-[10px] uppercase font-bold text-muted-foreground bg-border px-1.5 py-0.5 rounded">
											{task.priority}
										</span>
									</div>
								</div>
								<div className="flex flex-col items-end">
									<p className="text-sm font-medium text-foreground">
										{task.dueDate
											? new Date(task.dueDate).toLocaleDateString(undefined, {
													month: "short",
													day: "numeric",
													year: "numeric",
												})
											: "No date"}
									</p>
									<p className="text-xs text-muted-foreground mt-1">Deadline</p>
								</div>
							</div>
						))
					) : (
						<div className="text-center py-8 text-muted-foreground">
							<p>No upcoming deadlines found.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
