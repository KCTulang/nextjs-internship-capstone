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
					className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
						theme === "light"
							? "border-primary bg-primary/10 text-primary shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]"
							: "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm"
					}`}
				>
					<Sun size={32} className="mb-3" />
					<span className="font-medium text-sm">Light Mode</span>
				</button>

				<button
					type="button"
					onClick={() => setTheme("dark")}
					className={`flex flex-col items-center justify-center p-6 border rounded-xl transition-all ${
						theme === "dark"
							? "border-primary bg-primary/10 text-primary shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]"
							: "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground shadow-sm"
					}`}
				>
					<Moon size={32} className="mb-3" />
					<span className="font-medium text-sm">Dark Mode</span>
				</button>
			</div>
		</div>
	);
}
