"use client";

import { Bell, Palette, Shield, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navigation = [
	{ name: "Account & Profile", href: "/settings", icon: User },
	{ name: "Security", href: "/settings/security", icon: Shield },
	{ name: "Notifications", href: "/settings/notifications", icon: Bell },
	{ name: "Appearance", href: "/settings/appearance", icon: Palette },
];

export function SettingsNavigation() {
	const pathname = usePathname();

	return (
		<nav className="flex space-x-2 overflow-x-auto pb-2 lg:flex-col lg:space-x-0 lg:space-y-1 lg:overflow-visible lg:pb-0 hide-scrollbar">
			{navigation.map((item) => {
				const isActive = pathname === item.href;

				return (
					<Link
						key={item.name}
						href={item.href}
						className={cn(
							"group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
							isActive
								? "bg-primary/10 text-primary shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]"
								: "text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<item.icon
							className={cn(
								"mr-3 h-5 w-5 shrink-0",
								isActive
									? "text-primary"
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
