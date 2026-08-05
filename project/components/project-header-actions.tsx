"use client";

import { Calendar, MoreHorizontal, Settings, Users } from "lucide-react";
import type { Project } from "@/hooks/use-projects";
import { useUIStore } from "@/stores/ui-store";

export function ProjectHeaderActions({ project }: { project: Project }) {
	const { openEditProjectModal, addToast } = useUIStore();

	const handleNotImplemented = (feature: string) => {
		addToast({
			message: `${feature} feature coming soon!`,
			type: "info",
		});
	};

	return (
		<div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
			<button
				type="button"
				onClick={() => handleNotImplemented("Team members")}
				className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
				title="Team Members"
			>
				<Users size={20} />
			</button>
			<button
				type="button"
				onClick={() => handleNotImplemented("Calendar view")}
				className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
				title="Calendar View"
			>
				<Calendar size={20} />
			</button>
			<button
				type="button"
				onClick={() => openEditProjectModal(project)}
				className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
				title="Project Settings"
			>
				<Settings size={20} />
			</button>
			<button
				type="button"
				onClick={() => handleNotImplemented("More options")}
				className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
				title="More Options"
			>
				<MoreHorizontal size={20} />
			</button>
		</div>
	);
}
