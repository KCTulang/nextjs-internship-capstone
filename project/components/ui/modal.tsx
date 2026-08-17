"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
	title?: string;
}

export function Modal({
	isOpen,
	onClose,
	children,
	className,
	title,
}: ModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={title || "Dialog window"}
			className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 text-left"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) {
					onClose();
				}
			}}
		>
			<div
				ref={modalRef}
				className={cn(
					"bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200",
					className,
				)}
			>
				{children}
			</div>
		</div>
	);
}
