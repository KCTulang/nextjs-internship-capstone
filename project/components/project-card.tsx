"use client";

import { Calendar, Edit, Folder, Trash, Users } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/hooks/use-projects";
import { useProjectStore } from "@/hooks/use-projects";
import { getProjectCompletionStats } from "@/lib/tasks/completion";
import { useUIStore } from "@/stores/ui-store";

interface ProjectCardProps {
	project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
	const { deleteProject } = useProjectStore();
	const { openEditProjectModal } = useUIStore();

	const realMemberCount = project.members ? project.members.length : 1;

	const completion = getProjectCompletionStats(project.lists ?? []);
	const realStatus = completion.success
		? completion.progress === 100 && completion.totalTasks > 0
			? "completed"
			: "active"
		: "setup required";

	return (
		<div className="group relative bg-card hover:bg-card/80 border border-border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40">
			<div className="flex items-start justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="p-2.5 bg-primary/10 text-primary rounded-lg">
						<Folder size={20} />
					</div>
					<div>
						<Link
							href={`/projects/${project.slug}`}
							className="absolute inset-0 z-0"
							aria-label={`View ${project.name} details`}
						/>
						<h3 className="font-semibold text-foreground hover:text-primary transition-colors line-clamp-1 relative z-10">
							{project.name}
						</h3>
						<span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 relative z-10">
							<span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
							{realStatus.charAt(0).toUpperCase() + realStatus.slice(1)}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<button
						type="button"
						title="Edit Project"
						className="relative z-20 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
						onClick={(e) => {
							e.preventDefault();
							openEditProjectModal(project);
						}}
					>
						<Edit size={16} />
					</button>
					<button
						type="button"
						title="Delete Project"
						className="relative z-20 p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 rounded-md transition-colors"
						onClick={(e) => {
							e.preventDefault();
							if (
								window.confirm("Are you sure you want to delete this project?")
							) {
								deleteProject(project.id);
							}
						}}
					>
						<Trash size={16} />
					</button>
				</div>
			</div>

			<p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
				{project.description || "No description provided."}
			</p>
			<div className="mb-4">
				<div className="flex items-center justify-between text-xs mb-1.5">
					<span className="text-muted-foreground font-medium">Progress</span>
					<span className="text-foreground font-semibold">
						{completion.success ? `${completion.progress}%` : "—"}
					</span>
				</div>
				<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
					<div
						className="h-full bg-primary rounded-full transition-all duration-500"
						style={{
							width: `${completion.success ? completion.progress : 0}%`,
						}}
					/>
				</div>
				{!completion.success && (
					<p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
						{completion.guidance}
					</p>
				)}
			</div>

			<div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1.5" title="Team Members">
						<Users size={14} />
						<span>{realMemberCount}</span>
					</div>
					<div className="flex items-center gap-1.5" title="Due Date">
						<Calendar size={14} />
						<span>
							{project.dueDate
								? new Date(project.dueDate).toLocaleDateString()
								: "No due date"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
