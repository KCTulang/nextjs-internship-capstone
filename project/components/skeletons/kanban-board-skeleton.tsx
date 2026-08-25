import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";

const taskSkeletonIds = ["task-one", "task-two", "task-three"];

function TaskSkeleton({ compact = false }: { compact?: boolean }) {
	return (
		<div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
			<Skeleton className="h-3.5 w-3/4" />
			{!compact && (
				<>
					<Skeleton className="mt-2.5 h-3 w-full" />
					<Skeleton className="mt-1.5 h-3 w-2/3" />
					<div className="mt-4 flex items-center justify-between">
						<Skeleton className="h-5 w-16 rounded-full" />
						<Skeleton className="size-6 rounded-full" />
					</div>
				</>
			)}
		</div>
	);
}

function ColumnSkeleton({ taskCount }: { taskCount: number }) {
	return (
		<div className="w-68.75 shrink-0 self-start overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm sm:w-75">
			<Skeleton className="h-1 w-full rounded-none" />
			<div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
				<Skeleton className="size-2 rounded-full" />
				<Skeleton className="h-3.5 w-24" />
				<Skeleton className="ml-auto h-5 w-7 rounded-full" />
			</div>
			<div className="space-y-2.5 p-3">
				{taskSkeletonIds.slice(0, taskCount).map((id) => (
					<TaskSkeleton key={id} />
				))}
			</div>
		</div>
	);
}

export function KanbanBoardSkeleton({ className }: { className?: string }) {
	return (
		<div
			role="status"
			aria-busy="true"
			className={cn("w-full min-w-0", className)}
		>
			<span className="sr-only">Loading Kanban board</span>
			<div
				aria-hidden="true"
				className="hidden h-[calc(100vh-180px)] min-h-125 items-start gap-4 overflow-hidden pb-4 md:flex sm:h-[calc(100vh-160px)] sm:gap-5 lg:h-[calc(100vh-140px)]"
			>
				<ColumnSkeleton taskCount={2} />
				<ColumnSkeleton taskCount={1} />
				<ColumnSkeleton taskCount={2} />
			</div>
			<div
				aria-hidden="true"
				className="flex h-[calc(100vh-140px)] min-h-125 flex-col overflow-hidden bg-background md:hidden"
			>
				<div className="flex gap-2 overflow-hidden border-b border-border bg-card px-4 py-3">
					<Skeleton className="h-8 w-24 shrink-0 rounded-full" />
					<Skeleton className="h-8 w-28 shrink-0 rounded-full" />
					<Skeleton className="h-8 w-20 shrink-0 rounded-full" />
				</div>
				<div className="flex-1 bg-background">
					<div className="border-b border-border bg-card px-4 py-3">
						<div className="flex items-center gap-2">
							<Skeleton className="size-2 rounded-full" />
							<Skeleton className="h-3.5 w-24" />
							<Skeleton className="ml-auto h-5 w-7 rounded-full" />
						</div>
					</div>
					<div className="space-y-3 p-3">
						<TaskSkeleton />
						<TaskSkeleton />
					</div>
				</div>
			</div>
		</div>
	);
}
