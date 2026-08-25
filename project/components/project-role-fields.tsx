"use client";

import {
	getProjectRoleOption,
	OTHER_PROJECT_ROLE,
	PROJECT_ROLES,
	type ProjectRoleOption,
} from "@/utils/roles";

interface ProjectRoleFieldsProps {
	idPrefix: string;
	selectedRole: ProjectRoleOption;
	customRole: string;
	onSelectedRoleChange: (role: ProjectRoleOption) => void;
	onCustomRoleChange: (role: string) => void;
	error?: string | null;
	description?: string;
	disabled?: boolean;
}

export function ProjectRoleFields({
	idPrefix,
	selectedRole,
	customRole,
	onSelectedRoleChange,
	onCustomRoleChange,
	error,
	description,
	disabled = false,
}: ProjectRoleFieldsProps) {
	const selectId = `${idPrefix}-project-role`;
	const descriptionId = `${idPrefix}-project-role-description`;
	const customRoleId = `${idPrefix}-custom-project-role`;
	const errorId = `${idPrefix}-custom-project-role-error`;

	return (
		<div className="min-w-0 space-y-1.5">
			<label
				htmlFor={selectId}
				className="block text-sm font-semibold text-foreground"
			>
				Project Role / Job Title
			</label>
			<select
				id={selectId}
				value={selectedRole}
				onChange={(event) =>
					onSelectedRoleChange(getProjectRoleOption(event.target.value))
				}
				disabled={disabled}
				aria-describedby={description ? descriptionId : undefined}
				className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
			>
				{PROJECT_ROLES.map((role) => (
					<option key={role} value={role}>
						{role}
					</option>
				))}
			</select>
			{description && (
				<p id={descriptionId} className="text-xs text-muted-foreground">
					{description}
				</p>
			)}

			{selectedRole === OTHER_PROJECT_ROLE && (
				<div className="min-w-0 space-y-1.5 pt-1.5">
					<label
						htmlFor={customRoleId}
						className="block text-sm font-semibold text-foreground"
					>
						Custom Project Role
					</label>
					<input
						id={customRoleId}
						type="text"
						value={customRole}
						onChange={(event) => onCustomRoleChange(event.target.value)}
						placeholder="e.g. Mobile Developer"
						autoComplete="organization-title"
						disabled={disabled}
						aria-required={!disabled}
						aria-invalid={Boolean(error)}
						aria-describedby={error ? errorId : undefined}
						className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					/>
					{error && (
						<p id={errorId} className="text-xs font-medium text-destructive">
							{error}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
