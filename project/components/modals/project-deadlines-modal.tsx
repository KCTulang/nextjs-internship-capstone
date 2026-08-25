"use client";

import { ArrowRight, CalendarDays, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { List, Task } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";
import { formatDateOnly, isDateOnly, toDateOnly } from "@/utils/date-only";

interface ProjectDeadlinesModalProps {
	projectName: string;
	lists: List[];
	isLoading?: boolean;
	error?: string | null;
	onRetry?: () => void;
}

interface DeadlineTask {
	task: Task;
	listName: string;
	dueDate: string;
}

const deadlineSkeletonIds = [
	"deadline-overdue",
	"deadline-week",
	"deadline-upcoming",
];

function addDays(date: Date, days: number) {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

export function ProjectDeadlinesModal({
	projectName,
	lists,
	isLoading = false,
	error = null,
	onRetry,
}: ProjectDeadlinesModalProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { isProjectDeadlinesModalOpen, closeProjectDeadlinesModal } =
		useUIStore();

	const groups = useMemo(() => {
		const today = toDateOnly(new Date());
		const sevenDaysFromToday = toDateOnly(addDays(new Date(), 7));
		const activeTasks: DeadlineTask[] = lists
			.filter((list) => !list.isCompleted)
			.flatMap((list) =>
				list.tasks
					.filter((task): task is Task & { dueDate: string } =>
						isDateOnly(task.dueDate),
					)
					.map((task) => ({
						task,
						listName: list.name,
						dueDate: task.dueDate,
					})),
			)
			.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

		return [
			{
				label: "Overdue",
				tasks: activeTasks.filter((item) => item.dueDate < today),
			},
			{
				label: "Next 7 Days",
				tasks: activeTasks.filter(
					(item) => item.dueDate >= today && item.dueDate <= sevenDaysFromToday,
				),
			},
			{
				label: "Upcoming",
				tasks: activeTasks.filter((item) => item.dueDate > sevenDaysFromToday),
			},
		].filter((group) => group.tasks.length > 0);
	}, [lists]);

	if (!isProjectDeadlinesModalOpen) return null;

	const openTask = (taskId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("taskId", taskId);
		closeProjectDeadlinesModal();
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="project-deadlines-title"
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
			onClick={(event) =>
				event.target === event.currentTarget && closeProjectDeadlinesModal()
			}
			onKeyDown={(event) =>
				event.key === "Escape" && closeProjectDeadlinesModal()
			}
		>
			<div className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
				<header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
					<div>
						<h2
							id="project-deadlines-title"
							className="text-lg font-semibold text-foreground"
						>
							Project Deadlines
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">{projectName}</p>
					</div>
					<button
						type="button"
						onClick={closeProjectDeadlinesModal}
						aria-label="Close deadlines"
						className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<X size={18} />
					</button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
					{isLoading && lists.length === 0 ? (
						<div role="status" aria-busy="true" className="space-y-5">
							<span className="sr-only">Loading project deadlines</span>
							{deadlineSkeletonIds.map((id) => (
								<div key={id} aria-hidden="true" className="space-y-2">
									<Skeleton className="h-3 w-20" />
									<div className="rounded-xl border border-border/60 px-3 py-3">
										<div className="flex items-center gap-3">
											<div className="flex-1 space-y-2">
												<Skeleton className="h-3.5 w-3/5" />
												<Skeleton className="h-3 w-2/5" />
											</div>
											<Skeleton className="h-3 w-14" />
										</div>
									</div>
								</div>
							))}
						</div>
					) : error ? (
						<div className="flex flex-col items-center py-10 text-center">
							<p className="text-sm font-semibold text-destructive">
								Unable to load deadlines
							</p>
							<p className="mt-1 text-xs text-destructive/80">{error}</p>
							{onRetry && (
								<button
									type="button"
									onClick={onRetry}
									className="mt-4 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									Try again
								</button>
							)}
						</div>
					) : groups.length === 0 ? (
						<div className="flex flex-col items-center py-10 text-center">
							<div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
								<CalendarDays size={19} />
							</div>
							<h3 className="text-sm font-semibold text-foreground">
								No deadlines yet
							</h3>
							<p className="mt-1 text-xs text-muted-foreground">
								Tasks with due dates will appear here.
							</p>
						</div>
					) : (
						<div className="space-y-6">
							{groups.map((group) => (
								<section key={group.label}>
									<h3
										className={`mb-2 text-xs font-semibold uppercase tracking-wide ${group.label === "Overdue" ? "text-destructive" : "text-muted-foreground"}`}
									>
										{group.label}
									</h3>
									<div className="space-y-1.5">
										{group.tasks.map(({ task, listName, dueDate }) => (
											<button
												key={task.id}
												type="button"
												onClick={() => openTask(task.id)}
												className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium text-foreground">
														{task.title}
													</p>
													<p className="mt-0.5 truncate text-xs text-muted-foreground">
														{projectName} · {listName}
													</p>
												</div>
												<time
													dateTime={dueDate}
													className={`shrink-0 text-xs font-medium ${group.label === "Overdue" ? "text-destructive" : "text-muted-foreground"}`}
												>
													{formatDateOnly(dueDate, {
														month: "short",
														day: "numeric",
													})}
												</time>
											</button>
										))}
									</div>
								</section>
							))}
						</div>
					)}
				</div>

				<footer className="flex justify-end border-t border-border bg-muted/20 px-5 py-3 sm:px-6">
					<button
						type="button"
						onClick={() => {
							closeProjectDeadlinesModal();
							router.push("/calendar");
						}}
						className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						View in Calendar <ArrowRight size={15} />
					</button>
				</footer>
			</div>
		</div>
	);
}
