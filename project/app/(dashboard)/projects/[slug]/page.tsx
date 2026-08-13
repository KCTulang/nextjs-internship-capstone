import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlugAction } from "@/app/actions/projects";
import { KanbanBoard } from "@/components/kanban-board";
import { ProjectHeaderActions } from "@/components/project-header-actions";

export default async function ProjectPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	const response = await getProjectBySlugAction(slug);
	if (!response.success || !response.data) {
		notFound();
	}
	const project = response.data;

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div className="flex items-center space-x-2 sm:space-x-4">
					<Link
						href="/dashboard"
						className="p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors -ml-1 sm:ml-0"
					>
						<ArrowLeft size={20} />
					</Link>
					<div className="min-w-0">
						<h1 className="text-2xl sm:text-3xl font-bold text-foreground truncate">
							{project.name}
						</h1>
						<p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1 truncate">
							Kanban board view for project management
						</p>
					</div>
				</div>

				<ProjectHeaderActions project={project} />
			</div>

			<div className="flex-1 bg-card rounded-lg border border-border p-3 sm:p-4 lg:p-6 min-h-125 sm:min-h-150 overflow-hidden flex flex-col">
				<KanbanBoard
					projectId={project.id}
					members={Array.from(
						new Map(
							[
								project.owner,
								...project.members.map(
									(m: { user: { id: string; name: string; email: string } }) =>
										m.user,
								),
							].map((user) => [user.id, user]),
						).values(),
					)}
				/>
			</div>
		</div>
	);
}
