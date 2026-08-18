"use client";

import { useEffect } from "react";
import { useTasksStore } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";

export function useCalendarShortcuts(taskIds: string[], onDelete: () => void) {
	const {
		selectedTaskIds,
		toggleTaskSelection,
		setSelectedTaskIds,
		clearSelection,
	} = useTasksStore();
	const { isConfirmModalOpen } = useUIStore();

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const activeTag = document.activeElement?.tagName.toLowerCase();
			if (
				activeTag === "input" ||
				activeTag === "textarea" ||
				activeTag === "select"
			) {
				return;
			}
			if ((document.activeElement as HTMLElement)?.isContentEditable) {
				return;
			}
			if (isConfirmModalOpen) {
				return;
			}
			if (e.key === "Escape") {
				clearSelection();
				return;
			}

			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
				e.preventDefault();
				setSelectedTaskIds(taskIds);
				return;
			}

			if (
				(e.key === "Delete" || e.key === "Backspace") &&
				selectedTaskIds.length > 0
			) {
				e.preventDefault();
				onDelete();
				return;
			}

			if (e.key === "x") {
				const activeId = document.activeElement?.getAttribute("data-task-id");
				if (activeId && taskIds.includes(activeId)) {
					e.preventDefault();
					toggleTaskSelection(activeId);
					return;
				}
			}

			if (e.key === "j" || e.key === "k") {
				const focusableElements = Array.from(
					document.querySelectorAll("[data-task-id]"),
				);
				if (focusableElements.length === 0) return;

				const activeElement = document.activeElement;
				const currentIndex = activeElement
					? focusableElements.indexOf(activeElement as Element)
					: -1;
				e.preventDefault();

				if (currentIndex === -1) {
					(focusableElements[0] as HTMLElement).focus();
				} else {
					const nextIndex =
						e.key === "j"
							? Math.min(currentIndex + 1, focusableElements.length - 1)
							: Math.max(currentIndex - 1, 0);
					(focusableElements[nextIndex] as HTMLElement).focus();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		taskIds,
		selectedTaskIds,
		toggleTaskSelection,
		setSelectedTaskIds,
		clearSelection,
		isConfirmModalOpen,
		onDelete,
	]);
}
