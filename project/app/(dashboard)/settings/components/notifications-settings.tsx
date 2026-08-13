"use client";

import { BellOff } from "lucide-react";

export function NotificationsSettings() {
	return (
		<div className="flex flex-col items-center justify-center py-16 text-center h-full min-h-75">
			<div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
				<BellOff size={24} />
			</div>
			<h3 className="text-lg font-medium text-foreground mb-2">
				Notifications Unavailable
			</h3>
			<p className="text-sm text-muted-foreground max-w-70">
				Notification preferences are not yet available in your current plan.
				Check back later for updates.
			</p>
		</div>
	);
}
