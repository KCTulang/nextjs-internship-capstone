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
		<div
			className="mx-auto w-full min-w-0 max-w-400 space-y-6 sm:space-y-8"
			role="status"
			aria-busy="true"
		>
			<span className="sr-only">Loading dashboard</span>
			<div aria-hidden="true">
				<Skeleton className="h-8 w-36 sm:h-9" />
				<Skeleton className="mt-3 h-4 w-48" />
				<Skeleton className="mt-2 h-4 w-full max-w-sm" />
			</div>

			<div
				aria-hidden="true"
				className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5"
			>
				{metricSkeletonIds.map((id) => (
					<div
						key={id}
						className="flex min-h-28 flex-col justify-between rounded-xl border border-border bg-card p-4 sm:min-h-30 sm:p-5"
					>
						<Skeleton className="size-9 rounded-lg" />
						<div className="mt-4 space-y-2">
							<Skeleton className="h-6 w-12" />
							<Skeleton className="h-3.5 w-4/5 max-w-24" />
						</div>
					</div>
				))}
			</div>

			<div
				aria-hidden="true"
				className="rounded-lg border border-border bg-card p-6"
			>
				<Skeleton className="mb-4 h-5 w-28" />
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<Skeleton className="h-11 w-full rounded-lg" />
					<Skeleton className="h-11 w-full rounded-lg" />
					<Skeleton className="h-11 w-full rounded-lg" />
				</div>
			</div>

			<div
				aria-hidden="true"
				className="overflow-hidden rounded-xl border border-border bg-card"
			>
				<div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
					<div className="space-y-2">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-3 w-52" />
					</div>
					<Skeleton className="h-4 w-20" />
				</div>
				<div className="divide-y divide-border/70">
					{["deadline-one", "deadline-two", "deadline-three"].map((id) => (
						<div key={id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
							<Skeleton className="h-8 w-1 shrink-0 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3.5 w-2/5" />
								<Skeleton className="h-3 w-1/3" />
							</div>
							<Skeleton className="h-3.5 w-16" />
						</div>
					))}
				</div>
			</div>

			<div>
				<div aria-hidden="true" className="mb-5 flex justify-between gap-4">
					<div className="space-y-2">
						<Skeleton className="h-6 w-36" />
						<Skeleton className="h-3 w-44" />
					</div>
					<Skeleton className="h-4 w-14" />
				</div>
				<ProjectGridSkeleton
					count={3}
					label="Loading recent projects"
					className="lg:grid-cols-2 xl:grid-cols-3"
				/>
			</div>
		</div>
	);
}
