"use client";

import { CalendarDays, Settings, Users } from "lucide-react";
import type { Project } from "@/hooks/use-projects";
import { useUIStore } from "@/stores/ui-store";

export function ProjectHeaderActions({ project }: { project: Project }) {
	const {
		openEditProjectModal,
		openProjectMembersModal,
		openProjectDeadlinesModal,
	} = useUIStore();
	const canEditProject = project.capabilities?.canEditProject === true;
	const controlClass =
		"inline-flex min-h-11 min-w-0 w-full items-center justify-center gap-2 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm lg:min-h-10 lg:w-auto lg:px-3";

	return (
		<div className="grid w-full min-w-0 basis-full grid-cols-2 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm min-[390px]:grid-cols-3 lg:flex lg:w-auto lg:basis-auto">
			<button
				type="button"
				onClick={openProjectMembersModal}
				className={controlClass}
				title="Project members"
			>
				<Users size={18} />
				<span>Members</span>
			</button>
			<button
				type="button"
				onClick={openProjectDeadlinesModal}
				className={controlClass}
				title="Project deadlines"
			>
				<CalendarDays size={18} />
				<span>Deadlines</span>
			</button>
			{canEditProject && (
				<button
					type="button"
					onClick={() => openEditProjectModal(project)}
					className={`${controlClass} col-span-2 min-[390px]:col-span-1 lg:col-auto`}
					title="Project settings"
				>
					<Settings size={18} />
					<span>Settings</span>
				</button>
			)}
		</div>
	);
}
