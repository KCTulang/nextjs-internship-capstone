"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { inviteMemberAction } from "@/app/actions/members";
import { useProjectStore } from "@/hooks/use-projects";
import { PROJECT_ROLES } from "@/lib/roles";
import { useUIStore } from "@/stores/ui-store";

export function InviteMemberModal() {
	const { isInviteMemberModalOpen, closeInviteMemberModal } = useUIStore();
	const { projects, fetchProjects } = useProjectStore();

	const [email, setEmail] = useState("");
	const [projectId, setProjectId] = useState("");
	const [role, setRole] = useState("member");
	const [projectRole, setProjectRole] = useState(PROJECT_ROLES[0].toString());
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (isInviteMemberModalOpen && projects.length === 0) {
			fetchProjects();
		}
	}, [isInviteMemberModalOpen, fetchProjects, projects.length]);

	useEffect(() => {
		if (projects.length > 0 && !projectId) {
			setProjectId(projects[0].id);
		}
	}, [projects, projectId]);

	if (!isInviteMemberModalOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim() || !projectId) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const res = await inviteMemberAction({
				projectId,
				email: email.trim(),
				role,
				projectRole,
			});

			if (res.success) {
				setEmail("");
				closeInviteMemberModal();
				useUIStore.getState().addToast({
					type: "success",
					message: "Member invited successfully!",
				});
			} else {
				setError(res.error || "Failed to invite member");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) closeInviteMemberModal();
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="invite-member-title"
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			onClick={handleBackdropClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					handleBackdropClick(e as unknown as React.MouseEvent);
				}
			}}
		>
			<div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3
							id="invite-member-title"
							className="text-xl font-semibold text-foreground"
						>
							Invite Member
						</h3>
						<p className="text-sm text-muted-foreground mt-0.5">
							Add a new member to your project
						</p>
					</div>
					<button
						type="button"
						onClick={closeInviteMemberModal}
						className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
					>
						<X size={18} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
							{error}
						</div>
					)}
					<div className="space-y-2">
						<label htmlFor="email" className="block text-sm font-medium">
							Email Address
						</label>
						<input
							id="email"
							type="email"
							placeholder="colleague@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
							required
						/>
					</div>

					<div className="space-y-2">
						<label htmlFor="project" className="block text-sm font-medium">
							Select Project
						</label>
						<select
							id="project"
							value={projectId}
							onChange={(e) => setProjectId(e.target.value)}
							className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
							required
						>
							<option value="" disabled>
								Select a project
							</option>
							{projects.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-2">
						<label htmlFor="role" className="block text-sm font-medium">
							Permission Level
						</label>
						<select
							id="role"
							value={role}
							onChange={(e) => setRole(e.target.value)}
							className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="member">Member</option>
							<option value="admin">Admin</option>
						</select>
					</div>

					<div className="space-y-2">
						<label htmlFor="projectRole" className="block text-sm font-medium">
							Project Role
						</label>
						<select
							id="projectRole"
							value={projectRole}
							onChange={(e) => setProjectRole(e.target.value)}
							className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
						>
							{PROJECT_ROLES.map((pr) => (
								<option key={pr} value={pr}>
									{pr}
								</option>
							))}
						</select>
					</div>

					<div className="flex justify-end gap-3 mt-6">
						<button
							type="button"
							onClick={closeInviteMemberModal}
							className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || projects.length === 0}
							className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Inviting...
								</>
							) : (
								"Send Invite"
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
