"use client";

import { Bell, Palette, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";

const navigation = [
	{ name: "Account & Profile", href: "/settings", icon: User },
	{ name: "Security", href: "/settings/security", icon: Shield },
	{ name: "Notifications", href: "/settings/notifications", icon: Bell },
	{ name: "Appearance", href: "/settings/appearance", icon: Palette },
];

export function SettingsNavigation() {
	const pathname = usePathname();

	return (
		<nav className="-mx-1 flex space-x-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:space-x-0 lg:space-y-1 lg:overflow-visible lg:px-0 lg:pb-0 hide-scrollbar">
			{navigation.map((item) => {
				const isActive = pathname === item.href;

				return (
					<Link
						key={item.name}
						href={item.href}
						className={cn(
							"group flex shrink-0 items-center whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
							isActive
								? "border-primary bg-primary text-primary-foreground"
								: "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted",
						)}
					>
						<item.icon
							className={cn(
								"mr-3 h-5 w-5 shrink-0",
								isActive
									? "text-primary-foreground"
									: "text-muted-foreground group-hover:text-foreground",
							)}
							aria-hidden="true"
						/>
						{item.name}
					</Link>
				);
			})}
		</nav>
	);
}
