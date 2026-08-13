import { NotificationsSettings } from "../components/notifications-settings";

export default function NotificationsPage() {
	return (
		<div className="w-full">
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-foreground">Notifications</h2>
				<p className="text-muted-foreground text-sm mt-1">
					Manage how LockIn communicates with you.
				</p>
			</div>

			<NotificationsSettings />
		</div>
	);
}
