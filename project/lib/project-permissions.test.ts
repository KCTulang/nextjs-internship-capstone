import { describe, expect, it } from "vitest";
import {
	getEffectiveProjectPermission,
	getProjectCapabilities,
} from "./project-permissions";

describe("project permissions", () => {
	it("derives owner from project ownership before membership role", () => {
		expect(getEffectiveProjectPermission("user-1", "user-1", "admin")).toBe(
			"owner",
		);
	});

	it.each([
		["owner", true, true, true, true, false],
		["admin", true, true, true, false, true],
		["member", true, false, false, false, true],
		["viewer", false, false, false, false, true],
	] as const)(
		"enforces the %s capability matrix",
		(permission, canMutateTasks, canManageColumns, canEditProject, canDeleteProject, canLeaveProject) => {
			const capabilities = getProjectCapabilities(permission);
			expect(capabilities.canViewProject).toBe(true);
			expect(capabilities.canMutateTasks).toBe(canMutateTasks);
			expect(capabilities.canManageColumns).toBe(canManageColumns);
			expect(capabilities.canManageMembers).toBe(canManageColumns);
			expect(capabilities.canEditProject).toBe(canEditProject);
			expect(capabilities.canDeleteProject).toBe(canDeleteProject);
			expect(capabilities.canLeaveProject).toBe(canLeaveProject);
		},
	);

	it("rejects unknown membership values", () => {
		expect(
			getEffectiveProjectPermission("owner", "member", "contributor"),
		).toBeNull();
	});
});
