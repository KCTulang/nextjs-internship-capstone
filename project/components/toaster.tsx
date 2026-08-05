"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect } from "react";
import type { Toast } from "@/stores/ui-store";
import { useUIStore } from "@/stores/ui-store";

export function Toaster() {
	const { toasts, removeToast } = useUIStore();

	return (
		<div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none sm:top-6 sm:right-6">
			<AnimatePresence>
				{toasts.map((toast) => (
					<ToastItem
						key={toast.id}
						toast={toast}
						onDismiss={() => removeToast(toast.id)}
					/>
				))}
			</AnimatePresence>
		</div>
	);
}

function ToastItem({
	toast,
	onDismiss,
}: {
	toast: Toast;
	onDismiss: () => void;
}) {
	// Auto-dismiss after 3s
	useEffect(() => {
		const timer = setTimeout(onDismiss, 3000);
		return () => clearTimeout(timer);
	}, [onDismiss]);

	const icons = {
		success: <CheckCircle2 className="text-green-500" size={18} />,
		error: <AlertCircle className="text-destructive" size={18} />,
		info: <Info className="text-primary" size={18} />,
		warning: <AlertCircle className="text-amber-500" size={18} />,
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: -20, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			className="pointer-events-auto bg-card border border-border shadow-lg rounded-xl p-3.5 flex items-start gap-3 min-w-[280px] max-w-[380px]"
		>
			<div className="mt-0.5 shrink-0">
				{icons[toast.type as keyof typeof icons] || icons.info}
			</div>
			<div className="flex-1 text-sm font-medium text-foreground pt-0.5 leading-snug pr-2">
				{toast.message}
			</div>
			<button
				type="button"
				onClick={onDismiss}
				className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 -m-1 rounded-md hover:bg-muted"
				aria-label="Dismiss"
			>
				<X size={14} />
			</button>
		</motion.div>
	);
}
