import { Skeleton } from "@/components/ui/skeleton";

const settingsRowIds = ["settings-row-one", "settings-row-two"];
const notificationSectionIds = [
	"notification-general",
	"notification-projects",
	"notification-activity",
];
const notificationRowIds = [
	"notification-row-one",
	"notification-row-two",
	"notification-row-three",
];

function SettingsSectionSkeleton({ rows = 1 }: { rows?: number }) {
	return (
		<section aria-hidden="true">
			<Skeleton className="h-5 w-36" />
			<Skeleton className="mt-2 h-3 w-64 max-w-full" />
			<div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
				{settingsRowIds.slice(0, rows).map((id, rowIndex) => (
					<div key={id} className="flex items-center gap-4 p-6">
						{rowIndex === 0 && (
							<Skeleton className="size-12 shrink-0 rounded-full" />
						)}
						<div className="flex-1 space-y-2">
							<Skeleton className="h-3.5 w-2/5" />
							<Skeleton className="h-3 w-3/5" />
						</div>
						<Skeleton className="h-8 w-20 rounded-lg" />
					</div>
				))}
			</div>
		</section>
	);
}

function SettingsLoadingRegion({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div role="status" aria-busy="true">
			<span className="sr-only">{label}</span>
			{children}
		</div>
	);
}

export function AccountSettingsSkeleton() {
	return (
		<SettingsLoadingRegion label="Loading account settings">
			<div className="max-w-3xl space-y-10 py-2">
				<SettingsSectionSkeleton />
				<SettingsSectionSkeleton rows={2} />
				<SettingsSectionSkeleton rows={2} />
			</div>
		</SettingsLoadingRegion>
	);
}

export function SecuritySettingsSkeleton() {
	return (
		<SettingsLoadingRegion label="Loading security settings">
			<div className="max-w-3xl space-y-10 py-2">
				<SettingsSectionSkeleton />
				<SettingsSectionSkeleton rows={2} />
				<SettingsSectionSkeleton />
			</div>
		</SettingsLoadingRegion>
	);
}

export function NotificationSettingsSkeleton() {
	return (
		<SettingsLoadingRegion label="Loading notification preferences">
			<div className="space-y-8">
				{notificationSectionIds.map((sectionId, sectionIndex) => (
					<div key={sectionId} aria-hidden="true">
						<Skeleton className="mb-4 h-5 w-32" />
						<div className="space-y-4">
							{notificationRowIds
								.slice(0, sectionIndex === 2 ? 3 : 1)
								.map((rowId) => (
									<div
										key={`${sectionId}-${rowId}`}
										className="flex min-h-20 items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
									>
										<div className="flex-1 space-y-2">
											<Skeleton className="h-3.5 w-2/5" />
											<Skeleton className="h-3 w-3/5" />
										</div>
										<Skeleton className="h-6 w-11 rounded-full" />
									</div>
								))}
						</div>
					</div>
				))}
			</div>
		</SettingsLoadingRegion>
	);
}
