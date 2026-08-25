export const PROJECT_ROLES = [
	"Software Developer",
	"Front-End Developer",
	"Back-End Developer",
	"Full-Stack Developer",
	"UI/UX Designer",
	"Project Manager",
	"Documentation",
	"QA / Tester",
	"DevOps",
	"Data Analyst",
	"Other",
] as const;

export const OTHER_PROJECT_ROLE = "Other";
export const CUSTOM_PROJECT_ROLE_ERROR = "Enter a custom project role.";

export type ProjectRoleOption = (typeof PROJECT_ROLES)[number];

export function getProjectRoleOption(value: string): ProjectRoleOption {
	return PROJECT_ROLES.find((role) => role === value) ?? PROJECT_ROLES[0];
}

export function getProjectRoleFormValues(storedRole: string): {
	selectedRole: ProjectRoleOption;
	customRole: string;
} {
	const normalizedRole = storedRole.trim();
	const predefinedRole = PROJECT_ROLES.find(
		(role) => role === normalizedRole && role !== OTHER_PROJECT_ROLE,
	);

	if (predefinedRole) {
		return { selectedRole: predefinedRole, customRole: "" };
	}

	return {
		selectedRole: OTHER_PROJECT_ROLE,
		customRole:
			normalizedRole.toLowerCase() === OTHER_PROJECT_ROLE.toLowerCase()
				? ""
				: normalizedRole,
	};
}

export function resolveProjectRole(
	selectedRole: ProjectRoleOption,
	customRole: string,
) {
	if (selectedRole !== OTHER_PROJECT_ROLE) return selectedRole;

	const normalizedCustomRole = customRole.trim();
	return normalizedCustomRole &&
		normalizedCustomRole.toLowerCase() !== OTHER_PROJECT_ROLE.toLowerCase()
		? normalizedCustomRole
		: null;
}
