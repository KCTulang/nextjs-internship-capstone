"use client";

import {
	Bell,
	Calendar,
	Check,
	Eye,
	LayoutGrid,
	List,
	Loader2,
	MoreHorizontal,
	RefreshCw,
	Search,
	SendHorizontal,
	Shield,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
	cancelInvitationAction,
	resendInvitationAction,
	respondToInvitationAction,
} from "@/app/actions/members";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	PROJECT_PERMISSION_LABELS,
	PROJECT_PERMISSIONS,
} from "@/lib/project-permissions";
import { useUIStore } from "@/stores/ui-store";
import { PROJECT_ROLES } from "@/utils/roles";
import { EditMemberDialog } from "./components/edit-member-dialog";
import { RemoveMemberDialog } from "./components/remove-member-dialog";
import { filterTeamMembers, getProjectRoleOptions } from "./team-filters";
import type { MemberRole, ProjectInvitation, TeamMember } from "./types";

type Tab = "members" | "invitations" | "my-invitations";
const VALID_TABS: Tab[] = ["members", "invitations", "my-invitations"];
type ViewMode = "card" | "list";

interface TeamPageClientProps {
	initialMembers: TeamMember[];
	initialMyInvites: ProjectInvitation[];
	initialSentInvites: ProjectInvitation[];
	currentUserId: string;
	initialLoadError?: string;
}

function AccessBadge({ role }: { role: string }) {
	const styles: Record<string, string> = {
		owner: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
		admin: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
		member: "bg-muted text-muted-foreground",
		viewer: "bg-muted text-muted-foreground",
	};
	return (
		<span
			className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[role] ?? styles.member}`}
		>
			{role.charAt(0).toUpperCase() + role.slice(1)}
		</span>
	);
}

function MembershipLine({ membership }: { membership: MemberRole }) {
	const projectRole = membership.projectRole.trim();

	return (
		<div className="flex items-center gap-2 flex-wrap">
			<span
				className="text-xs text-muted-foreground font-medium truncate max-w-32"
				title={membership.projectName}
			>
				{membership.projectName}
			</span>
			{projectRole && (
				<>
					<span className="text-muted-foreground/40 text-xs" aria-hidden>
						·
					</span>
					<span className="text-xs text-foreground">{projectRole}</span>
				</>
			)}
			<span className="text-muted-foreground/40 text-xs" aria-hidden>
				·
			</span>
			<AccessBadge role={membership.role} />
		</div>
	);
}

function StatusDot({ label = "Active" }: { label?: string }) {
	return (
		<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
			<span
				className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
				aria-hidden
			/>
			{label}
		</span>
	);
}

function Avatar({ name, email }: { name: string; email: string }) {
	const initials = (name || email).substring(0, 2).toUpperCase();
	return (
		<div
			className="w-9 h-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold select-none"
			aria-hidden
		>
			{initials}
		</div>
	);
}
function MemberMenu({
	member,
	currentUser,
	onEdit,
	onRemove,
}: {
	member: TeamMember;
	currentUser: TeamMember | null;
	onEdit: (r: {
		projectId: string;
		projectName: string;
		role: string;
		projectRole: string;
		readOnly?: boolean;
	}) => void;
	onRemove: (r: { projectId: string; projectName: string }) => void;
}) {
	if (member.roles.every((r) => r.role === "owner")) return null;

	const nonOwnerRoles = member.roles.filter((r) => r.role !== "owner");

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={`Open actions for ${member.name || member.email}`}
					className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<MoreHorizontal size={16} />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{nonOwnerRoles.map((r, idx) => {
					const isSelf = member.id === currentUser?.id;
					const currentUserProjectRole = currentUser?.roles.find(
						(cr) => cr.projectId === r.projectId,
					)?.role;
					const canManage =
						!isSelf &&
						r.role !== "owner" &&
						(currentUserProjectRole === "admin" ||
							currentUserProjectRole === "owner");

					return (
						<div key={r.projectId}>
							{nonOwnerRoles.length > 1 && (
								<p className="px-2 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
									{r.projectName}
								</p>
							)}

							<DropdownMenuItem
								onClick={() =>
									onEdit({
										projectId: r.projectId,
										projectName: r.projectName,
										role: r.role,
										projectRole: r.projectRole,
										readOnly: !canManage,
									})
								}
								className="flex items-center gap-2.5 cursor-pointer py-2"
							>
								{canManage ? (
									<>
										<Shield
											size={14}
											className="shrink-0 text-muted-foreground"
										/>
										<span className="truncate font-medium">
											Edit Role &amp; Permission
										</span>
									</>
								) : (
									<>
										<Eye size={14} className="shrink-0 text-muted-foreground" />
										<span className="truncate font-medium">
											View Role &amp; Access
										</span>
									</>
								)}
							</DropdownMenuItem>

							{canManage && (
								<DropdownMenuItem
									onClick={() =>
										onRemove({
											projectId: r.projectId,
											projectName: r.projectName,
										})
									}
									className="flex items-center gap-2.5 cursor-pointer py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
								>
									<X size={14} className="shrink-0" />
									<span className="truncate font-medium">
										Remove from Project
									</span>
								</DropdownMenuItem>
							)}

							{idx < nonOwnerRoles.length - 1 && (
								<DropdownMenuSeparator className="my-1" />
							)}
						</div>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MemberCard({
	member,
	currentUser,
	onRemoved,
}: {
	member: TeamMember;
	currentUser: TeamMember | null;
	onRemoved: (id: string, projectId: string) => void;
}) {
	const [editTarget, setEditTarget] = useState<{
		projectId: string;
		projectName: string;
		role: string;
		projectRole: string;
		readOnly?: boolean;
	} | null>(null);
	const [removeTarget, setRemoveTarget] = useState<{
		projectId: string;
		projectName: string;
	} | null>(null);

	if (member.roles.length === 0) return null;

	return (
		<>
			<div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3 hover:border-border/80 transition-colors">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-3 min-w-0">
						<Avatar name={member.name} email={member.email} />
						<div className="min-w-0">
							<p className="font-semibold text-foreground text-sm truncate leading-tight">
								{member.name || member.email.split("@")[0]}
							</p>
							<p className="text-xs text-muted-foreground truncate mt-0.5">
								{member.email}
							</p>
						</div>
					</div>
					<MemberMenu
						member={member}
						currentUser={currentUser}
						onEdit={setEditTarget}
						onRemove={setRemoveTarget}
					/>
				</div>

				<div className="space-y-1">
					{member.roles.map((r) => (
						<MembershipLine key={r.projectId} membership={r} />
					))}
				</div>

				<div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
					<StatusDot />
					<span className="text-xs text-muted-foreground">
						{member.roles.length}{" "}
						{member.roles.length === 1 ? "project" : "projects"}
					</span>
				</div>
			</div>

			{editTarget && (
				<EditMemberDialog
					member={member}
					projectId={editTarget.projectId}
					projectName={editTarget.projectName}
					currentRole={editTarget.role}
					currentProjectRole={editTarget.projectRole}
					readOnly={editTarget.readOnly}
					onClose={() => setEditTarget(null)}
				/>
			)}

			{removeTarget && (
				<RemoveMemberDialog
					member={member}
					projectId={removeTarget.projectId}
					projectName={removeTarget.projectName}
					onClose={() => setRemoveTarget(null)}
					onRemoved={() => {
						onRemoved(member.id, removeTarget.projectId);
						setRemoveTarget(null);
					}}
				/>
			)}
		</>
	);
}

function MemberRow({
	member,
	currentUser,
	onRemoved,
}: {
	member: TeamMember;
	currentUser: TeamMember | null;
	onRemoved: (id: string, projectId: string) => void;
}) {
	const [editTarget, setEditTarget] = useState<{
		projectId: string;
		projectName: string;
		role: string;
		projectRole: string;
		readOnly?: boolean;
	} | null>(null);
	const [removeTarget, setRemoveTarget] = useState<{
		projectId: string;
		projectName: string;
	} | null>(null);

	if (member.roles.length === 0) return null;

	return (
		<tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
			<td className="px-4 py-3">
				<div className="flex items-center gap-3">
					<Avatar name={member.name} email={member.email} />
					<div className="min-w-0">
						<p className="font-semibold text-sm text-foreground truncate">
							{member.name || member.email.split("@")[0]}
						</p>
						<p className="text-xs text-muted-foreground truncate">
							{member.email}
						</p>
					</div>
				</div>
			</td>
			<td className="px-4 py-3">
				<div className="flex flex-col gap-1">
					{member.roles.map((r) => (
						<MembershipLine key={r.projectId} membership={r} />
					))}
				</div>
			</td>
			<td className="px-4 py-3">
				<StatusDot />
			</td>
			<td className="px-4 py-3 text-sm text-muted-foreground">
				{member.roles.length}
			</td>
			<td className="px-4 py-3 text-right">
				<MemberMenu
					member={member}
					currentUser={currentUser}
					onEdit={setEditTarget}
					onRemove={setRemoveTarget}
				/>
				{editTarget && (
					<EditMemberDialog
						member={member}
						projectId={editTarget.projectId}
						projectName={editTarget.projectName}
						currentRole={editTarget.role}
						currentProjectRole={editTarget.projectRole}
						readOnly={editTarget.readOnly}
						onClose={() => setEditTarget(null)}
					/>
				)}
				{removeTarget && (
					<RemoveMemberDialog
						member={member}
						projectId={removeTarget.projectId}
						projectName={removeTarget.projectName}
						onClose={() => setRemoveTarget(null)}
						onRemoved={onRemoved}
					/>
				)}
			</td>
		</tr>
	);
}

function InvitationCard({
	invite,
	isProcessing,
	onRespond,
}: {
	invite: ProjectInvitation;
	isProcessing: string | null;
	onRespond: (id: string, accept: boolean) => void;
}) {
	const busy = isProcessing === invite.id;
	const dateStr = invite.createdAt
		? new Date(invite.createdAt).toLocaleDateString(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			})
		: null;

	return (
		<div
			id={`invite-${invite.id}`}
			className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-border/80 transition-colors"
		>
			<div>
				<p className="font-semibold text-foreground">{invite.projectName}</p>
				{invite.inviterName && (
					<p className="text-sm text-muted-foreground mt-0.5">
						Invited by {invite.inviterName}
					</p>
				)}
				{dateStr && (
					<div className="flex items-center gap-1.5 mt-1.5">
						<Calendar size={11} className="text-muted-foreground" />
						<span className="text-xs text-muted-foreground">{dateStr}</span>
					</div>
				)}
			</div>

			<div className="text-sm text-foreground">
				<span className="text-muted-foreground">Role: </span>
				{invite.projectRole}
				<span className="text-muted-foreground mx-1.5">·</span>
				<span className="text-muted-foreground">Access: </span>
				<AccessBadge role={invite.role} />
			</div>

			<div className="flex items-center gap-2 pt-1">
				<button
					type="button"
					disabled={busy}
					onClick={() => onRespond(invite.id, true)}
					className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
				>
					{busy ? (
						<Loader2 size={13} className="animate-spin" />
					) : (
						<Check size={13} />
					)}
					{busy ? "Processing..." : "Accept"}
				</button>
				<button
					type="button"
					disabled={busy}
					onClick={() => onRespond(invite.id, false)}
					className="flex-1 bg-muted hover:bg-destructive/10 hover:text-destructive text-foreground py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
				>
					Decline
				</button>
			</div>
		</div>
	);
}

export function TeamPageClient({
	initialMembers,
	initialMyInvites,
	initialSentInvites,
	currentUserId,
	initialLoadError,
}: TeamPageClientProps) {
	const { openInviteMemberModal } = useUIStore();
	const [members, setMembers] = useState<TeamMember[]>(initialMembers);
	const router = useRouter();

	useEffect(() => {
		setMembers(initialMembers);
	}, [initialMembers]);

	const searchParams = useSearchParams();
	const tabParam = searchParams.get("tab") as Tab | null;
	const inviteId = searchParams.get("inviteId");
	const hasScrolledRef = useRef(false);

	const initialTab =
		tabParam && VALID_TABS.includes(tabParam) ? tabParam : "members";
	const [activeTab, setActiveTab] = useState<Tab>(initialTab);

	useEffect(() => {
		if (tabParam && VALID_TABS.includes(tabParam)) {
			setActiveTab(tabParam);
		}
	}, [tabParam]);

	useEffect(() => {
		if (
			activeTab === "my-invitations" &&
			inviteId &&
			!hasScrolledRef.current &&
			initialMyInvites.length > 0
		) {
			const timer = setTimeout(() => {
				const element = document.getElementById(`invite-${inviteId}`);
				if (element) {
					element.scrollIntoView({ behavior: "smooth", block: "center" });
					hasScrolledRef.current = true;
				}
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [activeTab, inviteId, initialMyInvites]);
	const [viewMode, setViewMode] = useState<ViewMode>("card");
	const [search, setSearch] = useState("");
	const [filterPermission, setFilterPermission] = useState("");
	const [filterRole, setFilterRole] = useState("");
	const [isProcessing, setIsProcessing] = useState<string | null>(null);

	const currentUser = members.find((m) => m.id === currentUserId) || null;
	const canManageAnyMembers =
		currentUser?.roles.some(
			(role) => role.role === "owner" || role.role === "admin",
		) ?? false;
	useEffect(() => {
		if (!canManageAnyMembers && activeTab === "invitations") {
			setActiveTab("members");
		}
	}, [activeTab, canManageAnyMembers]);

	const filteredMembers = filterTeamMembers(members, {
		search,
		permission: filterPermission,
		projectRole: filterRole,
	});
	const projectRoleOptions = getProjectRoleOptions(members, PROJECT_ROLES);

	const handleMemberRemoved = (id: string, projectId: string) => {
		setMembers((prev) =>
			prev
				.map((m) => {
					if (m.id !== id) return m;
					return {
						...m,
						roles: m.roles.filter((r) => r.projectId !== projectId),
					};
				})
				.filter((m) => m.roles.length > 0),
		);
	};

	const handleRespond = async (id: string, accept: boolean) => {
		setIsProcessing(id);
		const res = await respondToInvitationAction(id, accept);
		if (res.success) {
			useUIStore.getState().addToast({
				type: "success",
				message: accept ? "Invitation accepted!" : "Invitation declined.",
			});
			router.refresh();
		} else {
			useUIStore
				.getState()
				.addToast({ type: "error", message: res.error || "Failed to respond" });
		}
		setIsProcessing(null);
	};

	const handleCancel = async (id: string) => {
		setIsProcessing(id);
		const res = await cancelInvitationAction(id);
		if (res.success) {
			useUIStore
				.getState()
				.addToast({ type: "success", message: "Invitation cancelled." });
			router.refresh();
		} else {
			useUIStore
				.getState()
				.addToast({ type: "error", message: res.error || "Failed to cancel" });
		}
		setIsProcessing(null);
	};

	const handleResend = async (id: string) => {
		setIsProcessing(id);
		const res = await resendInvitationAction(id);
		if (res.success) {
			useUIStore
				.getState()
				.addToast({ type: "success", message: "Invitation resent." });
		} else {
			useUIStore
				.getState()
				.addToast({ type: "error", message: res.error || "Failed to resend" });
		}
		setIsProcessing(null);
	};

	const tabs: {
		id: Tab;
		label: string;
		icon: React.ReactNode;
		count?: number;
	}[] = [
		{
			id: "members",
			label: "Members",
			icon: <Users size={14} />,
			count: members.length,
		},
		...(canManageAnyMembers
			? [
					{
						id: "invitations",
						label: "Sent Invitations",
						icon: <SendHorizontal size={14} />,
						count: initialSentInvites.length,
					} as const,
				]
			: []),
		{
			id: "my-invitations",
			label: "My Invitations",
			icon: <Bell size={14} />,
			count: initialMyInvites.length,
		},
	];

	if (initialLoadError) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Team
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage collaborators, project roles, and invitations across your
						projects.
					</p>
				</div>
				<div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
					<p className="text-sm font-semibold text-destructive">
						Unable to load team data
					</p>
					<p className="mt-1 text-sm text-destructive/80">{initialLoadError}</p>
					<button
						type="button"
						onClick={() => router.refresh()}
						className="mt-4 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						Try again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground tracking-tight">
						Team
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage collaborators, project roles, and invitations across your
						projects.
					</p>
				</div>
				{canManageAnyMembers && (
					<button
						type="button"
						onClick={openInviteMemberModal}
						className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm shrink-0"
					>
						<UserPlus size={15} />
						Invite Member
					</button>
				)}
			</div>

			<div className="flex items-center gap-0.5 border-b border-border">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						onClick={() => setActiveTab(tab.id)}
						className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors -mb-px ${
							activeTab === tab.id
								? "border-primary text-primary"
								: "border-transparent text-muted-foreground hover:text-foreground"
						}`}
					>
						{tab.icon}
						{tab.label}
						{tab.count !== undefined && tab.count > 0 && (
							<span className="px-1.5 py-0.5 text-xs rounded-full bg-muted text-muted-foreground font-medium">
								{tab.count}
							</span>
						)}
					</button>
				))}
			</div>

			{activeTab === "members" && (
				<div className="space-y-4">
					<div className="grid grid-cols-1 min-[375px]:grid-cols-2 lg:flex gap-2">
						<div className="relative min-[375px]:col-span-2 lg:flex-1">
							<label htmlFor="team-member-search" className="sr-only">
								Search team members
							</label>
							<Search
								size={14}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
							/>
							<input
								id="team-member-search"
								type="search"
								placeholder="Search members..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
							/>
						</div>
						<label htmlFor="team-permission-filter" className="sr-only">
							Filter by permission level
						</label>
						<select
							id="team-permission-filter"
							value={filterPermission}
							onChange={(e) => setFilterPermission(e.target.value)}
							className="w-full lg:w-auto px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="">All Permissions</option>
							{PROJECT_PERMISSIONS.map((permission) => (
								<option key={permission} value={permission}>
									{PROJECT_PERMISSION_LABELS[permission]}
								</option>
							))}
						</select>
						<label htmlFor="team-project-role-filter" className="sr-only">
							Filter by project role
						</label>
						<select
							id="team-project-role-filter"
							value={filterRole}
							onChange={(e) => setFilterRole(e.target.value)}
							className="w-full lg:w-auto px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="">All Project Roles</option>
							{projectRoleOptions.map((r) => (
								<option key={r} value={r}>
									{r}
								</option>
							))}
						</select>
						<fieldset className="flex min-w-0 w-fit items-center gap-1 border border-border rounded-lg p-1 bg-background shrink-0 min-[375px]:col-span-2">
							<legend className="sr-only">Team member view</legend>
							{canManageAnyMembers && (
								<button
									type="button"
									onClick={() => setViewMode("card")}
									aria-label="Card view"
									aria-pressed={viewMode === "card"}
									className={`p-1.5 rounded transition-colors ${viewMode === "card" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
								>
									<LayoutGrid size={15} />
								</button>
							)}
							<button
								type="button"
								onClick={() => setViewMode("list")}
								aria-label="List view"
								aria-pressed={viewMode === "list"}
								className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
							>
								<List size={15} />
							</button>
						</fieldset>
					</div>

					{members.length === 0 ? (
						<div className="text-center py-16 bg-muted/10 rounded-xl border border-border border-dashed">
							<Users
								size={40}
								className="mx-auto mb-4 text-muted-foreground/50"
							/>
							<p className="font-medium text-foreground mb-1">
								No team members yet
							</p>
							<p className="text-sm text-muted-foreground mb-4">
								Invite people to collaborate across your projects.
							</p>
							<button
								type="button"
								onClick={openInviteMemberModal}
								className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
							>
								<UserPlus size={14} />
								Invite Member
							</button>
						</div>
					) : filteredMembers.length === 0 ? (
						<div className="text-center py-12 bg-muted/10 rounded-xl border border-border">
							<Search
								size={32}
								className="mx-auto mb-3 text-muted-foreground/50"
							/>
							<p className="font-medium text-foreground">
								No members match your search
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								Try adjusting your filters.
							</p>
						</div>
					) : viewMode === "card" ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
							{filteredMembers.map((member) => (
								<MemberCard
									key={member.id}
									member={member}
									currentUser={currentUser}
									onRemoved={handleMemberRemoved}
								/>
							))}
						</div>
					) : (
						<div className="bg-card rounded-xl border border-border overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-muted/30 border-b border-border text-left">
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Member
										</th>
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Project memberships
										</th>
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Status
										</th>
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Projects
										</th>
										<th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Actions
										</th>
									</tr>
								</thead>
								<tbody>
									{filteredMembers.map((member) => (
										<MemberRow
											key={member.id}
											member={member}
											currentUser={currentUser}
											onRemoved={handleMemberRemoved}
										/>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{activeTab === "invitations" && (
				<div>
					{initialSentInvites.length === 0 ? (
						<div className="text-center py-16 bg-muted/10 rounded-xl border border-border border-dashed">
							<SendHorizontal
								size={40}
								className="mx-auto mb-4 text-muted-foreground/50"
							/>
							<p className="font-medium text-foreground mb-1">
								No pending invitations
							</p>
							<p className="text-sm text-muted-foreground">
								Invitations you send will appear here.
							</p>
						</div>
					) : (
						<div className="bg-card rounded-xl border border-border overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-muted/30 border-b border-border text-left">
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Email
										</th>
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Project
										</th>
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Role
										</th>
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Access
										</th>
										<th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Invited
										</th>
										<th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
											Actions
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{initialSentInvites.map((invite) => {
										const busy = isProcessing === invite.id;
										const dateStr = invite.createdAt
											? new Date(invite.createdAt).toLocaleDateString(
													undefined,
													{
														month: "short",
														day: "numeric",
													},
												)
											: "—";
										return (
											<tr
												key={invite.id}
												className="hover:bg-muted/20 transition-colors"
											>
												<td className="px-4 py-3 font-medium text-foreground">
													{invite.email}
												</td>
												<td className="px-4 py-3 text-muted-foreground">
													{invite.projectName}
												</td>
												<td className="px-4 py-3">{invite.projectRole}</td>
												<td className="px-4 py-3">
													<AccessBadge role={invite.role} />
												</td>
												<td className="px-4 py-3 text-muted-foreground text-xs">
													{dateStr}
												</td>
												<td className="px-4 py-3">
													<div className="flex items-center justify-end gap-1.5">
														<button
															type="button"
															disabled={busy}
															onClick={() => handleResend(invite.id)}
															aria-label={`Resend invitation to ${invite.email}`}
															className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
														>
															{busy ? (
																<Loader2 size={10} className="animate-spin" />
															) : (
																<RefreshCw size={10} />
															)}
															Resend
														</button>
														<button
															type="button"
															disabled={busy}
															onClick={() => handleCancel(invite.id)}
															aria-label={`Cancel invitation to ${invite.email}`}
															className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
														>
															<X size={10} />
															Cancel
														</button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}

			{activeTab === "my-invitations" && (
				<div>
					{initialMyInvites.length === 0 ? (
						<div className="text-center py-16 bg-muted/10 rounded-xl border border-border border-dashed">
							<Bell
								size={40}
								className="mx-auto mb-4 text-muted-foreground/50"
							/>
							<p className="font-medium text-foreground mb-1">
								No pending invitations
							</p>
							<p className="text-sm text-muted-foreground">
								You don't have any project invitations right now.
							</p>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
							{initialMyInvites.map((invite) => (
								<InvitationCard
									key={invite.id}
									invite={invite}
									isProcessing={isProcessing}
									onRespond={handleRespond}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
