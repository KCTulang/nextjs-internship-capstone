"use client";

import { Bell, Menu, Search } from "lucide-react";
import type React from "react";
import { Suspense, useState } from "react";
import { CustomUserButton } from "@/components/custom-user-button";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<div className="min-h-screen bg-background">
			<Sidebar
				mobileOpen={mobileOpen}
				setMobileOpen={setMobileOpen}
				isCollapsed={isCollapsed}
				setIsCollapsed={setIsCollapsed}
			/>

			<div
				className={`transition-all duration-300 ease-in-out ${
					isCollapsed ? "lg:pl-20" : "lg:pl-64"
				}`}
			>
				<div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={() => setMobileOpen(true)}
						className="lg:hidden p-2 rounded-lg hover:bg-muted"
					>
						<Menu size={20} />
					</button>

					<div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
						<div className="flex flex-1 items-center">
							<div className="relative flex-1 max-w-md">
								<Search
									className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
									size={16}
								/>
								<input
									type="text"
									placeholder="Search projects, tasks..."
									className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>
						</div>

						<div className="flex items-center gap-x-4 lg:gap-x-6">
							<button type="button" className="p-2 rounded-lg hover:bg-muted">
								<Bell size={20} />
							</button>

							<ThemeToggle />

							<div className="flex items-center justify-center">
								<CustomUserButton />
							</div>
						</div>
					</div>
				</div>

				<main className="py-8 px-4 sm:px-6 lg:px-8">
					<Suspense>{children}</Suspense>
				</main>
			</div>
		</div>
	);
}
