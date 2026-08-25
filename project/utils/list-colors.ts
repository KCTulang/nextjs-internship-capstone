export const COLUMN_COLORS = [
	{
		name: "slate",
		accent: "#64748b",
		bg: "bg-slate-500/10",
		text: "text-slate-500 dark:text-slate-400",
		border: "border-slate-500/20",
		dot: "bg-slate-400",
	},
	{
		name: "blue",
		accent: "#3b82f6",
		bg: "bg-blue-500/10",
		text: "text-blue-500 dark:text-blue-400",
		border: "border-blue-500/20",
		dot: "bg-blue-400",
	},
	{
		name: "violet",
		accent: "#8b5cf6",
		bg: "bg-violet-500/10",
		text: "text-violet-500 dark:text-violet-400",
		border: "border-violet-500/20",
		dot: "bg-violet-400",
	},
	{
		name: "amber",
		accent: "#f59e0b",
		bg: "bg-amber-500/10",
		text: "text-amber-600 dark:text-amber-400",
		border: "border-amber-500/20",
		dot: "bg-amber-400",
	},
	{
		name: "emerald",
		accent: "#10b981",
		bg: "bg-emerald-500/10",
		text: "text-emerald-600 dark:text-emerald-400",
		border: "border-emerald-500/20",
		dot: "bg-emerald-400",
	},
	{
		name: "rose",
		accent: "#f43f5e",
		bg: "bg-rose-500/10",
		text: "text-rose-500 dark:text-rose-400",
		border: "border-rose-500/20",
		dot: "bg-rose-400",
	},
] as const;

export function getDefaultColor(name: string, isCompleted: boolean) {
	if (isCompleted) return COLUMN_COLORS[4];
	const lower = name.toLowerCase();
	if (
		lower.includes("do") ||
		lower.includes("todo") ||
		lower.includes("backlog")
	)
		return COLUMN_COLORS[0];
	if (lower.includes("progress") || lower.includes("doing"))
		return COLUMN_COLORS[1];
	if (lower.includes("review") || lower.includes("test"))
		return COLUMN_COLORS[2];
	if (lower.includes("hold") || lower.includes("block"))
		return COLUMN_COLORS[3];
	return COLUMN_COLORS[0];
}
