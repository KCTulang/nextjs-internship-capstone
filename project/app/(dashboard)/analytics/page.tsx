import type { Metadata } from "next";
import { type AnalyticsRange, getAnalyticsAction } from "@/app/actions/tasks";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { AnalyticsRangeSelect } from "@/components/analytics-range-select";

export const metadata: Metadata = {
	title: "Analytics",
};

function isAnalyticsRange(value: string): value is AnalyticsRange {
	return (
		value === "7d" || value === "30d" || value === "month" || value === "all"
	);
}

export default async function AnalyticsPage({
	searchParams,
}: {
	searchParams: Promise<{ range?: string | string[] }>;
}) {
	const params = await searchParams;
	const requestedRange =
		typeof params.range === "string" ? params.range : "30d";
	const range: AnalyticsRange = isAnalyticsRange(requestedRange)
		? requestedRange
		: "30d";
	const analyticsRes = await getAnalyticsAction(range);

	return (
		<div className="mx-auto max-w-400 space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						Analytics
					</h1>
					<p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
						Track project performance and team productivity
					</p>
				</div>
				<AnalyticsRangeSelect value={range} />
			</div>

			{analyticsRes.success ? (
				<AnalyticsDashboard data={analyticsRes.data} />
			) : (
				<div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
					{analyticsRes.error}
				</div>
			)}
		</div>
	);
}
