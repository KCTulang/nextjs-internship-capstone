"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function AppearanceSettings() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="py-2">
			<div className="mb-6">
				<h3 className="text-base font-semibold text-foreground">
					Theme Preferences
				</h3>
				<p className="text-sm text-muted-foreground mt-1">
					Select your preferred application theme.
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
				<button
					type="button"
					onClick={() => setTheme("light")}
					className={`flex flex-col items-center justify-center rounded-xl border p-6 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
						theme === "light"
							? "border-primary bg-primary text-primary-foreground"
							: "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted"
					}`}
				>
					<Sun size={32} className="mb-3" />
					<span className="font-medium text-sm">Light Mode</span>
				</button>

				<button
					type="button"
					onClick={() => setTheme("dark")}
					className={`flex flex-col items-center justify-center rounded-xl border p-6 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
						theme === "dark"
							? "border-primary bg-primary text-primary-foreground"
							: "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted"
					}`}
				>
					<Moon size={32} className="mb-3" />
					<span className="font-medium text-sm">Dark Mode</span>
				</button>
			</div>
		</div>
	);
}
