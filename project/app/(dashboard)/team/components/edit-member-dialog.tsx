"use client";

import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateProjectMemberAction } from "@/app/actions/members";
import { PROJECT_ROLES } from "@/lib/roles";
import { useUIStore } from "@/stores/ui-store";
import type { TeamMember } from "../types";

interface EditMemberDialogProps {
	member: TeamMember;
	projectId: string;
	projectName: string;
	currentRole: string;
	currentProjectRole: string;
	readOnly?: boolean;
	onClose: () => void;
}

export function EditMemberDialog({
	member,
	projectId,
	projectName,
	currentRole,
	currentProjectRole,
	readOnly = false,
	onClose,
}: EditMemberDialogProps) {
	const router = useRouter();
	const [role, setRole] = useState(currentRole);
	const [projectRole, setProjectRole] = useState(currentProjectRole || "Other");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		const updates: { role?: string; projectRole?: string } = {};
		if (role !== currentRole) updates.role = role;
		if (projectRole !== currentProjectRole) updates.projectRole = projectRole;

		if (Object.keys(updates).length === 0) {
			onClose();
			return;
		}

		const res = await updateProjectMemberAction(projectId, member.id, updates);
		if (res.success) {
			useUIStore
				.getState()
				.addToast({ type: "success", message: "Member updated successfully." });
			router.refresh();
			onClose();
		} else {
			setError(res.error || "Failed to update member");
		}
		setIsSubmitting(false);
	};

	return (
		<div
			role="dialog"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
			aria-modal="true"
			aria-labelledby="edit-member-title"
			className="fixed inset-0 z-200 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 text-left"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div className="bg-card border border-border shadow-2xl rounded-xl p-5 w-full max-w-100 animate-in fade-in zoom-in-95 duration-200">
				<div className="flex items-start justify-between mb-5">
					<div>
						<h2
							id="edit-member-title"
							className="text-lg font-semibold text-foreground"
						>
							{readOnly ? "View Member" : "Edit Member"}
						</h2>
						<p className="text-[13px] text-muted-foreground mt-1 leading-snug pr-4">
							{readOnly ? (
								<span>
									Viewing access permissions and project role for this member in{" "}
									<span className="font-medium text-foreground">
										{projectName}
									</span>
									.
								</span>
							) : (
								<span>
									Update access permissions and project role for this member in{" "}
									<span className="font-medium text-foreground">
										{projectName}
									</span>
									.
								</span>
							)}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close dialog"
						className="p-1 -mt-1 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
					>
						<X size={16} />
					</button>
				</div>

				<div className="flex items-center gap-3 mb-5 pb-5 border-b border-border/50">
					<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
						{(member.name || member.email).substring(0, 2).toUpperCase()}
					</div>
					<div className="min-w-0">
						<p className="font-medium text-sm text-foreground truncate">
							{member.name || member.email.split("@")[0]}
						</p>
						<p className="text-xs text-muted-foreground truncate">
							{member.email}
						</p>
					</div>
				</div>

				{error && (
					<div className="mb-4 p-3 text-[13px] text-destructive bg-destructive/10 rounded-lg border border-destructive/20 leading-snug">
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="space-y-1.5">
						<label
							htmlFor="edit-permission"
							className="block text-sm font-semibold text-foreground"
						>
							Permission Level
						</label>
						<p className="text-xs text-muted-foreground leading-snug pb-1">
							Controls the member's authorization and access rights.
						</p>
						<select
							id="edit-permission"
							value={role}
							onChange={(e) => setRole(e.target.value)}
							disabled={readOnly}
							className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<option value="admin">Admin</option>
							<option value="member">Member</option>
							<option value="viewer">Viewer</option>
						</select>
					</div>

					<div className="space-y-1.5">
						<label
							htmlFor="edit-project-role"
							className="block text-sm font-semibold text-foreground"
						>
							Project Role / Job Title
						</label>
						<p className="text-xs text-muted-foreground leading-snug pb-1">
							Describes the member's responsibility on this project.
						</p>
						<select
							id="edit-project-role"
							value={projectRole}
							onChange={(e) => setProjectRole(e.target.value)}
							disabled={readOnly}
							className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{PROJECT_ROLES.map((pr) => (
								<option key={pr} value={pr}>
									{pr}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center justify-end gap-2.5 pt-3">
						{readOnly ? (
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								Close
							</button>
						) : (
							<>
								<button
									type="button"
									onClick={onClose}
									className="px-4 py-2 text-sm font-medium text-foreground rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											Saving...
										</>
									) : (
										"Save Changes"
									)}
								</button>
							</>
						)}
					</div>
				</form>
			</div>
		</div>
	);
}
