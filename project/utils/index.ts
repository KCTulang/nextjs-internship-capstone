import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const PRIORITY_CLASSES: Record<string, string> = {
	low: "bg-muted/50 text-muted-foreground border-border",
	medium: "bg-secondary text-secondary-foreground border-border",
	high: "bg-primary/10 text-primary border-primary/20",
	urgent: "bg-destructive/10 text-destructive border-destructive/20",
};

export function priorityClass(priority?: string | null): string {
	const key = (priority ?? "medium").toLowerCase();
	return PRIORITY_CLASSES[key] ?? PRIORITY_CLASSES.medium;
}
