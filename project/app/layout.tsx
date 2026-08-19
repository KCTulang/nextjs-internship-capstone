import type { Metadata } from "next";
import { Inter } from "next/font/google";

import type React from "react";

import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { AmbientGlow } from "@/components/ambient-glow";
import { LockInOverlay } from "@/components/lock-in-overlay";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "LockIn — Tune out the noise",
	description:
		"A Kanban workspace to manage your projects and execute your deliverables. Tune out the noise. Lock into your work.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<ClerkProvider
			appearance={{
				elements: {
					userButtonPopoverCard:
						"bg-card border border-border shadow-xl rounded-xl",
					userButtonPopoverActionButton:
						"hover:bg-muted text-foreground transition-colors",
					userButtonPopoverActionButtonText: "text-foreground font-medium",
					userButtonPopoverActionButtonIconBox: "text-foreground",
					userPreviewMainIdentifier: "text-foreground font-semibold",
					userPreviewSecondaryIdentifier: "text-muted-foreground",
					userButtonPopoverFooter: "border-border",
				},
			}}
		>
			<html
				lang="en"
				suppressHydrationWarning
				className="h-full antialiased"
				data-scroll-behavior="smooth"
			>
				<body
					className={`${inter.className} min-h-full flex flex-col`}
					suppressHydrationWarning
				>
					<LockInOverlay />
					<ThemeProvider>
						<AmbientGlow />
						<Toaster />
						{children}
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
