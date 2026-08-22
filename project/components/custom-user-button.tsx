"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/user-avatar";

interface CustomUserButtonProps {
	customAvatarUrl?: string | null;
	googleAvatarUrl?: string | null;
}

export function CustomUserButton({
	customAvatarUrl,
	googleAvatarUrl,
}: CustomUserButtonProps) {
	const { isLoaded, user } = useUser();
	const { signOut } = useClerk();
	const router = useRouter();

	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	if (!isLoaded || !user) {
		return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
	}

	const handleSignOut = async () => {
		setIsOpen(false);
		await signOut();
		router.push("/");
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center justify-center rounded-full overflow-hidden border border-border hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/40"
			>
				<UserAvatar
					customAvatarUrl={customAvatarUrl}
					googleAvatarUrl={googleAvatarUrl}
					firstName={user.firstName}
					lastName={user.lastName}
					size={32}
				/>
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-64 bg-card border border-border shadow-xl rounded-xl overflow-hidden z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
					<div className="flex items-center gap-3 px-4 py-3 border-b border-border mb-1">
						<UserAvatar
							customAvatarUrl={customAvatarUrl}
							googleAvatarUrl={googleAvatarUrl}
							firstName={user.firstName}
							lastName={user.lastName}
							size={40}
							className="rounded-full border border-border"
						/>
						<div className="flex flex-col overflow-hidden">
							<span className="text-sm font-semibold text-foreground truncate">
								{user.fullName}
							</span>
							<span className="text-xs text-muted-foreground truncate">
								{user.primaryEmailAddress?.emailAddress}
							</span>
						</div>
					</div>

					<Link
						href="/settings"
						onClick={() => setIsOpen(false)}
						className="flex items-center gap-2.5 px-4 py-2.5 mx-1 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
					>
						<Settings size={16} />
						Manage account
					</Link>

					<button
						type="button"
						onClick={handleSignOut}
						className="flex items-center gap-2.5 px-4 py-2.5 mx-1 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors text-left"
					>
						<LogOut size={16} />
						Sign out
					</button>
				</div>
			)}
		</div>
	);
}
