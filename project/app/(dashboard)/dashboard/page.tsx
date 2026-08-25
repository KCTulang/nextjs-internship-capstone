import type { Metadata } from "next";
import { getTeamMembersAction } from "@/app/actions/members";
import { getAnalyticsAction } from "@/app/actions/tasks";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
	title: "Dashboard",
};

export default async function DashboardPage() {
	const [analyticsRes, teamRes] = await Promise.all([
		getAnalyticsAction(),
		getTeamMembersAction(),
	]);

	const analytics = analyticsRes.success ? analyticsRes.data : null;
	const completionError = analyticsRes.success
		? (analyticsRes.data.completionWarning ?? undefined)
		: analyticsRes.error;

	const teamSize = teamRes.success && teamRes.data ? teamRes.data.length : 0;

	const initialStats = {
		teamMembers: teamSize,
		completedTasks: analytics?.completedTasks ?? null,
		pendingTasks: analytics
			? analytics.totalTasks - analytics.completedTasks
			: null,
		projectCount: analytics?.projectCount ?? 0,
	};

	return (
		<DashboardClient
			initialStats={initialStats}
			completionError={completionError}
		/>
	);
}
