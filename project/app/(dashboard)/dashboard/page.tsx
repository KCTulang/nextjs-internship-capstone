import { getTeamMembersAction } from "@/app/actions/members";
import { getAnalyticsAction } from "@/app/actions/tasks";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
	const [analyticsRes, teamRes] = await Promise.all([
		getAnalyticsAction(),
		getTeamMembersAction(),
	]);

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

	const initialStats = {
		teamMembers: teamSize,
		completedTasks: analytics.completedTasks,
		pendingTasks: analytics.totalTasks - analytics.completedTasks,
		projectCount: analytics.projectCount,
	};

	return <DashboardClient initialStats={initialStats} />;
}
