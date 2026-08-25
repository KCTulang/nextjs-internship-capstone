"use client";

import {
	Loader2,
	Mail,
	RefreshCw,
	Shield,
	Trash2,
	UserPlus,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	cancelInvitationAction,
	getPendingInvitationsByProjectAction,
	inviteMemberAction,
	leaveProjectAction,
	removeMemberAction,
	resendInvitationAction,
	updateProjectMemberAction,
} from "@/app/actions/members";
import { Skeleton } from "@/components/ui/skeleton";
import {
	isMembershipPermission,
	MEMBERSHIP_PERMISSIONS,
	type MembershipPermission,
	PROJECT_PERMISSION_DESCRIPTIONS,
	PROJECT_PERMISSION_LABELS,
	type ProjectPermission,
} from "@/lib/project-permissions";
import { useUIStore } from "@/stores/ui-store";
import { PROJECT_ROLES } from "@/utils/roles";

interface ProjectMemberSource {
	userId: string;
	role: string;
	projectRole: string;
	user: { id: string; name: string; email: string };
}

interface ProjectMembersModalProps {
	project: {
		id: string;
		name: string;
		ownerId: string;
		owner: { id: string; name: string; email: string };
		members: ProjectMemberSource[];
	};
	currentUserId: string;
	permission: ProjectPermission;
	canManageMembers: boolean;
}

interface RosterMember {
	id: string;
	name: string;
	email: string;
	permission: ProjectPermission;
	projectRole: string;
}

interface PendingInvitation {
	id: string;
	email: string;
	role: string;
	projectRole: string;
	createdAt: Date | string | null;
}

type View = "roster" | "invite" | "edit" | "remove" | "leave";

const invitationSkeletonIds = ["invitation-one", "invitation-two"];

function initials(name: string, email: string) {
	return (name || email).slice(0, 2).toUpperCase();
}

export function ProjectMembersModal({
	project,
	currentUserId,
	permission,
	canManageMembers,
}: ProjectMembersModalProps) {
	const router = useRouter();
	const { isProjectMembersModalOpen, closeProjectMembersModal, addToast } =
		useUIStore();
	const [view, setView] = useState<View>("roster");
	const [selectedMember, setSelectedMember] = useState<RosterMember | null>(
		null,
	);
	const [pendingInvitations, setPendingInvitations] = useState<
		PendingInvitation[]
	>([]);
	const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
	const [invitationsError, setInvitationsError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<MembershipPermission>("member");
	const [projectRole, setProjectRole] = useState("Other");

	const roster = useMemo<RosterMember[]>(() => {
		const membershipByUser = new Map(
			project.members.map((member) => [member.userId, member]),
		);
		const rows = new Map<string, RosterMember>();
		const ownerMembership = membershipByUser.get(project.ownerId);
		rows.set(project.ownerId, {
			...project.owner,
			permission: "owner",
			projectRole: ownerMembership?.projectRole || "Project Owner",
		});
		for (const member of project.members) {
			if (member.userId === project.ownerId) continue;
			rows.set(member.userId, {
				...member.user,
				permission: isMembershipPermission(member.role)
					? member.role
					: "member",
				projectRole: member.projectRole || "Other",
			});
		}
		return Array.from(rows.values());
	}, [project]);

	const loadPendingInvitations = useCallback(async () => {
		setIsLoadingInvitations(true);
		setInvitationsError(null);
		try {
			const result = await getPendingInvitationsByProjectAction(project.id);
			if (result.success) {
				setPendingInvitations(result.data ?? []);
			} else {
				setInvitationsError(
					result.error || "Unable to load pending invitations.",
				);
			}
		} catch {
			setInvitationsError("Unable to load pending invitations.");
		} finally {
			setIsLoadingInvitations(false);
		}
	}, [project.id]);

	useEffect(() => {
		if (!isProjectMembersModalOpen) return;
		setView("roster");
		setSelectedMember(null);
		setError(null);
		if (!canManageMembers) return;
		void loadPendingInvitations();
	}, [canManageMembers, isProjectMembersModalOpen, loadPendingInvitations]);

	if (!isProjectMembersModalOpen) return null;

	const close = () => {
		setView("roster");
		setSelectedMember(null);
		setError(null);
		setInvitationsError(null);
		closeProjectMembersModal();
	};

	const submitInvite = async (event: React.FormEvent) => {
		event.preventDefault();
		setIsSubmitting(true);
		setError(null);
		const result = await inviteMemberAction({
			projectId: project.id,
			email: email.trim(),
			role,
			projectRole,
		});
		setIsSubmitting(false);
		if (!result.success) {
			setError(result.error || "Failed to send invitation.");
			return;
		}
		if (result.data) {
			setPendingInvitations((current) => [result.data, ...current]);
		}
		setEmail("");
		setRole("member");
		setProjectRole("Other");
		setView("roster");
		addToast({ type: "success", message: "Invitation sent." });
	};

	const submitEdit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!selectedMember || selectedMember.permission === "owner") return;
		setIsSubmitting(true);
		setError(null);
		const result = await updateProjectMemberAction(
			project.id,
			selectedMember.id,
			{ role, projectRole },
		);
		setIsSubmitting(false);
		if (!result.success) {
			setError(result.error || "Failed to update member.");
			return;
		}
		addToast({ type: "success", message: "Member access updated." });
		router.refresh();
		setView("roster");
	};

	const submitRemoval = async () => {
		if (!selectedMember) return;
		setIsSubmitting(true);
		const result = await removeMemberAction(project.id, selectedMember.id);
		setIsSubmitting(false);
		if (!result.success) {
			setError(result.error || "Failed to remove member.");
			return;
		}
		addToast({ type: "success", message: "Member removed from project." });
		router.refresh();
		setView("roster");
	};

	const submitLeave = async () => {
		setIsSubmitting(true);
		const result = await leaveProjectAction(project.id);
		setIsSubmitting(false);
		if (!result.success) {
			setError(result.error || "Failed to leave project.");
			return;
		}
		close();
		addToast({ type: "success", message: `You left ${project.name}.` });
		router.push("/dashboard");
		router.refresh();
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="project-members-title"
			className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
			onClick={(event) => event.target === event.currentTarget && close()}
			onKeyDown={(event) => event.key === "Escape" && close()}
		>
			<div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
				<header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
					<div>
						<h2
							id="project-members-title"
							className="text-lg font-semibold text-foreground"
						>
							{view === "invite"
								? "Add Member"
								: view === "edit"
									? "Edit Member"
									: view === "remove"
										? "Remove Member"
										: view === "leave"
											? "Leave Project"
											: `Project Members (${roster.length})`}
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
					</div>
					<button
						type="button"
						onClick={close}
						aria-label="Close members"
						className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<X size={18} />
					</button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
					{error && (
						<p className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{error}
						</p>
					)}

					{view === "roster" && (
						<div className="space-y-6">
							<div className="space-y-2">
								{roster.map((member) => {
									const isOwner = member.permission === "owner";
									const canEdit =
										canManageMembers && !isOwner && member.id !== currentUserId;
									return (
										<div
											key={member.id}
											className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-3"
										>
											<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
												{initials(member.name, member.email)}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2">
													<p className="truncate text-sm font-semibold text-foreground">
														{member.name || member.email.split("@")[0]}
													</p>
													<span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
														{PROJECT_PERMISSION_LABELS[member.permission]}
													</span>
												</div>
												<p className="truncate text-xs text-muted-foreground">
													{member.email}
												</p>
												<p className="mt-1 text-xs text-muted-foreground">
													{member.projectRole}
												</p>
											</div>
											{canEdit && (
												<div className="flex shrink-0 gap-1">
													<button
														type="button"
														onClick={() => {
															setSelectedMember(member);
															if (isMembershipPermission(member.permission)) {
																setRole(member.permission);
															}
															setProjectRole(member.projectRole);
															setView("edit");
														}}
														aria-label={`Edit ${member.name}`}
														className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
													>
														<Shield size={16} />
													</button>
													<button
														type="button"
														onClick={() => {
															setSelectedMember(member);
															setView("remove");
														}}
														aria-label={`Remove ${member.name}`}
														className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
													>
														<Trash2 size={16} />
													</button>
												</div>
											)}
										</div>
									);
								})}
							</div>

							{canManageMembers && (
								<section className="border-t border-border pt-5">
									<div className="mb-3 flex items-center justify-between gap-3">
										<div>
											<h3 className="text-sm font-semibold text-foreground">
												Pending Invitations
												{!isLoadingInvitations &&
													!invitationsError &&
													` (${pendingInvitations.length})`}
											</h3>
											<p className="text-xs text-muted-foreground">
												Invitations awaiting a response.
											</p>
										</div>
										<button
											type="button"
											onClick={() => setView("invite")}
											className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										>
											<UserPlus size={15} /> Add Member
										</button>
									</div>
									{isLoadingInvitations ? (
										<div role="status" aria-busy="true" className="space-y-2">
											<span className="sr-only">
												Loading pending invitations
											</span>
											{invitationSkeletonIds.map((id) => (
												<div
													key={id}
													aria-hidden="true"
													className="flex items-center gap-3 rounded-lg border border-border/70 p-3"
												>
													<Skeleton className="size-4 shrink-0" />
													<div className="flex-1 space-y-2">
														<Skeleton className="h-3.5 w-3/5" />
														<Skeleton className="h-3 w-2/5" />
													</div>
													<Skeleton className="size-8 rounded-md" />
												</div>
											))}
										</div>
									) : invitationsError ? (
										<div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
											<p className="text-sm text-destructive">
												{invitationsError}
											</p>
											<button
												type="button"
												onClick={() => void loadPendingInvitations()}
												className="mt-2 text-xs font-semibold text-destructive underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												Try again
											</button>
										</div>
									) : pendingInvitations.length === 0 ? (
										<p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
											No pending invitations.
										</p>
									) : (
										<div className="space-y-2">
											{pendingInvitations.map((invite) => (
												<div
													key={invite.id}
													className="flex items-center gap-3 rounded-lg border border-border/70 p-3"
												>
													<Mail
														size={16}
														className="shrink-0 text-muted-foreground"
													/>
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium text-foreground">
															{invite.email}
														</p>
														<p className="text-xs text-muted-foreground">
															{invite.projectRole} ·{" "}
															{
																PROJECT_PERMISSION_LABELS[
																	isMembershipPermission(invite.role)
																		? invite.role
																		: "member"
																]
															}
														</p>
													</div>
													<button
														type="button"
														aria-label={`Resend invitation to ${invite.email}`}
														onClick={async () => {
															const result = await resendInvitationAction(
																invite.id,
															);
															addToast({
																type: result.success ? "success" : "error",
																message: result.success
																	? "Invitation resent."
																	: result.error || "Failed to resend.",
															});
														}}
														className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
													>
														<RefreshCw size={14} />
													</button>
													<button
														type="button"
														aria-label={`Cancel invitation to ${invite.email}`}
														onClick={async () => {
															const result = await cancelInvitationAction(
																invite.id,
															);
															if (result.success)
																setPendingInvitations((current) =>
																	current.filter(
																		(item) => item.id !== invite.id,
																	),
																);
															addToast({
																type: result.success ? "success" : "error",
																message: result.success
																	? "Invitation cancelled."
																	: result.error || "Failed to cancel.",
															});
														}}
														className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
													>
														<X size={14} />
													</button>
												</div>
											))}
										</div>
									)}
								</section>
							)}

							<section className="border-t border-border pt-5">
								<h3 className="text-sm font-semibold text-foreground">
									Your Membership
								</h3>
								<p className="mt-1 text-xs text-muted-foreground">
									You have {PROJECT_PERMISSION_LABELS[permission]} access to
									this project.
								</p>
								{permission === "owner" ? (
									<p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
										You own this project. Ownership transfer is required before
										leaving.
									</p>
								) : (
									<button
										type="button"
										onClick={() => setView("leave")}
										className="mt-3 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									>
										Leave Project
									</button>
								)}
							</section>
						</div>
					)}

					{view === "invite" && (
						<form onSubmit={submitInvite} className="space-y-4">
							<label className="block text-sm font-medium text-foreground">
								Email Address
								<input
									type="email"
									required
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									placeholder="colleague@example.com"
								/>
							</label>
							<label className="block text-sm font-medium text-foreground">
								Permission Level
								<select
									value={role}
									onChange={(event) => {
										if (isMembershipPermission(event.target.value)) {
											setRole(event.target.value);
										}
									}}
									className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								>
									{MEMBERSHIP_PERMISSIONS.map((item) => (
										<option key={item} value={item}>
											{PROJECT_PERMISSION_LABELS[item]}
										</option>
									))}
								</select>
								<span className="mt-1.5 block text-xs text-muted-foreground">
									{PROJECT_PERMISSION_DESCRIPTIONS[role]}
								</span>
							</label>
							<label className="block text-sm font-medium text-foreground">
								Project Role / Job Title
								<select
									value={projectRole}
									onChange={(event) => setProjectRole(event.target.value)}
									className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
								>
									{PROJECT_ROLES.map((item) => (
										<option key={item} value={item}>
											{item}
										</option>
									))}
								</select>
								<span className="mt-1.5 block text-xs text-muted-foreground">
									Descriptive only; it does not grant access.
								</span>
							</label>
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={() => setView("roster")}
									className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting || !email.trim()}
									className="inline-flex min-w-28 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
								>
									{isSubmitting ? (
										<Loader2 size={16} className="animate-spin" />
									) : (
										"Send Invite"
									)}
								</button>
							</div>
						</form>
					)}

					{view === "edit" &&
						selectedMember &&
						selectedMember.permission !== "owner" && (
							<form onSubmit={submitEdit} className="space-y-4">
								<div className="rounded-xl border border-border bg-muted/30 p-3">
									<p className="font-medium text-foreground">
										{selectedMember.name}
									</p>
									<p className="text-sm text-muted-foreground">
										{selectedMember.email}
									</p>
								</div>
								<label className="block text-sm font-medium text-foreground">
									Permission Level
									<select
										value={role}
										onChange={(event) => {
											if (isMembershipPermission(event.target.value)) {
												setRole(event.target.value);
											}
										}}
										className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
									>
										{MEMBERSHIP_PERMISSIONS.map((item) => (
											<option key={item} value={item}>
												{PROJECT_PERMISSION_LABELS[item]}
											</option>
										))}
									</select>
									<span className="mt-1.5 block text-xs text-muted-foreground">
										{PROJECT_PERMISSION_DESCRIPTIONS[role]}
									</span>
								</label>
								<label className="block text-sm font-medium text-foreground">
									Project Role / Job Title
									<select
										value={projectRole}
										onChange={(event) => setProjectRole(event.target.value)}
										className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
									>
										{PROJECT_ROLES.map((item) => (
											<option key={item} value={item}>
												{item}
											</option>
										))}
									</select>
								</label>
								<div className="flex justify-end gap-2">
									<button
										type="button"
										onClick={() => setView("roster")}
										className="rounded-lg px-4 py-2 text-sm hover:bg-muted"
									>
										Cancel
									</button>
									<button
										type="submit"
										disabled={isSubmitting}
										className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
									>
										{isSubmitting ? "Saving…" : "Save Changes"}
									</button>
								</div>
							</form>
						)}

					{view === "remove" && selectedMember && (
						<div>
							<p className="text-sm text-muted-foreground">
								Remove{" "}
								<span className="font-semibold text-foreground">
									{selectedMember.name || selectedMember.email}
								</span>{" "}
								from {project.name}? They will lose project access.
							</p>
							<div className="mt-6 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setView("roster")}
									className="rounded-lg px-4 py-2 text-sm hover:bg-muted"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={submitRemoval}
									disabled={isSubmitting}
									className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
								>
									{isSubmitting ? "Removing…" : "Remove Member"}
								</button>
							</div>
						</div>
					)}

					{view === "leave" && (
						<div>
							<p className="text-sm text-muted-foreground">
								Leave{" "}
								<span className="font-semibold text-foreground">
									{project.name}
								</span>
								? You will lose access unless an owner or admin invites you
								again.
							</p>
							<div className="mt-6 flex justify-end gap-2">
								<button
									type="button"
									onClick={() => setView("roster")}
									className="rounded-lg px-4 py-2 text-sm hover:bg-muted"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={submitLeave}
									disabled={isSubmitting}
									className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:opacity-50"
								>
									{isSubmitting ? "Leaving…" : "Leave Project"}
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
