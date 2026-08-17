"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeMemberAction } from "@/app/actions/members";
import { useUIStore } from "@/stores/ui-store";
import type { TeamMember } from "../types";

interface RemoveMemberDialogProps {
	member: TeamMember;
	projectId: string;
	projectName: string;
	onClose: () => void;
	onRemoved: (memberId: string, projectId: string) => void;
}

export function RemoveMemberDialog({
	member,
	projectId,
	projectName,
	onClose,
	onRemoved,
}: RemoveMemberDialogProps) {
	const router = useRouter();
	const [isRemoving, setIsRemoving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleRemove = async () => {
		setIsRemoving(true);
		setError(null);
		const res = await removeMemberAction(projectId, member.id);
		if (res.success) {
			useUIStore
				.getState()
				.addToast({ type: "success", message: "Member removed." });
			onRemoved(member.id, projectId);
			router.refresh();
			onClose();
		} else {
			setError(res.error || "Failed to remove member");
		}
		setIsRemoving(false);
	};

	return (
		<div
			role="dialog"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			aria-modal="true"
			aria-labelledby="remove-member-title"
			className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 text-left"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
				<div className="flex items-start gap-4 mb-4">
					<div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
						<AlertTriangle size={20} />
					</div>
					<div>
						<h2
							id="remove-member-title"
							className="text-lg font-semibold text-foreground"
						>
							Remove Member?
						</h2>
						<p className="text-sm text-muted-foreground mt-1">
							Are you sure you want to remove{" "}
							<span className="font-medium text-foreground">
								{member.name || member.email}
							</span>{" "}
							from{" "}
							<span className="font-medium text-foreground">{projectName}</span>
							?
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							This will revoke their access to the project.
						</p>
					</div>
				</div>

				{error && (
					<div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
						{error}
					</div>
				)}

				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						disabled={isRemoving}
						className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleRemove}
						disabled={isRemoving}
						className="inline-flex items-center px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
					>
						{isRemoving ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Removing...
							</>
						) : (
							"Remove Member"
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
