// TODO: Task 4.5 - Design and implement project cards and layouts

/*
TODO: Implementation Notes for Interns:

This component should display:
- Project name and description
- Progress indicator
- Team member count
- Due date
- Status badge
- Actions menu (edit, delete, etc.)

Props interface:
interface ProjectCardProps {
  project: {
    id: string
    name: string
    description?: string
    progress: number
    memberCount: number
    dueDate?: Date
    status: 'active' | 'completed' | 'on-hold'
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

Features to implement:
- Hover effects
- Click to navigate to project board
- Responsive design
- Loading states
- Error states
*/

"use client";

import { Calendar, Edit, Folder, Trash, Users } from "lucide-react";
import Link from "next/link";
import type { Project } from "@/hooks/use-projects";
import { useProjectStore } from "@/hooks/use-projects";
import { useUIStore } from "@/stores/ui-store";

interface ProjectCardProps {
	project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
	const { deleteProject } = useProjectStore();
	const { openEditProjectModal } = useUIStore();

	const realMemberCount = project.members ? project.members.length : 1;

	let totalTasks = 0;
	let completedTasks = 0;

	if (project.lists) {
		project.lists.forEach((list) => {
			const taskCount = list.tasks?.length || 0;
			totalTasks += taskCount;

			const listName = list.name.toLowerCase();
			if (listName.includes("done") || listName.includes("complete")) {
				completedTasks += taskCount;
			}
		});
	}

	const realProgress =
		totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

	const realStatus =
		realProgress === 100 && totalTasks > 0 ? "completed" : "active";

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
					<span className="text-foreground font-semibold">{realProgress}%</span>
				</div>
				<div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
					<div
						className="h-full bg-primary rounded-full transition-all duration-500"
						style={{ width: `${realProgress}%` }}
					/>
				</div>
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
