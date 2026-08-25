import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { getTeamMembersAction } from "@/app/actions/members";
import { getProjectsAction } from "@/app/actions/projects";
import { getAllUserTasksAction, getAnalyticsAction } from "@/app/actions/tasks";
import { getProjectCompletionStats } from "@/lib/tasks/completion";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
	title: "Dashboard",
};

export default async function DashboardPage() {
	const [analyticsRes, teamRes, deadlinesRes, projectsRes, user] =
		await Promise.all([
			getAnalyticsAction("all"),
			getTeamMembersAction(),
			getAllUserTasksAction(),
			getProjectsAction(100, 0),
			currentUser(),
		]);

	const analytics = analyticsRes.success ? analyticsRes.data : null;
	const completionError = analyticsRes.success
		? (analyticsRes.data.completionWarning ?? undefined)
		: analyticsRes.error;

	const teamSize = teamRes.success && teamRes.data ? teamRes.data.length : 0;
	const firstName = user?.firstName?.trim() || null;
	const activeProjects =
		projectsRes.success && projectsRes.data
			? projectsRes.data.filter((project) => {
					const completion = getProjectCompletionStats(project.lists);
					return (
						!completion.success ||
						completion.totalTasks === 0 ||
						completion.progress < 100
					);
				}).length
			: (analytics?.projectCount ?? 0);

	const initialStats = {
		teamMembers: teamSize,
		completedTasks: analytics?.completedTasks ?? null,
		pendingTasks: analytics
			? analytics.totalTasks - analytics.completedTasks
			: null,
		activeProjects,
	};

	return (
		<DashboardClient
			firstName={firstName}
			initialStats={initialStats}
			initialDeadlineTasks={
				deadlinesRes.success ? (deadlinesRes.data ?? []) : []
			}
			deadlineError={deadlinesRes.success ? undefined : deadlinesRes.error}
			completionError={completionError}
		/>
	);
}
