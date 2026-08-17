import { AppearanceSettings } from "../components/appearance-settings";

export default function AppearancePage() {
	return (
		<div className="w-full">
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-foreground">Appearance</h2>
				<p className="text-muted-foreground text-sm mt-1">
					Customize how LockIn looks on your device.
				</p>
			</div>

			<AppearanceSettings />
		</div>
	);
}
