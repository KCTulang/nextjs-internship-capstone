import { ProjectGridSkeleton } from "@/components/skeletons/project-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const metricSkeletonIds = [
	"active-projects",
	"team-members",
	"completed-tasks",
	"pending-tasks",
];

export default function DashboardLoading() {
	return (
		<div className="space-y-8" role="status" aria-busy="true">
			<span className="sr-only">Loading dashboard</span>
			<div aria-hidden="true">
				<Skeleton className="h-9 w-44" />
				<Skeleton className="mt-3 h-4 w-full max-w-md" />
			</div>

			<div
				aria-hidden="true"
				className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
			>
				{metricSkeletonIds.map((id) => (
					<div
						key={id}
						className="flex min-h-30 items-center rounded-lg border border-border bg-card p-6"
					>
						<Skeleton className="size-8 shrink-0 rounded-lg" />
						<div className="ml-5 flex-1 space-y-2">
							<Skeleton className="h-3.5 w-24" />
							<Skeleton className="h-7 w-14" />
						</div>
					</div>
				))}
			</div>

			<div
				aria-hidden="true"
				className="rounded-lg border border-border bg-card p-6"
			>
				<Skeleton className="mb-4 h-5 w-28" />
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Skeleton className="h-11 w-full rounded-lg" />
					<Skeleton className="h-11 w-full rounded-lg" />
				</div>
			</div>

			<div>
				<Skeleton className="mb-6 h-6 w-32" />
				<ProjectGridSkeleton count={3} label="Loading dashboard projects" />
			</div>
		</div>
	);
}
