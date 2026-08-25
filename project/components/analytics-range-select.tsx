"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AnalyticsRange } from "@/app/actions/tasks";

const ranges: { value: AnalyticsRange; label: string }[] = [
	{ value: "7d", label: "Last 7 days" },
	{ value: "30d", label: "Last 30 days" },
	{ value: "month", label: "This month" },
	{ value: "all", label: "All time" },
];

export function AnalyticsRangeSelect({ value }: { value: AnalyticsRange }) {
	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	return (
		<label className="relative inline-flex items-center">
			<span className="sr-only">Analytics time range</span>
			<select
				value={value}
				disabled={isPending}
				onChange={(event) => {
					const params = new URLSearchParams(searchParams.toString());
					params.set("range", event.target.value);
					startTransition(() =>
						router.replace(`${pathname}?${params.toString()}`),
					);
				}}
				className="h-10 appearance-none rounded-lg border border-border bg-card py-2 pr-9 pl-3 text-sm font-medium text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
			>
				{ranges.map((range) => (
					<option key={range.value} value={range.value}>
						{range.label}
					</option>
				))}
			</select>
			<svg
				aria-hidden="true"
				viewBox="0 0 20 20"
				fill="currentColor"
				className="pointer-events-none absolute right-3 size-4 text-muted-foreground"
			>
				<path d="M5.25 7.5 10 12.25l4.75-4.75" />
			</svg>
		</label>
	);
}
