"use client";

import { Menu } from "lucide-react";
import type React from "react";
import { Suspense, useState } from "react";
import { CustomUserButton } from "@/components/custom-user-button";
import { GlobalSearch } from "@/components/global-search";
import { CalendarTaskPreviewModal } from "@/components/modals/calendar-task-preview-modal";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { CreateProjectModal } from "@/components/modals/create-project-modal";
import { CreateTaskModal } from "@/components/modals/create-task-modal";
import { EditProjectModal } from "@/components/modals/edit-project-modal";
import { InviteMemberModal } from "@/components/modals/invite-member-modal";
import { SetPasswordModal } from "@/components/modals/set-password-modal";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
	children,
	customAvatarUrl,
	googleAvatarUrl,
}: {
	children: React.ReactNode;
	customAvatarUrl?: string | null;
	googleAvatarUrl?: string | null;
}) {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	return (
		<div className="min-h-screen">
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
				<div className="sticky top-0 z-30 flex h-20 items-center gap-x-4 border-b border-border bg-background/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
					<button
						type="button"
						onClick={() => setMobileOpen(true)}
						className="lg:hidden p-2 rounded-lg hover:bg-muted"
					>
						<Menu size={20} />
					</button>

					<div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
						<div className="flex flex-1 items-center"></div>

						<div className="flex items-center gap-x-4 lg:gap-x-6">
							<GlobalSearch />

							<NotificationDropdown />

							<ThemeToggle />

							<div className="flex items-center justify-center">
								<CustomUserButton
									customAvatarUrl={customAvatarUrl}
									googleAvatarUrl={googleAvatarUrl}
								/>
							</div>
						</div>
					</div>
				</div>

				<main className="py-8 px-4 sm:px-6 lg:px-8">
					<Suspense>{children}</Suspense>
				</main>
			</div>
			<CreateProjectModal />
			<EditProjectModal />
			<CreateTaskModal />
			<CalendarTaskPreviewModal />
			<SetPasswordModal />
			<InviteMemberModal />
			<ConfirmModal />
		</div>
	);
}
