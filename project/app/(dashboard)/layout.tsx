"use client";

import { UserButton } from "@clerk/nextjs";
import {
	BarChart3,
	Bell,
	Calendar,
	FolderOpen,
	Home,
	Menu,
	Search,
	Settings,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { Suspense, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
	{ name: "Dashboard", href: "/dashboard", icon: Home, current: true },
	{ name: "Projects", href: "/projects", icon: FolderOpen, current: false },
	{ name: "Team", href: "/team", icon: Users, current: false },
	{ name: "Analytics", href: "/analytics", icon: BarChart3, current: false },
	{ name: "Calendar", href: "/calendar", icon: Calendar, current: false },
	{ name: "Settings", href: "/settings", icon: Settings, current: false },
];

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="min-h-screen bg-background">
			{/* Mobile sidebar overlay */}
			{sidebarOpen && (
				<button
					type="button"
					aria-label="Close sidebar"
					className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
					onClick={() => setSidebarOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							setSidebarOpen(false);
						}
						if (e.key === "Escape") {
							setSidebarOpen(false);
						}
					}}
				/>
			)}

			{/* Sidebar */}
			<div
				className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
			>
				<div className="flex items-center justify-between h-16 px-6 border-b border-border">
					<Link href="/" className="text-2xl font-bold text-primary">
						ProjectFlow
					</Link>
					<button
						type="button"
						onClick={() => setSidebarOpen(false)}
						className="lg:hidden p-2 rounded-lg hover:bg-muted"
					>
						<X size={20} />
					</button>
				</div>

				<nav className="mt-6 px-3">
					<ul className="space-y-1">
						{navigation.map((item) => (
							<li key={item.name}>
								<Link
									href={item.href}
									className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
										item.current
											? "bg-primary dark:bg-primary text-primary dark:text-primary"
											: "text-foreground hover:bg-muted"
									}`}
								>
									<item.icon className="mr-3" size={20} />
									{item.name}
								</Link>
							</li>
						))}
					</ul>
				</nav>
			</div>

			{/* Main content */}
			<div className="lg:pl-64">
				{/* Top bar */}
				<div className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={() => setSidebarOpen(true)}
						className="lg:hidden p-2 rounded-lg hover:bg-muted"
					>
						<Menu size={20} />
					</button>

					<div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
						{/* Search bar placeholder */}
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
								<UserButton />
							</div>
						</div>
					</div>
				</div>

				{/* Page content */}
				<main className="py-8 px-4 sm:px-6 lg:px-8">
					<Suspense>{children}</Suspense>
				</main>
			</div>
		</div>
	);
}
