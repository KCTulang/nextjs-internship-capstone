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

const mainNav = [
	{ name: "Dashboard", href: "/dashboard", icon: Home },
	{ name: "Projects", href: "/projects", icon: FolderOpen },
	{ name: "Team", href: "/team", icon: Users },
];

const workspaceNav = [
	{ name: "Analytics", href: "/analytics", icon: BarChart3 },
	{ name: "Calendar", href: "/calendar", icon: Calendar },
];

function SectionTitle({
	title,
	isCollapsed,
}: {
	title: string;
	isCollapsed: boolean;
}) {
	return (
		<div className="flex items-center gap-4 px-6 mt-8 mb-4">
			{!isCollapsed && (
				<h4 className="text-[10px] font-extrabold text-muted-foreground/50 tracking-[0.2em] uppercase whitespace-nowrap">
					{title}
				</h4>
			)}
			<div className="h-px bg-border/50 flex-1" />
		</div>
	);
}

function NavItem({
	item,
	isActive,
	collapsed,
	onClick,
}: {
	item: { name: string; href: string; icon: React.ElementType };
	isActive: boolean;
	collapsed: boolean;
	onClick: () => void;
}) {
	return (
		<li className="relative group px-3">
			<Link
				href={item.href}
				onClick={onClick}
				className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring
					${
						isActive
							? "bg-primary/10 text-primary shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] dark:shadow-[inset_0_1px_4px_rgba(255,255,255,0.02)]"
							: "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					}
					${collapsed ? "justify-center px-0 mx-2" : "justify-start"}
				`}
			>
				{/* 1. Active Left Accent Bar */}
				{isActive && (
					<div className="absolute left-3 top-2 bottom-2 w-1 bg-primary rounded-r-full shadow-[0_0_8px_var(--color-primary)] opacity-80" />
				)}

				<item.icon
					size={18}
					strokeWidth={isActive ? 2.5 : 2}
					className={`shrink-0 transition-all duration-300 ${
						isActive
							? "drop-shadow-sm"
							: "group-hover:scale-110 opacity-70 group-hover:opacity-100"
					}`}
				/>
				{!collapsed && (
					<span
						className={`text-sm tracking-tight transition-all duration-300 ${isActive ? "font-semibold" : "font-medium"}`}
					>
						{item.name}
					</span>
				)}
			</Link>

			{/* Tooltip for collapsed state */}
			{collapsed && (
				<div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-popover text-popover-foreground text-xs font-semibold tracking-wide rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-lg border border-border z-50 hidden lg:block translate-x-1 group-hover:translate-x-0 reveal">
					{item.name}
					<span className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-border" />
				</div>
			)}
		</li>
	);
}

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

	const isActive = (href: string) =>
		href === "/dashboard" ? pathname === href : pathname.startsWith(href);

	return (
		<>
			{/* Mobile backdrop */}
			{mobileOpen && (
				<button
					type="button"
					aria-label="Close sidebar"
					className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity"
					onClick={() => setMobileOpen(false)}
				/>
			)}

			{/* Sidebar shell */}
			<div
				className={`fixed inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-300 ease-in-out lg:translate-x-0
					${mobileOpen ? "translate-x-0" : "-translate-x-full"}
					${isCollapsed ? "w-20" : "w-64"}
					bg-sidebar border-r border-sidebar-border
					shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_40px_rgba(0,0,0,0.15)]
				`}
			>
				{/* Ambient Glow for Dark Mode */}
				<div className="absolute inset-0 pointer-events-none hidden dark:block overflow-hidden rounded-r-[2rem]">
					<div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full" />
				</div>

				{/* 6. Collapse toggle button - anchored deliberately with matched shadow/borders */}
				<button
					type="button"
					onClick={() => setIsCollapsed(!isCollapsed)}
					className="hidden lg:flex absolute top-[28px] -right-3.5 w-7 h-7 items-center justify-center
						bg-background border border-border rounded-full text-muted-foreground 
						hover:text-foreground hover:bg-accent hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-sidebar-ring
						transition-all z-50 shadow-sm group/collapse overflow-hidden"
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{isCollapsed ? (
						<ChevronRight
							size={14}
							strokeWidth={2.5}
							className="group-hover/collapse:translate-x-0.5 transition-transform"
						/>
					) : (
						<ChevronLeft
							size={14}
							strokeWidth={2.5}
							className="group-hover/collapse:-translate-x-0.5 transition-transform"
						/>
					)}
				</button>

				{/* Logo Header (Unchanged Logic as requested) */}
				<div className="relative z-10 flex items-center justify-between lg:justify-center h-20 px-4 sm:px-6 shrink-0">
					<Link
						href="/"
						className="flex items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
					>
						<Image
							src={isCollapsed ? "/LockLogo.png?v=1" : "/LockInLogo.svg"}
							alt="LockIn"
							width={isCollapsed ? 48 : 240}
							height={isCollapsed ? 48 : 64}
							className="dark:invert object-contain transition-all duration-300 origin-left hover:opacity-80"
							style={{ width: "auto", height: isCollapsed ? "44px" : "64px" }}
							priority
						/>
					</Link>

					<button
						type="button"
						onClick={() => setMobileOpen(false)}
						className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors absolute right-4"
					>
						<X size={18} />
					</button>
				</div>

				{/* Navigation Items */}
				<nav className="relative z-10 flex flex-col flex-1 py-4 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
					<ul className="space-y-1">
						{mainNav.map((item) => (
							<NavItem
								key={item.name}
								item={item}
								isActive={isActive(item.href)}
								collapsed={isCollapsed}
								onClick={() => setMobileOpen(false)}
							/>
						))}
					</ul>

					{/* 3. WORKSPACE label with typography & hairline divider */}
					<SectionTitle title="Workspace" isCollapsed={isCollapsed} />

					<ul className="space-y-1">
						{workspaceNav.map((item) => (
							<NavItem
								key={item.name}
								item={item}
								isActive={isActive(item.href)}
								collapsed={isCollapsed}
								onClick={() => setMobileOpen(false)}
							/>
						))}
					</ul>

					{/* 5. Vertical Rhythm / Ambient Glow in empty space */}
					<div className="flex-1 min-h-[60px] relative pointer-events-none mt-4 flex items-end">
						<div className="w-full h-32 bg-primary/10 dark:bg-primary/5 blur-[50px] rounded-full animate-[glow-pulse_5s_ease-in-out_infinite] opacity-60 translate-y-1/2" />
					</div>
				</nav>

				{/* 8. Settings section with top divider */}
				<div className="relative z-10 py-4 border-t border-border/40 bg-gradient-to-t from-sidebar-accent/30 to-transparent">
					<ul className="space-y-1">
						<NavItem
							item={{ name: "Settings", href: "/settings", icon: Settings }}
							isActive={isActive("/settings")}
							collapsed={isCollapsed}
							onClick={() => setMobileOpen(false)}
						/>
					</ul>
				</div>
			</div>
		</>
	);
}
