import { BarChart3, Clock, TrendingUp, Users } from "lucide-react";
import { getTeamMembersAction } from "@/app/actions/members";
import { getAnalyticsAction } from "@/app/actions/tasks";

export default async function AnalyticsPage() {
	const analyticsRes = await getAnalyticsAction();
	const teamRes = await getTeamMembersAction();
	const analytics =
		analyticsRes.success && analyticsRes.data
			? analyticsRes.data
			: {
					totalTasks: 0,
					completedTasks: 0,
					completionRate: 0,
					projectCount: 0,
				};
	const teamSize = teamRes.success && teamRes.data ? teamRes.data.length : 0;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-foreground">Analytics</h1>
				<p className="text-muted-foreground mt-2">
					Track project performance and team productivity
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{[
					{
						title: "Total Tasks",
						value: analytics.totalTasks.toString(),
						unit: "all time",
						icon: TrendingUp,
						color: "blue",
					},
					{
						title: "Completion Rate",
						value: `${analytics.completionRate}%`,
						unit: "all projects",
						icon: BarChart3,
						color: "green",
					},
					{
						title: "Team Members",
						value: teamSize.toString(),
						unit: "active",
						icon: Users,
						color: "purple",
					},
					{
						title: "Active Projects",
						value: analytics.projectCount.toString(),
						unit: "managing",
						icon: Clock,
						color: "orange",
					},
				].map((metric) => (
					<div
						key={metric.title}
						className="bg-card rounded-lg border border-border p-6"
					>
						<div className="flex items-center justify-between mb-4">
							<div
								className={`w-10 h-10 bg-${metric.color}-100/10 rounded-lg flex items-center justify-center`}
							>
								<metric.icon className={`text-${metric.color}-500`} size={20} />
							</div>
						</div>
						<div className="text-2xl font-bold text-foreground mb-1">
							{metric.value}
						</div>
						<div className="text-sm text-muted-foreground mb-2">
							{metric.unit}
						</div>
						<div className="text-xs font-medium text-foreground">
							{metric.title}
						</div>
					</div>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-card rounded-lg border border-border p-6 flex flex-col justify-center items-center h-64 border-dashed">
					<BarChart3
						size={48}
						className="mx-auto mb-4 text-muted-foreground/30"
					/>
					<p className="text-foreground font-medium">Task Progress</p>
					<p className="text-sm text-muted-foreground text-center mt-2 max-w-sm">
						{analytics.completedTasks} out of {analytics.totalTasks} tasks
						completed across all projects. Keep up the good work!
					</p>
				</div>

				<div className="bg-card rounded-lg border border-border p-6 flex flex-col justify-center items-center h-64 border-dashed">
					<Users size={48} className="mx-auto mb-4 text-muted-foreground/30" />
					<p className="text-foreground font-medium">Team Distribution</p>
					<p className="text-sm text-muted-foreground text-center mt-2 max-w-sm">
						Collaborating with {teamSize} unique members across{" "}
						{analytics.projectCount} active projects.
					</p>
				</div>
			</div>
		</div>
	);
}
