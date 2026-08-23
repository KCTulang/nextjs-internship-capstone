import { getTeamMembersAction } from "@/app/actions/members";
import { getAnalyticsAction } from "@/app/actions/tasks";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
	const [analyticsRes, teamRes] = await Promise.all([
		getAnalyticsAction(),
		getTeamMembersAction(),
	]);

	const analytics = analyticsRes.success ? analyticsRes.data : null;
	const completionError = analyticsRes.success
		? undefined
		: "guidance" in analyticsRes
			? `${analyticsRes.error} ${analyticsRes.guidance}`
			: analyticsRes.error;

	const teamSize = teamRes.success && teamRes.data ? teamRes.data.length : 0;

	const initialStats = {
		teamMembers: teamSize,
		completedTasks: analytics?.completedTasks ?? null,
		pendingTasks: analytics
			? analytics.totalTasks - analytics.completedTasks
			: null,
		projectCount:
			analytics?.projectCount ??
			(!analyticsRes.success && "projectCount" in analyticsRes
				? (analyticsRes.projectCount ?? 0)
				: 0),
	};

	return (
		<DashboardClient
			initialStats={initialStats}
			completionError={completionError}
		/>
	);
}
