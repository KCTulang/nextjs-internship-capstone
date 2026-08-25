"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useUIStore } from "@/stores/ui-store";

export function ConfirmModal() {
	const { isConfirmModalOpen, confirmModalProps, closeConfirmModal } =
		useUIStore();
	const [isLoading, setIsLoading] = useState(false);

	if (!isConfirmModalOpen || !confirmModalProps) return null;

	const handleConfirm = async () => {
		try {
			setIsLoading(true);
			await confirmModalProps.onConfirm();
			closeConfirmModal();
		} catch (error) {
			console.error("Confirmation action failed:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal
			isOpen={isConfirmModalOpen}
			onClose={!isLoading ? closeConfirmModal : () => {}}
			title={confirmModalProps.title}
			className="max-w-lg"
		>
			<div className="flex flex-col gap-5 sm:gap-6">
				<div className="flex gap-3 sm:gap-4 items-start">
					<div className="shrink-0 mt-0.5 flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 text-destructive">
						<AlertTriangle className="w-5 h-5" />
					</div>
					<div className="flex-1 space-y-1.5">
						<h2 className="text-lg font-semibold text-foreground tracking-tight leading-none mt-1.5 sm:mt-2">
							{confirmModalProps.title}
						</h2>
						<p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
							{confirmModalProps.description}
						</p>
					</div>
				</div>

				<div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-2 sm:mt-0">
					<button
						type="button"
						onClick={closeConfirmModal}
						disabled={isLoading}
						className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-foreground bg-transparent border border-border dark:border-foreground/20 hover:bg-muted dark:hover:bg-foreground/10 rounded-lg transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
					>
						{confirmModalProps.cancelText || "Cancel"}
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={isLoading}
						className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 shadow-sm rounded-lg transition-all duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70 flex items-center justify-center gap-2"
					>
						{isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
						{confirmModalProps.confirmText || "Confirm"}
					</button>
				</div>
			</div>
		</Modal>
	);
}
