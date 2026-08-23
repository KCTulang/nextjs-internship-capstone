"use client";

import {
	Calendar,
	CheckSquare,
	ExternalLink,
	Flag,
	Folder,
	Tag,
	User,
	X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CalendarTask } from "@/components/calendar/calendar-grid";
import { useUIStore } from "@/stores/ui-store";
import { priorityClass } from "@/utils";
import { formatDateOnly } from "@/utils/date-only";

export function CalendarTaskPreviewModal() {
	const { isPreviewTaskModalOpen, closePreviewTaskModal, selectedPreviewTask } =
		useUIStore();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	if (!isPreviewTaskModalOpen || !selectedPreviewTask) return null;

	const task = selectedPreviewTask as CalendarTask;

	const handleOpenFull = () => {
		closePreviewTaskModal();
		if (task.projectSlug) {
			router.push(`/projects/${task.projectSlug}?taskId=${task.id}`, {
				scroll: false,
			});
		} else {
			const params = new URLSearchParams(searchParams.toString());
			params.set("taskId", task.id);
			router.push(`${pathname}?${params.toString()}`, { scroll: false });
		}
	};

	const pClass = priorityClass(task.priority);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
			<div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
				<div className="flex items-start justify-between p-5 border-b border-border/50 shrink-0">
					<h3 className="text-xl font-bold text-foreground leading-tight">
						{task.title}
					</h3>
					<button
						type="button"
						onClick={closePreviewTaskModal}
						className="p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors ml-4 shrink-0"
					>
						<X size={20} />
					</button>
				</div>

				<div className="p-5 space-y-5 overflow-y-auto min-h-0">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Folder size={16} />
						<span className="font-medium text-foreground">
							{task.projectName || "No Project"}
						</span>
						<span className="mx-1">•</span>
						<CheckSquare size={16} />
						<span className="font-medium text-foreground capitalize">
							{task.listName || "Todo"}
						</span>
					</div>

					{task.description && (
						<div className="text-sm text-foreground/90 bg-muted/30 p-4 rounded-xl border border-border/50 whitespace-pre-wrap break-words">
							{task.description}
						</div>
					)}

					<div className="grid grid-cols-2 gap-5 mt-4">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
								<User size={14} className="text-primary" />
							</div>
							<div className="flex flex-col min-w-0">
								<span className="text-xs text-muted-foreground">Assignee</span>
								<span className="text-sm font-medium text-foreground truncate">
									{task.assignee?.name || task.assignee?.email || "Unassigned"}
								</span>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
								<Calendar size={14} className="text-primary" />
							</div>
							<div className="flex flex-col min-w-0">
								<span className="text-xs text-muted-foreground">Due Date</span>
								<span className="text-sm font-medium text-foreground truncate">
									{task.dueDate
										? formatDateOnly(task.dueDate, {
												month: "short",
												day: "numeric",
												year: "numeric",
											})
										: "No Date"}
								</span>
							</div>
						</div>

						<div className="flex items-center gap-3">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${pClass}`}
							>
								<Flag size={14} className="currentColor" />
							</div>
							<div className="flex flex-col min-w-0">
								<span className="text-xs text-muted-foreground">Priority</span>
								<span className="text-sm font-medium text-foreground capitalize truncate">
									{task.priority || "Medium"}
								</span>
							</div>
						</div>

						{task.labels && task.labels.length > 0 && (
							<div className="flex items-center gap-3 col-span-2">
								<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
									<Tag size={14} className="text-primary" />
								</div>
								<div className="flex flex-col min-w-0">
									<span className="text-xs text-muted-foreground">Labels</span>
									<div className="flex flex-wrap gap-1.5 mt-0.5">
										{task.labels.map((lbl: string) => (
											<span
												key={lbl}
												className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium text-foreground whitespace-nowrap"
											>
												{lbl}
											</span>
										))}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="p-4 border-t border-border/50 bg-muted/10 flex justify-between items-center shrink-0">
					<button
						type="button"
						onClick={closePreviewTaskModal}
						className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
					>
						Close
					</button>
					<button
						type="button"
						onClick={handleOpenFull}
						className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-all shadow-sm"
					>
						<span>Open Task Details</span>
						<ExternalLink size={16} />
					</button>
				</div>
			</div>
		</div>
	);
}
