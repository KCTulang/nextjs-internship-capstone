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
		"inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[430px]:px-3";

	return (
		<div className="flex w-full items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm sm:w-auto">
			<button
				type="button"
				onClick={openProjectMembersModal}
				className={controlClass}
				title="Project members"
			>
				<Users size={18} />
				<span className="hidden min-[430px]:inline">Members</span>
			</button>
			<button
				type="button"
				onClick={openProjectDeadlinesModal}
				className={controlClass}
				title="Project deadlines"
			>
				<CalendarDays size={18} />
				<span className="hidden min-[430px]:inline">Deadlines</span>
			</button>
			{canEditProject && (
				<button
					type="button"
					onClick={() => openEditProjectModal(project)}
					className={controlClass}
					title="Project settings"
				>
					<Settings size={18} />
					<span className="hidden min-[430px]:inline">Settings</span>
				</button>
			)}
		</div>
	);
}
