import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils";

const projectSkeletonIds = [
	"project-one",
	"project-two",
	"project-three",
	"project-four",
	"project-five",
	"project-six",
];

export function ProjectCardSkeleton() {
	return (
		<div className="h-52 rounded-xl border border-border bg-card p-5">
			<div className="mb-4 flex items-start gap-3">
				<Skeleton className="size-10 shrink-0 rounded-lg" />
				<div className="flex-1 space-y-2 pt-0.5">
					<Skeleton className="h-4 w-3/5" />
					<Skeleton className="h-3 w-2/5" />
				</div>
			</div>
			<div className="space-y-2">
				<Skeleton className="h-3 w-full" />
				<Skeleton className="h-3 w-4/5" />
			</div>
			<div className="mt-5 space-y-2">
				<div className="flex justify-between gap-4">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-3 w-8" />
				</div>
				<Skeleton className="h-1.5 w-full rounded-full" />
			</div>
			<div className="mt-4 flex gap-4 border-t border-border pt-4">
				<Skeleton className="h-3 w-10" />
				<Skeleton className="h-3 w-20" />
			</div>
		</div>
	);
}

export function ProjectGridSkeleton({
	count = 6,
	className,
	label = "Loading projects",
}: {
	count?: number;
	className?: string;
	label?: string;
}) {
	return (
		<div role="status" aria-busy="true">
			<span className="sr-only">{label}</span>
			<div
				aria-hidden="true"
				className={cn(
					"grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3",
					className,
				)}
			>
				{projectSkeletonIds.slice(0, count).map((id) => (
					<ProjectCardSkeleton key={id} />
				))}
			</div>
		</div>
	);
}
