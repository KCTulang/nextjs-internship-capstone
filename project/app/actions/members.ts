"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, queries } from "@/lib/db";
import { requireProjectCapability } from "@/lib/db/project-permissions";
import {
	projectInvitations,
	projectMembers,
	projects,
	users,
} from "@/lib/db/schema";
import {
	isMembershipPermission,
	MEMBERSHIP_PERMISSIONS,
	type MembershipPermission,
	type ProjectPermission,
} from "@/lib/project-permissions";
import { publishProjectEvent } from "@/services/realtime/events";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

const inviteMemberSchema = z.object({
	projectId: z.string().uuid(),
	email: z.string().email("Invalid email address"),
	role: z.enum(MEMBERSHIP_PERMISSIONS).default("member"),
	projectRole: z.string().default("Other"),
});

export async function inviteMemberAction(rawData: {
	projectId: string;
	email: string;
	role?: MembershipPermission;
	projectRole?: string;
}) {
	try {
		const clerkId = await requireAuth();
		const data = inviteMemberSchema.parse(rawData);

		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		await requireProjectCapability(clerkId, data.projectId, "canManageMembers");

		const user = await db.query.users.findFirst({
			where: eq(users.email, data.email),
		});

		if (user) {
			const existing = await db.query.projectMembers.findFirst({
				where: and(
					eq(projectMembers.projectId, data.projectId),
					eq(projectMembers.userId, user.id),
				),
			});
			if (existing) {
				return {
					success: false,
					error: "This user is already an active member of the project",
				};
			}
		}

		const existingInvite = await db.query.projectInvitations.findFirst({
			where: and(
				eq(projectInvitations.projectId, data.projectId),
				eq(projectInvitations.email, data.email),
				eq(projectInvitations.status, "pending"),
			),
		});

		if (existingInvite) {
			return {
				success: false,
				error: "A pending invitation already exists for this email",
			};
		}

		const newInvite = await db
			.insert(projectInvitations)
			.values({
				projectId: data.projectId,
				email: data.email,
				role: data.role,
				projectRole: data.projectRole,
				status: "pending",
				inviterId: caller.id,
			})
			.returning();

		if (user) {
			const { createNotificationAction } = await import(
				"@/app/actions/notifications"
			);
			await createNotificationAction({
				userId: user.id,
				actorId: caller.id,
				type: "invitation",
				taskId: newInvite[0].id,
				projectId: data.projectId,
				message: "invited you to a project",
			});
		}

		revalidatePath(`/`, "layout");
		return { success: true, data: newInvite[0] };
	} catch (error: unknown) {
		console.error("Failed to invite member:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: String(error) || "Failed to invite member",
		};
	}
}

export async function respondToInvitationAction(
	invitationId: string,
	accept: boolean,
) {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "Unauthorized" };

		const invitation = await db.query.projectInvitations.findFirst({
			where: eq(projectInvitations.id, invitationId),
		});

		if (!invitation) return { success: false, error: "Invitation not found" };
		if (invitation.status !== "pending")
			return { success: false, error: "Invitation is no longer pending" };
		if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
			return {
				success: false,
				error: "You are not authorized to respond to this invitation",
			};
		}

		const existingMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, invitation.projectId),
				eq(projectMembers.userId, user.id),
			),
		});

		if (existingMembership) {
			await db
				.update(projectInvitations)
				.set({ status: "accepted" })
				.where(eq(projectInvitations.id, invitationId));
			return {
				success: false,
				error: "You are already a member of this project",
			};
		}

		if (accept) {
			await db.batch([
				db.insert(projectMembers).values({
					projectId: invitation.projectId,
					userId: user.id,
					role: z.enum(MEMBERSHIP_PERMISSIONS).parse(invitation.role),
					projectRole: invitation.projectRole,
				}),
				db
					.update(projectInvitations)
					.set({ status: "accepted" })
					.where(eq(projectInvitations.id, invitationId)),
			]);

			await publishProjectEvent({
				type: "member.added",
				projectId: invitation.projectId,
				actorId: user.id,
				entityId: user.id,
				timestamp: new Date().toISOString(),
				payload: {
					userId: user.id,
					role: invitation.role,
					projectRole: invitation.projectRole,
				},
			});
		} else {
			await db
				.update(projectInvitations)
				.set({ status: "declined" })
				.where(eq(projectInvitations.id, invitationId));
		}

		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to respond to invitation:", error);
		return { success: false, error: "Failed to respond to invitation" };
	}
}

export async function revokeInvitationAction(invitationId: string) {
	try {
		const clerkId = await requireAuth();

		const invitation = await db.query.projectInvitations.findFirst({
			where: eq(projectInvitations.id, invitationId),
		});

		if (!invitation) return { success: false, error: "Invitation not found" };

		await requireProjectCapability(
			clerkId,
			invitation.projectId,
			"canManageMembers",
		);

		await db
			.delete(projectInvitations)
			.where(eq(projectInvitations.id, invitationId));

		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to revoke invitation:", error);
		return { success: false, error: "Failed to revoke invitation" };
	}
}

export async function getPendingInvitationsForUserAction() {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		const invites = await db
			.select({
				id: projectInvitations.id,
				projectId: projectInvitations.projectId,
				projectName: projects.name,
				role: projectInvitations.role,
				projectRole: projectInvitations.projectRole,
				inviterName: users.name,
				createdAt: projectInvitations.createdAt,
			})
			.from(projectInvitations)
			.innerJoin(projects, eq(projectInvitations.projectId, projects.id))
			.innerJoin(users, eq(projectInvitations.inviterId, users.id))
			.where(
				and(
					eq(projectInvitations.email, user.email),
					eq(projectInvitations.status, "pending"),
				),
			);

		return { success: true, data: invites };
	} catch (error) {
		console.error("Failed to fetch pending invitations:", error);
		return { success: false, error: "Failed to fetch pending invitations" };
	}
}

export async function getPendingInvitationsByProjectAction(projectId: string) {
	try {
		const clerkId = await requireAuth();

		await requireProjectCapability(clerkId, projectId, "canManageMembers");

		const invites = await db
			.select({
				id: projectInvitations.id,
				projectId: projectInvitations.projectId,
				email: projectInvitations.email,
				role: projectInvitations.role,
				projectRole: projectInvitations.projectRole,
				createdAt: projectInvitations.createdAt,
			})
			.from(projectInvitations)
			.where(
				and(
					eq(projectInvitations.projectId, projectId),
					eq(projectInvitations.status, "pending"),
				),
			);

		return { success: true, data: invites };
	} catch (error) {
		console.error("Failed to fetch project invitations:", error);
		return { success: false, error: "Failed to fetch project invitations" };
	}
}

export async function removeMemberAction(projectId: string, userId: string) {
	try {
		const clerkId = await requireAuth();
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		const project = await db.query.projects.findFirst({
			where: eq(projects.id, projectId),
			columns: { ownerId: true },
		});
		if (!project) return { success: false, error: "Project not found" };
		if (project.ownerId === userId) {
			return {
				success: false,
				error: "The project owner cannot be removed or leave the project.",
			};
		}
		if (caller.id === userId) {
			await requireProjectCapability(clerkId, projectId, "canLeaveProject");
		} else {
			await requireProjectCapability(clerkId, projectId, "canManageMembers");
		}
		const targetMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, userId),
			),
			columns: { id: true },
		});
		if (!targetMembership) return { success: false, error: "Member not found" };

		await queries.projectMembers.removeMember(projectId, userId);

		await publishProjectEvent({
			type: "member.removed",
			projectId,
			actorId: caller.id,
			entityId: userId,
			timestamp: new Date().toISOString(),
		});

		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to remove member:", error);
		return { success: false, error: "Failed to remove member" };
	}
}

export async function leaveProjectAction(projectId: string) {
	try {
		const clerkId = await requireAuth();
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };
		return await removeMemberAction(projectId, caller.id);
	} catch (error) {
		console.error("Failed to leave project:", error);
		return { success: false, error: "Failed to leave project" };
	}
}

export async function updateMemberRoleAction(
	projectId: string,
	userId: string,
	role: MembershipPermission,
	projectRole?: string,
) {
	try {
		const clerkId = await requireAuth();
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		await requireProjectCapability(clerkId, projectId, "canManageMembers");
		const validatedRole = z.enum(MEMBERSHIP_PERMISSIONS).parse(role);
		const project = await db.query.projects.findFirst({
			where: eq(projects.id, projectId),
			columns: { ownerId: true },
		});
		if (project?.ownerId === userId) {
			return { success: false, error: "Cannot change the project owner." };
		}

		const updateData: {
			role?: MembershipPermission;
			projectRole?: string;
		} = {
			role: validatedRole,
		};
		if (projectRole) {
			updateData.projectRole = projectRole;
		}

		const updatedMember = await db
			.update(projectMembers)
			.set(updateData)
			.where(
				and(
					eq(projectMembers.projectId, projectId),
					eq(projectMembers.userId, userId),
				),
			)
			.returning();

		await publishProjectEvent({
			type: "member.updated",
			projectId,
			actorId: caller.id,
			entityId: userId,
			timestamp: new Date().toISOString(),
			payload: updatedMember[0],
		});

		revalidatePath(`/`, "layout");
		return { success: true, data: updatedMember[0] };
	} catch (error) {
		console.error("Failed to update member role:", error);
		return { success: false, error: "Failed to update role" };
	}
}

export async function getTeamMembersAction() {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "User not found" };

		const userProjects = await db
			.select({ projectId: projectMembers.projectId })
			.from(projectMembers)
			.where(eq(projectMembers.userId, user.id));

		const userOwnedProjects = await db
			.select({ projectId: projects.id })
			.from(projects)
			.where(eq(projects.ownerId, user.id));

		const projectIds = Array.from(
			new Set([
				...userProjects.map((p) => p.projectId),
				...userOwnedProjects.map((p) => p.projectId),
			]),
		);

		if (projectIds.length === 0) return { success: true, data: [] };

		const membersList = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: projectMembers.role,
				projectRole: projectMembers.projectRole,
				projectName: projects.name,
				projectId: projects.id,
				ownerId: projects.ownerId,
			})
			.from(projectMembers)
			.innerJoin(users, eq(projectMembers.userId, users.id))
			.innerJoin(projects, eq(projectMembers.projectId, projects.id))
			.where(inArray(projectMembers.projectId, projectIds));
		const ownerRows = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				projectName: projects.name,
				projectId: projects.id,
			})
			.from(projects)
			.innerJoin(users, eq(projects.ownerId, users.id))
			.where(inArray(projects.id, projectIds));

		type TeamMemberRow = {
			id: string;
			name: string;
			email: string;
			roles: Array<{
				role: ProjectPermission;
				projectRole: string;
				projectName: string;
				projectId: string;
			}>;
		};
		const teamMap = new Map<string, TeamMemberRow>();
		for (const m of membersList) {
			if (!teamMap.has(m.id)) {
				teamMap.set(m.id, {
					id: m.id,
					name: m.name,
					email: m.email,
					roles: [
						{
							role:
								m.ownerId === m.id
									? "owner"
									: isMembershipPermission(m.role)
										? m.role
										: "member",
							projectRole: m.projectRole,
							projectName: m.projectName,
							projectId: m.projectId,
						},
					],
				});
			} else {
				teamMap.get(m.id)?.roles.push({
					role:
						m.ownerId === m.id
							? "owner"
							: isMembershipPermission(m.role)
								? m.role
								: "member",
					projectRole: m.projectRole,
					projectName: m.projectName,
					projectId: m.projectId,
				});
			}
		}
		for (const owner of ownerRows) {
			const existing = teamMap.get(owner.id);
			const ownerRole: TeamMemberRow["roles"][number] = {
				role: "owner",
				projectRole: "Project Owner",
				projectName: owner.projectName,
				projectId: owner.projectId,
			};
			if (!existing) {
				teamMap.set(owner.id, { ...owner, roles: [ownerRole] });
			} else if (
				!existing.roles.some((role) => role.projectId === owner.projectId)
			) {
				existing.roles.push(ownerRole);
			}
		}

		return { success: true, data: Array.from(teamMap.values()) };
	} catch (error) {
		console.error("Failed to fetch team members:", error);
		return { success: false, error: "Failed to fetch team members" };
	}
}

export async function getSentInvitationsAction() {
	try {
		const clerkId = await requireAuth();
		const user = await queries.users.getByClerkId(clerkId);
		if (!user) return { success: false, error: "Unauthorized" };

		const callerMemberships = await db.query.projectMembers.findMany({
			where: and(
				eq(projectMembers.userId, user.id),
				eq(projectMembers.role, "admin"),
			),
		});

		const ownedProjects = await db.query.projects.findMany({
			where: eq(projects.ownerId, user.id),
			columns: { id: true },
		});
		const projectIds = Array.from(
			new Set([
				...callerMemberships.map((membership) => membership.projectId),
				...ownedProjects.map((project) => project.id),
			]),
		);
		if (projectIds.length === 0) return { success: true, data: [] };

		const invites = await db
			.select({
				id: projectInvitations.id,
				projectId: projectInvitations.projectId,
				projectName: projects.name,
				email: projectInvitations.email,
				role: projectInvitations.role,
				projectRole: projectInvitations.projectRole,
				createdAt: projectInvitations.createdAt,
			})
			.from(projectInvitations)
			.innerJoin(projects, eq(projectInvitations.projectId, projects.id))
			.where(
				and(
					inArray(projectInvitations.projectId, projectIds),
					eq(projectInvitations.status, "pending"),
				),
			);

		return { success: true, data: invites };
	} catch (error) {
		console.error("Failed to fetch sent invitations:", error);
		return { success: false, error: "Failed to fetch sent invitations" };
	}
}
export async function cancelInvitationAction(invitationId: string) {
	try {
		const clerkId = await requireAuth();

		const invitation = await db.query.projectInvitations.findFirst({
			where: eq(projectInvitations.id, invitationId),
		});

		if (!invitation) return { success: false, error: "Invitation not found" };
		if (invitation.status !== "pending")
			return {
				success: false,
				error: "Only pending invitations can be cancelled",
			};

		await requireProjectCapability(
			clerkId,
			invitation.projectId,
			"canManageMembers",
		);

		await db
			.delete(projectInvitations)
			.where(eq(projectInvitations.id, invitationId));

		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to cancel invitation:", error);
		return { success: false, error: "Failed to cancel invitation" };
	}
}

export async function resendInvitationAction(invitationId: string) {
	try {
		const clerkId = await requireAuth();

		const invitation = await db.query.projectInvitations.findFirst({
			where: eq(projectInvitations.id, invitationId),
		});

		if (!invitation) return { success: false, error: "Invitation not found" };
		if (invitation.status !== "pending")
			return {
				success: false,
				error: "Only pending invitations can be resent",
			};

		await requireProjectCapability(
			clerkId,
			invitation.projectId,
			"canManageMembers",
		);

		await db
			.update(projectInvitations)
			.set({ updatedAt: new Date() })
			.where(eq(projectInvitations.id, invitationId));

		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to resend invitation:", error);
		return { success: false, error: "Failed to resend invitation" };
	}
}

export async function updateProjectMemberAction(
	projectId: string,
	userId: string,
	data: { role?: MembershipPermission; projectRole?: string },
) {
	try {
		const clerkId = await requireAuth();
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		await requireProjectCapability(clerkId, projectId, "canManageMembers");

		const targetMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, userId),
			),
		});

		const project = await db.query.projects.findFirst({
			where: eq(projects.id, projectId),
		});

		if (targetMembership?.userId === project?.ownerId) {
			return {
				success: false,
				error: "Cannot change the project owner's permission level",
			};
		}

		const updateData: {
			role?: MembershipPermission;
			projectRole?: string;
		} = {};
		if (data.role) {
			updateData.role = z.enum(MEMBERSHIP_PERMISSIONS).parse(data.role);
		}
		if (data.projectRole) updateData.projectRole = data.projectRole;

		if (Object.keys(updateData).length === 0) {
			return { success: false, error: "No changes provided" };
		}

		const updated = await db
			.update(projectMembers)
			.set(updateData)
			.where(
				and(
					eq(projectMembers.projectId, projectId),
					eq(projectMembers.userId, userId),
				),
			)
			.returning();

		await publishProjectEvent({
			type: "member.updated",
			projectId,
			actorId: caller.id,
			entityId: userId,
			timestamp: new Date().toISOString(),
			payload: updated[0],
		});

		revalidatePath(`/`, "layout");
		return { success: true, data: updated[0] };
	} catch (error) {
		console.error("Failed to update member:", error);
		return { success: false, error: "Failed to update member" };
	}
}
