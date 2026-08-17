"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, queries } from "@/lib/db";
import {
	projectInvitations,
	projectMembers,
	projects,
	users,
} from "@/lib/db/schema";

async function requireAuth() {
	const { userId } = await auth();
	if (!userId) throw new Error("Unauthorized");
	return userId;
}

const inviteMemberSchema = z.object({
	projectId: z.string().uuid(),
	email: z.string().email("Invalid email address"),
	role: z.string().default("member"),
	projectRole: z.string().default("Other"),
});

export async function inviteMemberAction(rawData: {
	projectId: string;
	email: string;
	role?: "admin" | "member";
	projectRole?: string;
}) {
	try {
		const clerkId = await requireAuth();
		const data = inviteMemberSchema.parse(rawData);

		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		const callerMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, data.projectId),
				eq(projectMembers.userId, caller.id),
			),
		});
		if (!callerMembership || callerMembership.role !== "admin") {
			return {
				success: false,
				error: "Only project owners or admins can invite members",
			};
		}

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
				role: data.role as "admin" | "member",
				projectRole: data.projectRole,
				status: "pending",
				inviterId: caller.id,
			})
			.returning();

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
					role: invitation.role as "admin" | "member",
					projectRole: invitation.projectRole,
				}),
				db
					.update(projectInvitations)
					.set({ status: "accepted" })
					.where(eq(projectInvitations.id, invitationId)),
			]);
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
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		const invitation = await db.query.projectInvitations.findFirst({
			where: eq(projectInvitations.id, invitationId),
		});

		if (!invitation) return { success: false, error: "Invitation not found" };

		const callerMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, invitation.projectId),
				eq(projectMembers.userId, caller.id),
			),
		});

		if (!callerMembership || callerMembership.role !== "admin") {
			return {
				success: false,
				error: "Only project owners or admins can revoke invitations",
			};
		}

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
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		const callerMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, caller.id),
			),
		});

		if (!callerMembership || callerMembership.role !== "admin") {
			return {
				success: false,
				error: "Only project owners or admins can view invitations",
			};
		}

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

		const callerMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, caller.id),
			),
		});

		if (caller.id !== userId) {
			if (!callerMembership || callerMembership.role !== "admin") {
				return {
					success: false,
					error: "Only project owners or admins can remove members",
				};
			}
		}

		await queries.projectMembers.removeMember(projectId, userId);
		revalidatePath(`/`, "layout");
		return { success: true };
	} catch (error) {
		console.error("Failed to remove member:", error);
		return { success: false, error: "Failed to remove member" };
	}
}

export async function updateMemberRoleAction(
	projectId: string,
	userId: string,
	role: string,
	projectRole?: string,
) {
	try {
		const clerkId = await requireAuth();
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		const callerMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, caller.id),
			),
		});

		if (!callerMembership || callerMembership.role !== "admin") {
			return {
				success: false,
				error: "Only project owners or admins can change roles",
			};
		}

		const updateData: { role?: "admin" | "member"; projectRole?: string } = {
			role: role as "admin" | "member",
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
			})
			.from(projectMembers)
			.innerJoin(users, eq(projectMembers.userId, users.id))
			.innerJoin(projects, eq(projectMembers.projectId, projects.id))
			.where(inArray(projectMembers.projectId, projectIds));

		const teamMap = new Map();
		for (const m of membersList) {
			if (!teamMap.has(m.id)) {
				teamMap.set(m.id, {
					id: m.id,
					name: m.name,
					email: m.email,
					roles: [
						{
							role: m.role,
							projectRole: m.projectRole,
							projectName: m.projectName,
							projectId: m.projectId,
						},
					],
				});
			} else {
				teamMap.get(m.id).roles.push({
					role: m.role,
					projectRole: m.projectRole,
					projectName: m.projectName,
					projectId: m.projectId,
				});
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

		const projectIds = callerMemberships.map((m) => m.projectId);
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
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		const invitation = await db.query.projectInvitations.findFirst({
			where: eq(projectInvitations.id, invitationId),
		});

		if (!invitation) return { success: false, error: "Invitation not found" };
		if (invitation.status !== "pending")
			return {
				success: false,
				error: "Only pending invitations can be cancelled",
			};

		const callerMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, invitation.projectId),
				eq(projectMembers.userId, caller.id),
			),
		});

		if (!callerMembership || callerMembership.role !== "admin") {
			return {
				success: false,
				error: "Only project owners or admins can cancel invitations",
			};
		}

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
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		const invitation = await db.query.projectInvitations.findFirst({
			where: eq(projectInvitations.id, invitationId),
		});

		if (!invitation) return { success: false, error: "Invitation not found" };
		if (invitation.status !== "pending")
			return {
				success: false,
				error: "Only pending invitations can be resent",
			};

		const callerMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, invitation.projectId),
				eq(projectMembers.userId, caller.id),
			),
		});

		if (!callerMembership || callerMembership.role !== "admin") {
			return {
				success: false,
				error: "Only project owners or admins can resend invitations",
			};
		}

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
	data: { role?: "admin" | "member"; projectRole?: string },
) {
	try {
		const clerkId = await requireAuth();
		const caller = await queries.users.getByClerkId(clerkId);
		if (!caller) return { success: false, error: "Unauthorized" };

		const callerMembership = await db.query.projectMembers.findFirst({
			where: and(
				eq(projectMembers.projectId, projectId),
				eq(projectMembers.userId, caller.id),
			),
		});

		if (!callerMembership || callerMembership.role !== "admin") {
			return {
				success: false,
				error: "Only project owners or admins can update member details",
			};
		}

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

		const updateData: { role?: "admin" | "member"; projectRole?: string } = {};
		if (data.role) updateData.role = data.role;
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

		revalidatePath(`/`, "layout");
		return { success: true, data: updated[0] };
	} catch (error) {
		console.error("Failed to update member:", error);
		return { success: false, error: "Failed to update member" };
	}
}
