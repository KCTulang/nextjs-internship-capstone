"use client";

import { useUIStore } from "@/stores/ui-store";

export function ConfirmModal() {
	const { isConfirmModalOpen, confirmModalProps, closeConfirmModal } =
		useUIStore();

	if (!isConfirmModalOpen || !confirmModalProps) return null;

	const handleConfirm = async () => {
		await confirmModalProps.onConfirm();
		closeConfirmModal();
	};

	return (
		<div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
			<div className="bg-card w-full max-w-md rounded-lg shadow-lg border border-border p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
				<div>
					<h2 className="text-lg font-semibold text-foreground">
						{confirmModalProps.title}
					</h2>
					<p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
						{confirmModalProps.description}
					</p>
				</div>
				<div className="flex justify-end gap-3 mt-2">
					<button
						type="button"
						onClick={closeConfirmModal}
						className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
					>
						{confirmModalProps.cancelText || "Cancel"}
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-md transition-colors"
					>
						{confirmModalProps.confirmText || "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
}
