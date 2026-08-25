import { ProjectGridSkeleton } from "@/components/skeletons/project-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
	return (
		<div className="space-y-6" role="status" aria-busy="true">
			<span className="sr-only">Loading projects</span>
			<div
				aria-hidden="true"
				className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
			>
				<div>
					<Skeleton className="h-9 w-36" />
					<Skeleton className="mt-2 h-4 w-44" />
				</div>
				<Skeleton className="h-10 w-32 rounded-lg" />
			</div>
			<Skeleton className="h-9 w-56 rounded-lg" />
			<div aria-hidden="true" className="flex flex-col gap-3 sm:flex-row">
				<Skeleton className="h-10 flex-1 rounded-lg" />
				<div className="flex gap-2">
					<Skeleton className="h-10 w-28 rounded-lg" />
					<Skeleton className="h-10 w-24 rounded-lg" />
					<Skeleton className="h-10 w-20 rounded-lg" />
				</div>
			</div>
			<ProjectGridSkeleton />
		</div>
	);
}
