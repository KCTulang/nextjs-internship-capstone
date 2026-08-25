import { KanbanBoardSkeleton } from "@/components/skeletons/kanban-board-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const avatarSkeletonIds = ["avatar-one", "avatar-two", "avatar-three"];

export default function ProjectLoading() {
	return (
		<div className="mx-auto max-w-450 space-y-5" role="status" aria-busy="true">
			<span className="sr-only">Loading project board</span>
			<div
				aria-hidden="true"
				className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
			>
				<div className="flex items-center gap-3 sm:gap-4">
					<Skeleton className="size-9 shrink-0 rounded-lg" />
					<div>
						<Skeleton className="h-8 w-48 sm:w-64" />
						<Skeleton className="mt-2 h-4 w-52 sm:w-72" />
					</div>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex -space-x-2">
						{avatarSkeletonIds.map((id) => (
							<Skeleton
								key={id}
								className="size-8 rounded-full border-2 border-background"
							/>
						))}
					</div>
					<Skeleton className="h-9 w-28 rounded-lg" />
				</div>
			</div>
			<div className="flex min-h-125 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-muted/30 p-2 sm:min-h-150 sm:p-3 lg:p-4">
				<KanbanBoardSkeleton />
			</div>
		</div>
	);
}
