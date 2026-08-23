"use client";

import { type RefObject, useEffect, useRef } from "react";
import { cn } from "@/utils";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
	title?: string;
	labelledBy?: string;
	initialFocusRef?: RefObject<HTMLElement | null>;
}

export function Modal({
	isOpen,
	onClose,
	children,
	className,
	title,
	labelledBy,
	initialFocusRef,
}: ModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isOpen) return;
		const previouslyFocused = document.activeElement as HTMLElement | null;
		const focusableSelector =
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const focusInitial = () => {
			const target =
				initialFocusRef?.current ||
				modalRef.current?.querySelector<HTMLElement>(focusableSelector);
			target?.focus();
		};
		const frame = requestAnimationFrame(focusInitial);
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
				return;
			}
			if (e.key === "Tab" && modalRef.current) {
				const focusable = Array.from(
					modalRef.current.querySelectorAll<HTMLElement>(focusableSelector),
				);
				if (focusable.length === 0) {
					e.preventDefault();
					return;
				}
				const first = focusable[0];
				const last = focusable[focusable.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus();
				} else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("keydown", handleKeyDown);
			previouslyFocused?.focus();
		};
	}, [initialFocusRef, isOpen, onClose]);

	useEffect(() => {
		if (!isOpen) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={labelledBy}
			aria-label={labelledBy ? undefined : title || "Dialog window"}
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
