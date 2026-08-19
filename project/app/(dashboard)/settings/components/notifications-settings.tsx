"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	getNotificationPreferencesAction,
	updateNotificationPreferencesAction,
} from "@/app/actions/notifications";
import { useUIStore } from "@/stores/ui-store";

export function NotificationsSettings() {
	const addToast = useUIStore((state) => state.addToast);
	const [isLoading, setIsLoading] = useState(true);
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

	useEffect(() => {
		const loadPrefs = async () => {
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
			}
			setIsLoading(false);
		};
		loadPrefs();
	}, []);

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
		return (
			<div className="flex items-center justify-center py-16">
				<Loader2 className="animate-spin text-muted-foreground w-6 h-6" />
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
				<h3 className="text-lg font-medium text-foreground mb-4">Focus</h3>
				<div className="space-y-4">
					<label className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 cursor-pointer transition-colors">
						<div>
							<div className="font-medium text-foreground">
								Mute during focus sessions
							</div>
							<div className="text-sm text-muted-foreground">
								Automatically suppress notifications when you are focused
							</div>
						</div>
						<input
							type="checkbox"
							className="toggle"
							checked={prefs.muteDuringFocus}
							onChange={() => handleToggle("muteDuringFocus")}
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
					<label className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 cursor-pointer transition-colors">
						<div>
							<div className="font-medium text-foreground">
								Team/member updates
							</div>
							<div className="text-sm text-muted-foreground">
								Get notified when members join or roles change
							</div>
						</div>
						<input
							type="checkbox"
							className="toggle"
							checked={prefs.projectActivity}
							onChange={() => handleToggle("projectActivity")}
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
							<div className="font-medium text-foreground">
								Due-date reminders
							</div>
							<div className="text-sm text-muted-foreground">
								Get notified when a task is approaching its due date
							</div>
						</div>
						<input
							type="checkbox"
							className="toggle"
							checked={prefs.dueDates}
							onChange={() => handleToggle("dueDates")}
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
