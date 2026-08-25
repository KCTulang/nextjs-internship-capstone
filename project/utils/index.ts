import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const PRIORITY_CLASSES: Record<string, string> = {
	low: "bg-muted/50 text-muted-foreground border-border",
	medium: "bg-primary/10 text-primary border-primary/20",
	high: "bg-priority-high/10 text-priority-high border-priority-high/20",
	urgent: "bg-destructive/10 text-destructive border-destructive/20",
};

export const PRIORITY_ACCENT_CLASSES: Record<string, string> = {
	low: "bg-muted-foreground",
	medium: "bg-primary",
	high: "bg-priority-high",
	urgent: "bg-destructive",
};

export function priorityClass(priority?: string | null): string {
	const key = (priority ?? "medium").toLowerCase();
	return PRIORITY_CLASSES[key] ?? PRIORITY_CLASSES.medium;
}

export function priorityAccentClass(priority?: string | null): string {
	const key = (priority ?? "medium").toLowerCase();
	return PRIORITY_ACCENT_CLASSES[key] ?? PRIORITY_ACCENT_CLASSES.medium;
}

export function formatFocusDuration(seconds: number): string {
	if (seconds <= 0) return "0s";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	const parts = [];
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	if (s > 0 || (h === 0 && m === 0)) parts.push(`${s}s`);

	return parts.join(" ");
}
