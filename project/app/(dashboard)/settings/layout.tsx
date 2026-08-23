"use client";

import { SettingsNavigation } from "./components/settings-navigation";

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="w-full max-w-5xl mx-auto flex flex-col h-full [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-ring [&_button]:focus-visible:ring-offset-2 [&_button]:focus-visible:ring-offset-background [&_button:disabled]:cursor-not-allowed">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight text-foreground">
					Settings
				</h1>
				<p className="text-muted-foreground mt-2 text-sm">
					Manage your account, preferences, and application settings
				</p>
			</div>

			<div className="flex flex-col lg:flex-row gap-6 lg:gap-12 pb-12 flex-1">
				<aside className="lg:w-1/4 xl:w-1/5 shrink-0">
					<SettingsNavigation />
				</aside>

				<main className="flex-1 min-w-0">{children}</main>
			</div>
		</div>
	);
}
