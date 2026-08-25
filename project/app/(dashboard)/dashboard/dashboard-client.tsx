"use client";

import { CheckCircle, Clock, Plus, TrendingUp, Users } from "lucide-react";
import { useEffect } from "react";
import { ProjectCard } from "@/components/project-card";
import { ProjectGridSkeleton } from "@/components/skeletons/project-card-skeleton";
import { useProjectStore } from "@/hooks/use-projects";
import { useUIStore } from "@/stores/ui-store";

interface DashboardStats {
	teamMembers: number;
	completedTasks: number | null;
	pendingTasks: number | null;
	projectCount: number;
}

interface DashboardClientProps {
	initialStats: DashboardStats;
	completionError?: string;
}

export function DashboardClient({
	initialStats,
	completionError,
}: DashboardClientProps) {
	const { openCreateProjectModal, openInviteMemberModal } = useUIStore();
	const { projects, isLoading, error, fetchProjects } = useProjectStore();
	const canManageAnyMembers = projects.some(
		(project) => project.capabilities?.canManageMembers,
	);

	useEffect(() => {
		fetchProjects(true);
	}, [fetchProjects]);

	const stats = [
		{
			name: "Active Projects",
			value:
				projects.length > 0
					? projects.length.toString()
					: initialStats.projectCount.toString(),
			icon: TrendingUp,
		},
		{
			name: "Team Members",
			value: initialStats.teamMembers.toString(),
			icon: Users,
		},
		{
			name: "Completed Tasks",
			value: initialStats.completedTasks?.toString() ?? "—",
			icon: CheckCircle,
		},
		{
			name: "Pending Tasks",
			value: initialStats.pendingTasks?.toString() ?? "—",
			icon: Clock,
		},
	];

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
				<p className="text-muted-foreground mt-2">
					Welcome back! Here's an overview of your projects and tasks.
				</p>
			</div>

			{completionError && (
				<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
					{completionError}
				</div>
			)}

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{stats.map((stat) => (
					<div
						key={stat.name}
						className="bg-card overflow-hidden rounded-lg border border-border p-6"
					>
						<div className="flex items-center">
							<div className="shrink-0">
								<div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
									<stat.icon className="text-primary" size={20} />
								</div>
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-muted-foreground truncate">
										{stat.name}
									</dt>
									<dd className="flex items-baseline">
										<div className="text-2xl font-semibold text-foreground">
											{stat.value}
										</div>
									</dd>
								</dl>
							</div>
						</div>
					</div>
				))}
			</div>

			<div className="bg-card rounded-lg border border-border p-6">
				<h3 className="text-lg font-semibold text-foreground mb-4">
					Quick Actions
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{canManageAnyMembers && (
						<button
							type="button"
							onClick={openCreateProjectModal}
							className="w-full flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
						>
							<Plus size={20} className="mr-2" />
							Create New Project
						</button>
					)}
					<button
						type="button"
						onClick={openInviteMemberModal}
						className="w-full flex items-center justify-center px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
					>
						<Plus size={20} className="mr-2" />
						Add Team Member
					</button>
				</div>
			</div>

			<div className="mt-8">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-bold text-foreground">All Projects</h2>
				</div>

				{isLoading && projects.length === 0 ? (
					<ProjectGridSkeleton count={3} label="Loading dashboard projects" />
				) : error && projects.length === 0 ? (
					<div className="rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-6 text-center">
						<p className="text-sm font-medium text-destructive">{error}</p>
						<button
							type="button"
							onClick={() => void fetchProjects(true)}
							className="mt-3 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Try again
						</button>
					</div>
				) : projects.length === 0 ? (
					<div className="text-center py-10 border border-dashed border-border rounded-xl">
						<p className="text-muted-foreground mb-4">No projects yet.</p>
						<button
							type="button"
							onClick={openCreateProjectModal}
							className="text-primary hover:underline font-medium"
						>
							Create your first project
						</button>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{projects.map((project) => (
							<ProjectCard key={project.id} project={project} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
