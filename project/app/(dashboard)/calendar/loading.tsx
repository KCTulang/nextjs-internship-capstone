import { Skeleton } from "@/components/ui/skeleton";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const calendarCellIds = Array.from(
	{ length: 42 },
	(_, index) => `calendar-cell-${index + 1}`,
);
const eventCellIndexes = new Set([9, 17, 25, 31]);
const deadlineSkeletonIds = ["deadline-one", "deadline-two", "deadline-three"];

export default function CalendarLoading() {
	return (
		<div
			className="mx-auto w-full min-w-0 max-w-400 space-y-6"
			role="status"
			aria-busy="true"
		>
			<span className="sr-only">Loading calendar</span>
			<div aria-hidden="true">
				<Skeleton className="h-9 w-36" />
				<Skeleton className="mt-3 h-4 w-72 max-w-full" />
			</div>

			<div
				aria-hidden="true"
				className="h-[37rem] overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:h-[clamp(38rem,70vh,44rem)]"
			>
				<div className="grid gap-3 border-b border-border px-3 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-4">
					<div className="flex gap-1.5">
						<Skeleton className="size-8 rounded-lg" />
						<Skeleton className="h-8 w-16 rounded-lg" />
						<Skeleton className="size-8 rounded-lg" />
					</div>
					<Skeleton className="h-6 w-36 sm:justify-self-center" />
					<Skeleton className="h-9 w-full rounded-lg sm:w-28 sm:justify-self-end" />
				</div>
				<div className="grid grid-cols-7 border-b border-border bg-muted/20">
					{weekDays.map((day) => (
						<div
							key={day}
							className="border-r border-border/70 px-1 py-2.5 text-center last:border-r-0"
						>
							<Skeleton className="mx-auto h-2.5 w-7" />
						</div>
					))}
				</div>
				<div className="grid h-[calc(100%-8rem)] grid-cols-7 grid-rows-6">
					{calendarCellIds.map((cellId, index) => (
						<div
							key={cellId}
							className="border-r border-b border-border/60 p-1.5 last:border-r-0"
						>
							<Skeleton className="ml-auto size-5 rounded-full" />
							{eventCellIndexes.has(index) && (
								<Skeleton className="mt-2 h-4 w-full rounded" />
							)}
						</div>
					))}
				</div>
			</div>

			<div
				aria-hidden="true"
				className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
			>
				<div className="mb-4 flex items-end justify-between border-b border-border pb-4">
					<div className="space-y-2">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-3 w-56 max-w-full" />
					</div>
					<Skeleton className="h-6 w-8 rounded-full" />
				</div>
				<div className="space-y-3">
					{deadlineSkeletonIds.map((id) => (
						<div
							key={id}
							className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
						>
							<Skeleton className="size-5 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3.5 w-2/5" />
								<Skeleton className="h-3 w-1/3" />
							</div>
							<Skeleton className="h-3 w-14" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
