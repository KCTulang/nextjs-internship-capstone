export const MEMBERSHIP_PERMISSIONS = ["admin", "member", "viewer"] as const;

export type MembershipPermission = (typeof MEMBERSHIP_PERMISSIONS)[number];
export type ProjectPermission = "owner" | MembershipPermission;

export interface ProjectCapabilities {
	canViewProject: boolean;
	canMutateTasks: boolean;
	canManageColumns: boolean;
	canManageMembers: boolean;
	canEditProject: boolean;
	canDeleteProject: boolean;
	canLeaveProject: boolean;
}

export function isMembershipPermission(
	value: string,
): value is MembershipPermission {
	return MEMBERSHIP_PERMISSIONS.some((permission) => permission === value);
}

export function getEffectiveProjectPermission(
	ownerId: string,
	userId: string,
	membershipRole?: string | null,
): ProjectPermission | null {
	if (ownerId === userId) return "owner";
	return membershipRole && isMembershipPermission(membershipRole)
		? membershipRole
		: null;
}

export function getProjectCapabilities(
	permission: ProjectPermission | null,
): ProjectCapabilities {
	const canViewProject = permission !== null;
	const canMutateTasks =
		permission === "owner" || permission === "admin" || permission === "member";
	const canManageProject = permission === "owner" || permission === "admin";

	return {
		canViewProject,
		canMutateTasks,
		canManageColumns: canManageProject,
		canManageMembers: canManageProject,
		canEditProject: canManageProject,
		canDeleteProject: permission === "owner",
		canLeaveProject: permission !== null && permission !== "owner",
	};
}

export const PROJECT_PERMISSION_LABELS: Record<ProjectPermission, string> = {
	owner: "Owner",
	admin: "Admin",
	member: "Member",
	viewer: "Viewer",
};

export const PROJECT_PERMISSION_DESCRIPTIONS: Record<
	MembershipPermission,
	string
> = {
	admin: "Can manage tasks, columns, members, and project settings.",
	member: "Can create, edit, move, complete, and comment on tasks.",
	viewer: "Can view the project and task details, but cannot make changes.",
};
