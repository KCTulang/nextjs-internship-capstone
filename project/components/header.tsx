"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CustomUserButton } from "@/components/custom-user-button";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { useTheme } from "./theme-provider";

export function Header() {
	const { theme, setTheme } = useTheme();
	const { isSignedIn } = useAuth();

	return (
		<header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<Link href="/" className="flex items-center">
						<Image
							src="/LockLogo.svg"
							alt="LockIn"
							width={24}
							height={42}
							className="dark:invert"
							priority
						/>
					</Link>

					<div className="flex items-center gap-2 sm:gap-3">
						<button
							type="button"
							onClick={() => setTheme(theme === "light" ? "dark" : "light")}
							className="p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
							aria-label="Toggle theme"
						>
							{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
						</button>

						{!isSignedIn ? (
							<>
								<SignInButton mode="redirect">
									<button
										type="button"
										className="hidden sm:inline-flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
									>
										Sign In
									</button>
								</SignInButton>

								<SignUpButton mode="redirect">
									<button
										type="button"
										className="inline-flex items-center px-5 py-2 text-sm font-semibold rounded-full bg-foreground text-background hover:opacity-80 transition-opacity"
									>
										Get Started
									</button>
								</SignUpButton>
							</>
						) : (
							<>
								<Link
									href="/dashboard"
									className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-full hover:bg-muted"
								>
									Dashboard
								</Link>
								<Link
									href="/projects"
									className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors rounded-full hover:bg-muted"
								>
									Projects
								</Link>
								<NotificationDropdown />
								<CustomUserButton />
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
