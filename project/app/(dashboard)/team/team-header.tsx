"use client";

import { UserPlus } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

export function TeamHeader() {
	const { openInviteMemberModal } = useUIStore();

	return (
		<div className="flex justify-between items-center">
			<div>
				<h1 className="text-3xl font-bold text-foreground">Team</h1>
				<p className="text-muted-foreground mt-2">
					Manage team members and permissions
				</p>
			</div>
			<button
				type="button"
				onClick={openInviteMemberModal}
				className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
			>
				<UserPlus size={20} className="mr-2" />
				Invite Member
			</button>
		</div>
	);
}
