"use client";

import {
	AlertTriangle,
	BarChart3,
	BriefcaseBusiness,
	CheckCircle2,
	Clock3,
	ListTodo,
	Timer,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AnalyticsData } from "@/app/actions/tasks";
import { formatFocusDuration } from "@/utils";

const cardClass =
	"min-w-0 rounded-2xl border border-border bg-card text-card-foreground shadow-sm";

function compactDuration(seconds: number) {
	if (seconds === 0) return "0m";
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return [hours > 0 ? `${hours}h` : null, `${minutes}m`]
		.filter(Boolean)
		.join(" ");
}

function EmptyState({
	icon: Icon,
	title,
	description,
}: {
	icon: typeof BarChart3;
	title: string;
	description: string;
}) {
	return (
		<div className="flex min-h-32 flex-col items-center justify-center px-4 py-6 text-center">
			<div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
				<Icon size={18} aria-hidden="true" />
			</div>
			<p className="text-sm font-semibold text-foreground">{title}</p>
			<p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function CompletionTrend({ data }: { data: AnalyticsData["trend"] }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [measuredWidth, setMeasuredWidth] = useState(680);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const updateWidth = () =>
			setMeasuredWidth(Math.max(300, Math.floor(container.clientWidth)));
		updateWidth();
		const observer = new ResizeObserver(updateWidth);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	const maxValue = Math.max(0, ...data.map((point) => point.created));
	if (maxValue === 0) {
		return (
			<EmptyState
				icon={BarChart3}
				title="No task activity yet"
				description="Create tasks in this period to start seeing completion patterns."
			/>
		);
	}

	const width = measuredWidth;
	const height = width < 520 ? 210 : 230;
	const margin = { top: 24, right: 12, bottom: 36, left: 34 };
	const plotWidth = width - margin.left - margin.right;
	const plotHeight = height - margin.top - margin.bottom;
	const groupWidth = plotWidth / data.length;
	const barWidth = Math.min(26, Math.max(12, groupWidth * 0.27));
	const barGap = Math.min(5, groupWidth * 0.06);
	const y = (value: number) =>
		margin.top + plotHeight - (value / maxValue) * plotHeight;
	const ticks = Array.from(
		new Set([0, Math.ceil(maxValue / 2), maxValue]),
	).sort((a, b) => a - b);

	return (
		<div ref={containerRef} className="w-full overflow-hidden">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				role="img"
				aria-label="Tasks created and currently completed by creation period"
				className="h-auto w-full text-foreground"
			>
				{ticks.map((value) => {
					const lineY = y(value);
					return (
						<g key={value}>
							<line
								x1={margin.left}
								x2={width - margin.right}
								y1={lineY}
								y2={lineY}
								stroke="currentColor"
								className="text-border"
								strokeDasharray="4 5"
							/>
							<text
								x={margin.left - 9}
								y={lineY + 4}
								textAnchor="end"
								className="fill-muted-foreground text-[11px]"
							>
								{value}
							</text>
						</g>
					);
				})}
				{data.map((point, index) => {
					const x = margin.left + index * groupWidth + groupWidth / 2;
					const createdHeight = (point.created / maxValue) * plotHeight;
					const completedHeight = (point.completed / maxValue) * plotHeight;
					const createdX = x - barGap / 2 - barWidth;
					const completedX = x + barGap / 2;
					return (
						<g key={point.label} tabIndex={0}>
							<title>{`${point.label}: ${point.created} created, ${point.completed} currently complete`}</title>
							<rect
								x={createdX}
								y={margin.top + plotHeight - createdHeight}
								width={barWidth}
								height={createdHeight}
								rx="5"
								className="fill-primary/70"
							/>
							{point.completed > 0 ? (
								<rect
									x={completedX}
									y={margin.top + plotHeight - completedHeight}
									width={barWidth}
									height={completedHeight}
									rx="5"
									className="fill-emerald-500"
								/>
							) : (
								<line
									x1={completedX}
									x2={completedX + barWidth}
									y1={margin.top + plotHeight - 1}
									y2={margin.top + plotHeight - 1}
									className="stroke-emerald-500/60"
									strokeWidth="2"
								/>
							)}
							{point.created > 0 && (
								<text
									x={createdX + barWidth / 2}
									y={margin.top + plotHeight - createdHeight - 6}
									textAnchor="middle"
									className="fill-foreground text-[10px] font-semibold"
								>
									{point.created}
								</text>
							)}
							{point.completed > 0 && (
								<text
									x={completedX + barWidth / 2}
									y={margin.top + plotHeight - completedHeight - 6}
									textAnchor="middle"
									className="fill-foreground text-[10px] font-semibold"
								>
									{point.completed}
								</text>
							)}
							<text
								x={x}
								y={height - 17}
								textAnchor="middle"
								className="fill-muted-foreground text-[11px]"
							>
								{point.label}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

function StatusDistribution({
	statuses,
	total,
}: {
	statuses: AnalyticsData["statuses"];
	total: number;
}) {
	if (total === 0) {
		return (
			<EmptyState
				icon={ListTodo}
				title="No task statuses yet"
				description="Tasks will appear here grouped by their actual project columns."
			/>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-5 px-5 pb-5 sm:px-6 sm:pb-6">
			<div className="flex h-3 overflow-hidden rounded-full bg-muted">
				{statuses.map((status, index) => (
					<div
						key={`${status.isCompleted}-${status.label}`}
						className={status.isCompleted ? "bg-emerald-500" : "bg-primary"}
						style={{
							width: `${(status.count / total) * 100}%`,
							opacity: status.isCompleted
								? 1
								: Math.max(0.35, 1 - index * 0.12),
						}}
						title={`${status.label}: ${status.count}`}
					/>
				))}
			</div>
			<div className="space-y-3.5">
				{statuses.slice(0, 6).map((status) => (
					<div
						key={`${status.isCompleted}-${status.label}`}
						className="grid grid-cols-[auto_minmax(0,1fr)_2.75rem_1.75rem] items-center gap-2 text-sm"
					>
						<span
							className={`size-2 rounded-full ${status.isCompleted ? "bg-emerald-500" : "bg-primary"}`}
						/>
						<span className="min-w-0 flex-1 truncate text-foreground">
							{status.label}
						</span>
						<span className="text-right font-semibold tabular-nums text-foreground">
							{Math.round((status.count / total) * 100)}%
						</span>
						<span className="text-right text-xs tabular-nums text-muted-foreground">
							{status.count}
						</span>
					</div>
				))}
				{statuses.length > 6 && (
					<p className="text-xs text-muted-foreground">
						+{statuses.length - 6} additional project statuses
					</p>
				)}
			</div>
		</div>
	);
}

function SectionHeader({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="p-5 pb-4 sm:p-6 sm:pb-4">
			<h2 className="text-base font-semibold text-foreground">{title}</h2>
			<p className="mt-1 text-xs leading-5 text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
	const metrics = [
		{
			label: "Total Tasks",
			value: data.totalTasks.toLocaleString(),
			context:
				data.range === "all"
					? "across all project history"
					: `created in ${data.rangeLabel.toLowerCase()}`,
			icon: ListTodo,
			iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
		},
		{
			label: "Completion Rate",
			value: `${data.completionRate}%`,
			context: `${data.completedTasks} of ${data.totalTasks} currently complete`,
			icon: CheckCircle2,
			iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		},
		{
			label: "Active Projects",
			value: data.projectCount.toLocaleString(),
			context: `${data.teamMemberCount} unique team member${data.teamMemberCount === 1 ? "" : "s"}`,
			icon: BriefcaseBusiness,
			iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
		},
		{
			label: "Focus Time",
			value: compactDuration(data.focus.totalSeconds),
			context: `${data.focus.sessionCount} completed session${data.focus.sessionCount === 1 ? "" : "s"}`,
			icon: Timer,
			iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
		},
	];
	const maxWorkload = Math.max(
		1,
		...data.workload.map((item) => item.activeTasks),
	);

	return (
		<div className="space-y-5 sm:space-y-6">
			{data.completionWarning && (
				<div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
					<AlertTriangle
						className="mt-0.5 size-4 shrink-0"
						aria-hidden="true"
					/>
					<p>{data.completionWarning}</p>
				</div>
			)}

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1440px]:grid-cols-4">
				{metrics.map((metric) => (
					<section
						key={metric.label}
						className={`${cardClass} flex min-h-36 flex-col p-5`}
					>
						<div className="flex items-start justify-between gap-4">
							<div className="min-w-0">
								<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									{metric.label}
								</p>
								<p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
									{metric.value}
								</p>
							</div>
							<div
								className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${metric.iconClass}`}
							>
								<metric.icon size={19} aria-hidden="true" />
							</div>
						</div>
						<p className="mt-auto line-clamp-2 pt-4 text-xs leading-5 text-muted-foreground">
							{metric.context}
						</p>
					</section>
				))}
			</div>

			<div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(17rem,1fr)]">
				<section className={`${cardClass} flex flex-col`}>
					<div className="flex flex-col gap-3 p-5 pb-2 sm:flex-row sm:items-start sm:justify-between sm:p-6 sm:pb-2">
						<div>
							<h2 className="text-base font-semibold text-foreground">
								Task Completion Trend
							</h2>
							<p className="mt-1 text-xs leading-5 text-muted-foreground">
								Tasks grouped by creation date; completed bars reflect current
								semantic status.
							</p>
						</div>
						<div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<span className="size-2 rounded-sm bg-primary/70" /> Created
							</span>
							<span className="flex items-center gap-1.5">
								<span className="size-2 rounded-sm bg-emerald-500" /> Complete
							</span>
						</div>
					</div>
					<div className="px-2 pb-3 sm:px-5 sm:pb-5">
						<CompletionTrend data={data.trend} />
					</div>
				</section>

				<section className={`${cardClass} flex flex-col`}>
					<SectionHeader
						title="Task Status"
						description="Current distribution across your real project columns."
					/>
					<StatusDistribution
						statuses={data.statuses}
						total={data.totalTasks}
					/>
				</section>
			</div>

			<div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 min-[1440px]:grid-cols-3">
				<section className={`${cardClass} flex h-full flex-col`}>
					<SectionHeader
						title="Team Workload"
						description="Open assigned tasks show distribution, not individual performance."
					/>
					{data.workload.length === 0 ? (
						<EmptyState
							icon={Users}
							title="No team workload yet"
							description="Invite members and assign tasks to see workload distribution."
						/>
					) : (
						<div className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
							{data.workload.slice(0, 8).map((member) => {
								const label = member.name ?? member.email;
								return (
									<div
										key={member.id}
										className="grid grid-cols-[minmax(0,1.1fr)_minmax(4rem,1fr)_2rem] items-center gap-2 sm:gap-3"
									>
										<div className="flex min-w-0 items-center gap-2.5">
											<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-foreground">
												{label.slice(0, 2).toUpperCase()}
											</span>
											<span className="truncate text-sm font-medium text-foreground">
												{label}
											</span>
										</div>
										<div className="h-1.5 overflow-hidden rounded-full bg-muted">
											<div
												className="h-full rounded-full bg-primary transition-[width]"
												style={{
													width: `${(member.activeTasks / maxWorkload) * 100}%`,
												}}
											/>
										</div>
										<span className="text-right text-sm font-semibold tabular-nums text-foreground">
											{member.activeTasks}
										</span>
									</div>
								);
							})}
						</div>
					)}
				</section>

				<section className={`${cardClass} flex h-full flex-col`}>
					<SectionHeader
						title="Deadline Health"
						description="Open tasks grouped by how soon they are due."
					/>
					<div className="space-y-2 px-5 pb-5 sm:px-6 sm:pb-6">
						{[
							{
								label: "Overdue",
								value: data.deadlines.overdue,
								className: "text-destructive bg-destructive/8",
								dotClass: "bg-destructive",
							},
							{
								label: "Next 7 days",
								value: data.deadlines.dueSoon,
								className: "text-amber-700 bg-amber-500/10 dark:text-amber-300",
								dotClass: "bg-amber-500",
							},
							{
								label: "Upcoming",
								value: data.deadlines.upcoming,
								className: "text-blue-700 bg-blue-500/10 dark:text-blue-300",
								dotClass: "bg-blue-500",
							},
						].map((item) => (
							<div
								key={item.label}
								className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${item.className}`}
							>
								<div className="flex items-center gap-2.5">
									<span className={`size-2 rounded-full ${item.dotClass}`} />
									<p className="text-sm font-medium">{item.label}</p>
								</div>
								<p className="text-lg font-bold tabular-nums">{item.value}</p>
							</div>
						))}
					</div>
				</section>

				<section
					className={`${cardClass} flex h-full flex-col lg:col-span-2 min-[1440px]:col-span-1`}
				>
					<div className="flex items-start gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Clock3 size={18} aria-hidden="true" />
						</div>
						<div>
							<h2 className="text-base font-semibold text-foreground">
								Focus Summary
							</h2>
							<p className="mt-1 text-xs leading-5 text-muted-foreground">
								Completed focus sessions in {data.rangeLabel.toLowerCase()}.
							</p>
						</div>
					</div>
					<div className="grid flex-1 gap-3 px-5 pb-5 min-[430px]:grid-cols-3 sm:px-6 sm:pb-6">
						{[
							{
								label: "Total focus",
								value: compactDuration(data.focus.totalSeconds),
							},
							{
								label: "Today",
								value: compactDuration(data.focus.todaySeconds),
							},
							{
								label: "Average session",
								value: formatFocusDuration(data.focus.averageSeconds),
							},
						].map((item) => (
							<div
								key={item.label}
								className="rounded-lg bg-muted/45 px-3 py-3 min-[430px]:text-center"
							>
								<p className="text-xl font-bold tracking-tight text-foreground">
									{item.value}
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									{item.label}
								</p>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
