export type PermissionLevel = "owner" | "admin" | "member" | "viewer";

export type InvitationStatus = "pending" | "accepted" | "declined";

export interface MemberRole {
	role: PermissionLevel;
	projectRole: string;
	projectName: string;
	projectId: string;
}

export interface TeamMember {
	id: string;
	name: string;
	email: string;
	roles: MemberRole[];
}

export interface ProjectInvitation {
	id: string;
	projectId: string;
	projectName: string;
	email?: string;
	role: string;
	projectRole: string;
	inviterName?: string;
	createdAt: Date | string | null;
}
