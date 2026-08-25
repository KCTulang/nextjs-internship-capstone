const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnly(value: unknown): value is string {
	if (typeof value !== "string") return false;
	const match = DATE_ONLY_PATTERN.exec(value);
	if (!match) return false;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);

	return (
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day
	);
}

export function toDateOnly(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function parseDateOnly(value: string): Date {
	if (!isDateOnly(value)) {
		throw new Error(`Invalid date-only value: ${value}`);
	}
	const [year, month, day] = value.split("-").map(Number);
	return new Date(year, month - 1, day);
}

export function formatDateOnly(
	value: string,
	options: Intl.DateTimeFormatOptions,
	locales?: Intl.LocalesArgument,
): string {
	return new Intl.DateTimeFormat(locales, options).format(parseDateOnly(value));
}

export function isDateOnlyOverdue(value: string, today = new Date()): boolean {
	return isDateOnly(value) && value < toDateOnly(today);
}

export function formatDateOnlyDeadlineLabel(
	value: string,
	today = new Date(),
): string {
	const tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);
	if (value === toDateOnly(today)) return "Today";
	if (value === toDateOnly(tomorrow)) return "Tomorrow";
	return formatDateOnly(value, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}
