import { Skeleton } from "@/components/ui/skeleton";

const metricSkeletonIds = ["tasks", "completion", "projects", "focus"];
const chartBarSkeletons = [
	{ id: "bar-one", height: 45 },
	{ id: "bar-two", height: 72 },
	{ id: "bar-three", height: 58 },
	{ id: "bar-four", height: 86 },
	{ id: "bar-five", height: 64 },
	{ id: "bar-six", height: 76 },
];
const statusRowSkeletonIds = [
	"status-one",
	"status-two",
	"status-three",
	"status-four",
	"status-five",
];
const lowerSectionSkeletonIds = ["workload", "deadlines", "focus-summary"];
const lowerRowSkeletonIds = ["row-one", "row-two", "row-three", "row-four"];

export default function AnalyticsLoading() {
	return (
		<div className="mx-auto max-w-400 space-y-6" role="status" aria-busy="true">
			<span className="sr-only">Loading analytics</span>
			<div
				aria-hidden="true"
				className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
			>
				<div>
					<Skeleton className="h-9 w-40" />
					<Skeleton className="mt-3 h-4 w-72 max-w-full" />
				</div>
				<Skeleton className="h-10 w-40 rounded-lg" />
			</div>

			<div
				aria-hidden="true"
				className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1440px]:grid-cols-4"
			>
				{metricSkeletonIds.map((id) => (
					<div
						key={id}
						className="flex min-h-36 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
					>
						<div className="flex items-start justify-between gap-4">
							<div className="space-y-3">
								<Skeleton className="h-3 w-24" />
								<Skeleton className="h-8 w-20" />
							</div>
							<Skeleton className="size-10 rounded-xl" />
						</div>
						<Skeleton className="mt-auto h-3 w-4/5" />
					</div>
				))}
			</div>

			<div
				aria-hidden="true"
				className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]"
			>
				<div className="min-h-82 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
					<Skeleton className="h-5 w-44" />
					<Skeleton className="mt-2 h-3 w-64 max-w-full" />
					<div className="mt-8 flex h-52 items-end gap-3 border-b border-l border-border px-4 pb-0">
						{chartBarSkeletons.map((bar) => (
							<Skeleton
								key={bar.id}
								className="flex-1 rounded-b-none"
								style={{ height: `${bar.height}%` }}
							/>
						))}
					</div>
				</div>
				<div className="min-h-82 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
					<Skeleton className="h-5 w-32" />
					<Skeleton className="mt-2 h-3 w-48" />
					<Skeleton className="mt-8 h-3 w-full rounded-full" />
					<div className="mt-6 space-y-4">
						{statusRowSkeletonIds.map((id) => (
							<div key={id} className="flex items-center gap-3">
								<Skeleton className="size-2 rounded-full" />
								<Skeleton className="h-3 flex-1" />
								<Skeleton className="h-3 w-10" />
							</div>
						))}
					</div>
				</div>
			</div>

			<div
				aria-hidden="true"
				className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 min-[1440px]:grid-cols-3"
			>
				{lowerSectionSkeletonIds.map((sectionId) => (
					<div
						key={sectionId}
						className="min-h-64 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
					>
						<Skeleton className="h-5 w-36" />
						<Skeleton className="mt-2 h-3 w-52 max-w-full" />
						<div className="mt-7 space-y-4">
							{lowerRowSkeletonIds.map((rowId) => (
								<div
									key={`${sectionId}-${rowId}`}
									className="flex items-center gap-3"
								>
									<Skeleton className="size-7 rounded-full" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-3 w-2/3" />
										<Skeleton className="h-1.5 w-full rounded-full" />
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
