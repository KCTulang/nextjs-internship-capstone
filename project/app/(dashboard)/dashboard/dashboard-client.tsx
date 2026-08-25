"use client";

import {
	ArrowRight,
	CalendarClock,
	CheckCircle2,
	Clock3,
	FolderPlus,
	ListPlus,
	TrendingUp,
	UserPlus,
	Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import type { CalendarTask } from "@/components/calendar/calendar-grid";
import { ProjectCard } from "@/components/project-card";
import { ProjectGridSkeleton } from "@/components/skeletons/project-card-skeleton";
import { useProjectStore } from "@/hooks/use-projects";
import { getProjectCompletionStats } from "@/lib/tasks/completion";
import { useUIStore } from "@/stores/ui-store";
import {
	formatDateOnlyDeadlineLabel,
	isDateOnly,
	isDateOnlyOverdue,
} from "@/utils/date-only";
import { getDefaultColor } from "@/utils/list-colors";

interface DashboardStats {
	teamMembers: number;
	completedTasks: number | null;
	pendingTasks: number | null;
	activeProjects: number;
}

interface DashboardClientProps {
	firstName: string | null;
	initialStats: DashboardStats;
	initialDeadlineTasks: CalendarTask[];
	completionError?: string;
	deadlineError?: string;
}

export function DashboardClient({
	firstName,
	initialStats,
	initialDeadlineTasks,
	completionError,
	deadlineError,
}: DashboardClientProps) {
	const {
		openCreateProjectModal,
		openCreateTaskModal,
		openInviteMemberModal,
		openPreviewTaskModal,
	} = useUIStore();
	const { projects, isLoading, error, fetchProjects } = useProjectStore();

	useEffect(() => {
		fetchProjects(true);
	}, [fetchProjects]);

	const activeProjectCount = useMemo(() => {
		if (projects.length === 0) return initialStats.activeProjects;
		return projects.filter((project) => {
			const completion = getProjectCompletionStats(project.lists ?? []);
			return (
				!completion.success ||
				completion.totalTasks === 0 ||
				completion.progress < 100
			);
		}).length;
	}, [initialStats.activeProjects, projects]);

	const canCreateTask = projects.some(
		(project) =>
			project.capabilities?.canMutateTasks === true &&
			(project.lists?.length ?? 0) > 0,
	);
	const canManageAnyMembers = projects.some(
		(project) => project.capabilities?.canManageMembers === true,
	);

	const actionableDeadlines = useMemo(
		() =>
			initialDeadlineTasks
				.filter(
					(task): task is CalendarTask & { dueDate: string } =>
						isDateOnly(task.dueDate) && !task.listIsCompleted,
				)
				.sort((first, second) => {
					const firstIsOverdue = isDateOnlyOverdue(first.dueDate);
					const secondIsOverdue = isDateOnlyOverdue(second.dueDate);
					if (firstIsOverdue !== secondIsOverdue) {
						return firstIsOverdue ? -1 : 1;
					}
					return first.dueDate.localeCompare(second.dueDate);
				})
				.slice(0, 4),
		[initialDeadlineTasks],
	);

	const stats = [
		{
			name: "Active Projects",
			value: activeProjectCount.toString(),
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
			icon: CheckCircle2,
		},
		{
			name: "Pending Tasks",
			value: initialStats.pendingTasks?.toString() ?? "—",
			icon: Clock3,
		},
	];

	const recentProjects = projects.slice(0, 3);

	return (
		<div className="mx-auto w-full min-w-0 max-w-400 space-y-6 sm:space-y-8">
			<header>
				<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					Dashboard
				</h1>
				<p className="mt-2 text-sm sm:text-base">
					<span className="font-medium text-foreground">
						{firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}
					</span>
					<span className="mt-0.5 block text-muted-foreground">
						Here&apos;s an overview of your projects and tasks.
					</span>
				</p>
			</header>

			{completionError && (
				<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
					{completionError}
				</div>
			)}

			<section aria-label="Workspace summary">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
					{stats.map((stat) => (
						<div
							key={stat.name}
							className="flex min-h-28 min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm sm:min-h-30 sm:p-5"
						>
							<div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<stat.icon aria-hidden="true" size={18} />
							</div>
							<dl className="mt-4 min-w-0">
								<dd className="text-2xl font-semibold leading-none text-foreground">
									{stat.value}
								</dd>
								<dt className="mt-1.5 text-xs font-medium leading-4 text-muted-foreground sm:text-sm">
									{stat.name}
								</dt>
							</dl>
						</div>
					))}
				</div>
			</section>

			<section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
				<h2 className="text-base font-semibold text-foreground sm:text-lg">
					Quick Actions
				</h2>
				<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<button
						type="button"
						onClick={openCreateProjectModal}
						className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					>
						<FolderPlus aria-hidden="true" size={18} />
						Create Project
					</button>
					{canCreateTask && (
						<button
							type="button"
							onClick={() => openCreateTaskModal({ source: "global" })}
							className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<ListPlus aria-hidden="true" size={18} />
							Create Task
						</button>
					)}
					{canManageAnyMembers && (
						<button
							type="button"
							onClick={openInviteMemberModal}
							className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<UserPlus aria-hidden="true" size={18} />
							Add Team Member
						</button>
					)}
				</div>
			</section>

			<section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
				<div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
					<div>
						<h2 className="text-base font-semibold text-foreground sm:text-lg">
							Upcoming &amp; Overdue
						</h2>
						<p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
							Tasks that need your attention next
						</p>
					</div>
					<Link
						href="/calendar"
						className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
					>
						View Calendar
						<ArrowRight aria-hidden="true" size={14} />
					</Link>
				</div>

				{deadlineError ? (
					<div className="px-4 py-6 text-center sm:px-5">
						<p className="text-sm font-medium text-destructive">
							Unable to load upcoming deadlines.
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Use Calendar to review your dated tasks.
						</p>
					</div>
				) : actionableDeadlines.length === 0 ? (
					<div className="flex items-center gap-3 px-4 py-6 sm:px-5">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
							<CalendarClock aria-hidden="true" size={19} />
						</div>
						<div>
							<p className="text-sm font-semibold text-foreground">
								No upcoming deadlines
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								You&apos;re all caught up for now.
							</p>
						</div>
					</div>
				) : (
					<div className="divide-y divide-border/70">
						{actionableDeadlines.map((task) => {
							const overdue = isDateOnlyOverdue(task.dueDate);
							const dateLabel = formatDateOnlyDeadlineLabel(task.dueDate);
							const statusColor = getDefaultColor(
								task.listName ?? "",
								task.listIsCompleted,
							);
							return (
								<button
									key={task.id}
									type="button"
									onClick={() => openPreviewTaskModal(task)}
									aria-label={`Preview ${task.title}, ${overdue ? "overdue" : "due"} ${dateLabel}`}
									className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
								>
									<span
										aria-hidden="true"
										className={`h-8 w-1 shrink-0 rounded-full ${statusColor.dot}`}
									/>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-semibold text-foreground">
											{task.title}
										</span>
										<span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
											<span className="truncate">
												{task.projectName || "No project"}
											</span>
											<span aria-hidden="true">·</span>
											<span className="truncate">
												{task.listName || "No status"}
											</span>
										</span>
									</span>
									<span className="shrink-0 text-right">
										{overdue && (
											<span className="block text-[10px] font-bold uppercase tracking-wide text-destructive">
												Overdue
											</span>
										)}
										<span
											className={`block text-xs font-medium ${overdue ? "text-destructive" : "text-muted-foreground"}`}
										>
											{dateLabel}
										</span>
									</span>
								</button>
							);
						})}
					</div>
				)}
			</section>

			<section>
				<div className="mb-5 flex items-center justify-between gap-4">
					<div>
						<h2 className="text-lg font-semibold text-foreground sm:text-xl">
							Recent Projects
						</h2>
						<p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
							Your newest accessible projects
						</p>
					</div>
					<Link
						href="/projects"
						className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
					>
						View all
						<ArrowRight aria-hidden="true" size={14} />
					</Link>
				</div>

				{isLoading && projects.length === 0 ? (
					<ProjectGridSkeleton count={3} label="Loading recent projects" />
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
					<div className="rounded-xl border border-dashed border-border px-5 py-8 text-center">
						<p className="text-sm font-semibold text-foreground">
							No projects yet
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Create your first project to start organizing work.
						</p>
						<button
							type="button"
							onClick={openCreateProjectModal}
							className="mt-4 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							Create your first project
						</button>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
						{recentProjects.map((project) => (
							<ProjectCard key={project.id} project={project} />
						))}
					</div>
				)}
			</section>
		</div>
	);
}
