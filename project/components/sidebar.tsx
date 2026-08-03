"use client";

import {
	BarChart3,
	Calendar,
	ChevronLeft,
	ChevronRight,
	FolderOpen,
	Home,
	Settings,
	Users,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
	{ name: "Dashboard", href: "/dashboard", icon: Home },
	{ name: "Projects", href: "/projects", icon: FolderOpen },
	{ name: "Team", href: "/team", icon: Users },
	{ name: "Analytics", href: "/analytics", icon: BarChart3 },
	{ name: "Calendar", href: "/calendar", icon: Calendar },
	{ name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
	mobileOpen: boolean;
	setMobileOpen: (open: boolean) => void;
	isCollapsed: boolean;
	setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({
	mobileOpen,
	setMobileOpen,
	isCollapsed,
	setIsCollapsed,
}: SidebarProps) {
	const pathname = usePathname();

	return (
		<>
			{mobileOpen && (
				<button
					type="button"
					aria-label="Close sidebar"
					className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
					onClick={() => setMobileOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") setMobileOpen(false);
						if (e.key === "Escape") setMobileOpen(false);
					}}
				/>
			)}

			<div
				className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground border-r border-border rounded-r-[2rem] transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
					mobileOpen ? "translate-x-0" : "-translate-x-full"
				} ${isCollapsed ? "w-20" : "w-64"}`}
			>
				<button
					type="button"
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="hidden lg:flex absolute top-24 -right-4 w-8 h-8 items-center justify-center bg-background border border-border rounded-full text-foreground hover:bg-muted hover:scale-105 transition-all z-50 shadow-md"
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{isCollapsed ? (
						<ChevronRight size={18} strokeWidth={3} />
					) : (
						<ChevronLeft size={18} strokeWidth={3} />
					)}
				</button>

				<div className="flex items-center justify-between lg:justify-center h-20 px-4 sm:px-6 shrink-0">
					<Link href="/" className="flex items-center justify-center">
						<Image
							src={isCollapsed ? "/LockLogo.png?v=1" : "/LockInLogo.svg"}
							alt="LockIn"
							width={isCollapsed ? 48 : 240}
							height={isCollapsed ? 48 : 64}
							className="dark:invert object-contain transition-all duration-300 origin-left"
							style={{ width: "auto", height: isCollapsed ? "44px" : "64px" }}
							priority
						/>
					</Link>
					<button
						type="button"
						onClick={() => setMobileOpen(false)}
						className="lg:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<nav className="flex-1 px-3 py-6 space-y-1">
					<ul className="space-y-1.5">
						{navigation.map((item) => {
							const isActive =
								item.href === "/dashboard"
									? pathname === item.href
									: pathname.startsWith(item.href);

							return (
								<li key={item.name} className="relative group">
									<Link
										href={item.href}
										className={`flex items-center px-3 py-2.5 rounded-full transition-all duration-200 ${
											isActive
												? "bg-foreground text-background shadow-sm"
												: "text-muted-foreground hover:bg-muted hover:text-foreground"
										} ${isCollapsed ? "justify-center" : "justify-start"}`}
										onClick={() => setMobileOpen(false)}
									>
										<item.icon
											size={20}
											className={`shrink-0 transition-all duration-200`}
										/>
										<span
											className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${
												isCollapsed
													? "opacity-0 w-0 hidden ml-0"
													: "opacity-100 w-auto ml-3"
											}`}
										>
											{item.name}
										</span>
									</Link>

									{isCollapsed && (
										<div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-foreground text-background text-xs font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50 hidden lg:block">
											{item.name}

											<div className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-foreground" />
										</div>
									)}
								</li>
							);
						})}
					</ul>
				</nav>
			</div>
		</>
	);
}
