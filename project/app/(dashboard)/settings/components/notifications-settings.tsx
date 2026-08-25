"use client";

import { useCallback, useEffect, useState } from "react";
import {
	getNotificationPreferencesAction,
	updateNotificationPreferencesAction,
} from "@/app/actions/notifications";
import { NotificationSettingsSkeleton } from "@/components/skeletons/settings-skeletons";
import { useUIStore } from "@/stores/ui-store";

export function NotificationsSettings() {
	const addToast = useUIStore((state) => state.addToast);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [prefs, setPrefs] = useState({
		muteAll: false,
		muteDuringFocus: false,
		taskAssignments: true,
		mentions: true,
		comments: true,
		dueDates: true,
		invitations: true,
		projectActivity: true,
	});

	const loadPrefs = useCallback(async () => {
		setIsLoading(true);
		setLoadError(null);
		try {
			const res = await getNotificationPreferencesAction();
			if (res.success && res.data) {
				setPrefs({
					muteAll: res.data.muteAll,
					muteDuringFocus: res.data.muteDuringFocus,
					taskAssignments: res.data.taskAssignments,
					mentions: res.data.mentions,
					comments: res.data.comments,
					dueDates: res.data.dueDates,
					invitations: res.data.invitations,
					projectActivity: res.data.projectActivity,
				});
			} else {
				setLoadError(res.error || "Unable to load notification preferences.");
			}
		} catch {
			setLoadError("Unable to load notification preferences.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadPrefs();
	}, [loadPrefs]);

	const handleToggle = async (key: keyof typeof prefs) => {
		const newVal = !prefs[key];
		setPrefs((prev) => ({ ...prev, [key]: newVal }));
		setIsSaving(true);

		const res = await updateNotificationPreferencesAction({ [key]: newVal });
		if (!res.success) {
			setPrefs((prev) => ({ ...prev, [key]: !newVal }));
			addToast({ type: "error", message: "Failed to update preference." });
		} else {
			addToast({ type: "success", message: "Preference updated." });
		}
		setIsSaving(false);
	};

	if (isLoading) {
		return <NotificationSettingsSkeleton />;
	}

	if (loadError) {
		return (
			<div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5">
				<p className="text-sm font-medium text-destructive">{loadError}</p>
				<button
					type="button"
					onClick={() => void loadPrefs()}
					className="mt-3 rounded-lg border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Try again
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div>
				<h3 className="text-lg font-medium text-foreground mb-4">General</h3>
				<div className="space-y-4">
					<label className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 cursor-pointer transition-colors">
						<div>
							<div className="font-medium text-foreground">
								Mute all notifications
							</div>
							<div className="text-sm text-muted-foreground">
								Stop all interruptive notifications globally
							</div>
						</div>
						<input
							type="checkbox"
							className="toggle"
							checked={prefs.muteAll}
							onChange={() => handleToggle("muteAll")}
							disabled={isSaving}
						/>
					</label>
				</div>
			</div>

			<div>
				<h3 className="text-lg font-medium text-foreground mb-4">
					Project & Team
				</h3>
				<div className="space-y-4">
					<label className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 cursor-pointer transition-colors">
						<div>
							<div className="font-medium text-foreground">
								Project invitations
							</div>
							<div className="text-sm text-muted-foreground">
								Get notified when you are invited to a project
							</div>
						</div>
						<input
							type="checkbox"
							className="toggle"
							checked={prefs.invitations}
							onChange={() => handleToggle("invitations")}
							disabled={isSaving}
						/>
					</label>
				</div>
			</div>

			<div>
				<h3 className="text-lg font-medium text-foreground mb-4">
					Tasks & Activity
				</h3>
				<div className="space-y-4">
					<label className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 cursor-pointer transition-colors">
						<div>
							<div className="font-medium text-foreground">
								Task assignments
							</div>
							<div className="text-sm text-muted-foreground">
								Get notified when a task is assigned to you
							</div>
						</div>
						<input
							type="checkbox"
							className="toggle"
							checked={prefs.taskAssignments}
							onChange={() => handleToggle("taskAssignments")}
							disabled={isSaving}
						/>
					</label>

					<label className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 cursor-pointer transition-colors">
						<div>
							<div className="font-medium text-foreground">Mentions</div>
							<div className="text-sm text-muted-foreground">
								Get notified when someone @mentions you
							</div>
						</div>
						<input
							type="checkbox"
							className="toggle"
							checked={prefs.mentions}
							onChange={() => handleToggle("mentions")}
							disabled={isSaving}
						/>
					</label>
					<label className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 cursor-pointer transition-colors">
						<div>
							<div className="font-medium text-foreground">Task comments</div>
							<div className="text-sm text-muted-foreground">
								Get notified about comments on tasks you are assigned to
							</div>
						</div>
						<input
							type="checkbox"
							className="toggle"
							checked={prefs.comments}
							onChange={() => handleToggle("comments")}
							disabled={isSaving}
						/>
					</label>
				</div>
			</div>
		</div>
	);
}
