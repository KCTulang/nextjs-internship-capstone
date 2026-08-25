"use client";

import { ChevronDown, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTasksStore } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";

export function BulkSelectionToolbar({
	projectId,
	canMutateTasks = true,
}: {
	projectId: string;
	canMutateTasks?: boolean;
}) {
	const {
		lists,
		selectedTaskIds,
		clearSelection,
		deleteSelectedTasks,
		moveSelectedTasks,
	} = useTasksStore();
	const { openConfirmModal } = useUIStore();
	const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);

	if (!canMutateTasks || selectedTaskIds.length === 0) {
		return null;
	}

	return (
		<div
			className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 bg-popover text-popover-foreground border border-border rounded-2xl shadow-xl w-[calc(100vw-24px)] max-w-fit animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-200"
			style={{ marginBottom: "env(safe-area-inset-bottom)" }}
		>
			<div className="flex items-center gap-2 pl-2 pr-1 shrink-0">
				<span className="bg-muted text-foreground w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium">
					{selectedTaskIds.length}
				</span>
				<span className="text-sm font-medium hidden min-[375px]:inline">
					selected
				</span>
			</div>

			<div className="flex flex-1 items-center justify-end gap-1 sm:gap-1.5">
				<div className="relative">
					<button
						type="button"
						onClick={() => setIsBulkMoveOpen(!isBulkMoveOpen)}
						className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors active:scale-[0.97]"
					>
						Move{" "}
						<ChevronDown
							size={16}
							className="text-muted-foreground opacity-70"
						/>
					</button>
					{isBulkMoveOpen && (
						<div className="absolute bottom-full left-0 mb-2 w-48 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden py-1">
							{lists.map((list) => (
								<button
									type="button"
									key={list.id}
									onClick={() => {
										moveSelectedTasks(list.id, projectId);
										setIsBulkMoveOpen(false);
									}}
									className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
								>
									{list.name}
								</button>
							))}
						</div>
					)}
				</div>

				<button
					type="button"
					onClick={() => {
						const count = selectedTaskIds.length;
						openConfirmModal({
							title: "Delete tasks?",
							description: `This will permanently delete ${count} selected task${count === 1 ? "" : "s"}. This action cannot be undone.`,
							confirmText: "Delete Tasks",
							onConfirm: async () => {
								await deleteSelectedTasks(projectId);
							},
						});
					}}
					className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors active:scale-[0.97]"
				>
					<Trash2 size={16} />
					<span>Delete</span>
				</button>

				<button
					type="button"
					onClick={() => {
						clearSelection();
						setIsBulkMoveOpen(false);
					}}
					aria-label="Clear selection"
					className="p-2 hover:bg-accent hover:text-accent-foreground rounded-xl transition-colors active:scale-[0.97] shrink-0 ml-1"
				>
					<X size={16} />
				</button>
			</div>
		</div>
	);
}
