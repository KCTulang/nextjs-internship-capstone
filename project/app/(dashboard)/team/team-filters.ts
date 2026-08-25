import type { TeamMember } from "./types";

interface TeamFilters {
	search: string;
	permission: string;
	projectRole: string;
}

export function filterTeamMembers(
	members: TeamMember[],
	{ search, permission, projectRole }: TeamFilters,
) {
	const query = search.trim().toLowerCase();

	return members.filter((member) => {
		const matchesSearch =
			!query ||
			member.name.toLowerCase().includes(query) ||
			member.email.toLowerCase().includes(query) ||
			member.roles.some(
				(membership) =>
					membership.projectName.toLowerCase().includes(query) ||
					membership.projectRole.toLowerCase().includes(query),
			);
		const matchesPermission =
			!permission ||
			member.roles.some((membership) => membership.role === permission);
		const matchesProjectRole =
			!projectRole ||
			member.roles.some(
				(membership) => membership.projectRole.trim() === projectRole,
			);

		return matchesSearch && matchesPermission && matchesProjectRole;
	});
}

export function getProjectRoleOptions(
	members: TeamMember[],
	supportedRoles: readonly string[],
) {
	const usedRoles = new Set(
		members.flatMap((member) =>
			member.roles
				.map((membership) => membership.projectRole.trim())
				.filter(Boolean),
		),
	);
	const supportedOptions = supportedRoles.filter((role) =>
		usedRoles.delete(role),
	);

	return [...supportedOptions, ...Array.from(usedRoles).sort()];
}
