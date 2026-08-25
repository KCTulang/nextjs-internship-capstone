import { Skeleton } from "@/components/ui/skeleton";

const memberSkeletonIds = [
	"member-one",
	"member-two",
	"member-three",
	"member-four",
	"member-five",
	"member-six",
];

export default function TeamLoading() {
	return (
		<div className="space-y-6" role="status" aria-busy="true">
			<span className="sr-only">Loading team</span>
			<div
				aria-hidden="true"
				className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
			>
				<div>
					<Skeleton className="h-8 w-28" />
					<Skeleton className="mt-2 h-4 w-64 max-w-full" />
				</div>
				<Skeleton className="h-9 w-32 rounded-lg" />
			</div>
			<div
				aria-hidden="true"
				className="flex gap-3 border-b border-border pb-2"
			>
				<Skeleton className="h-8 w-28" />
				<Skeleton className="h-8 w-36" />
				<Skeleton className="h-8 w-32" />
			</div>
			<div aria-hidden="true" className="flex flex-col gap-2 sm:flex-row">
				<Skeleton className="h-10 flex-1 rounded-lg" />
				<Skeleton className="h-10 w-full rounded-lg sm:w-32" />
				<Skeleton className="h-10 w-full rounded-lg sm:w-32" />
			</div>
			<div
				aria-hidden="true"
				className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
			>
				{memberSkeletonIds.map((id) => (
					<div
						key={id}
						className="flex min-h-44 flex-col rounded-xl border border-border bg-card p-5"
					>
						<div className="flex items-center gap-3">
							<Skeleton className="size-9 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3.5 w-2/3" />
								<Skeleton className="h-3 w-4/5" />
							</div>
						</div>
						<div className="mt-5 flex items-center gap-2">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-5 w-16 rounded" />
						</div>
						<div className="mt-auto flex justify-between border-t border-border/50 pt-3">
							<Skeleton className="h-3 w-14" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
