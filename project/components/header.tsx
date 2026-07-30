"use client";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "./theme-provider";

export function Header() {
	const { theme, setTheme } = useTheme();
	const { isSignedIn } = useAuth();

	return (
		<header className="border-b border-french_gray-300 dark:border-paynes_gray-400 bg-white/80 dark:bg-outer_space-500/80 backdrop-blur-sm">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center">
						<Link href="/" className="text-2xl font-bold text-blue_munsell-500">
							TaskFlow
						</Link>
					</div>

					<div className="flex items-center space-x-4">
						<button
							type="button"
							onClick={() => setTheme(theme === "light" ? "dark" : "light")}
							className="p-2 rounded-lg bg-platinum-500 dark:bg-paynes_gray-500 text-outer_space-500 dark:text-platinum-500 hover:bg-french_gray-500 dark:hover:bg-paynes_gray-400 transition-colors"
						>
							{theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
						</button>

						{!isSignedIn ? (
							<>
								<SignInButton mode="modal">
									<button
										type="button"
										className="px-4 py-2 text-outer_space-500 dark:text-platinum-500 hover:text-blue_munsell-500 transition-colors font-medium"
									>
										Sign In
									</button>
								</SignInButton>
								<SignUpButton mode="modal">
									<button
										type="button"
										className="px-4 py-2 bg-blue_munsell-500 text-white rounded-lg hover:bg-blue_munsell-600 transition-colors font-medium"
									>
										Sign Up
									</button>
								</SignUpButton>
							</>
						) : (
							<>
								<Link
									href="/dashboard"
									className="px-4 py-2 text-outer_space-500 dark:text-platinum-500 hover:text-blue_munsell-500 transition-colors font-medium mr-2"
								>
									Dashboard
								</Link>
								<Link
									href="/projects"
									className="px-4 py-2 text-outer_space-500 dark:text-platinum-500 hover:text-blue_munsell-500 transition-colors font-medium mr-2"
								>
									Projects
								</Link>
								<UserButton />
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}
