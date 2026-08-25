import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlugAction } from "@/app/actions/projects";
import { KanbanBoard } from "@/components/kanban-board";
import { ProjectMembersModal } from "@/components/modals/project-members-modal";
import { PresenceAvatars } from "@/components/presence-avatars";
import { ProjectHeaderActions } from "@/components/project-header-actions";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const response = await getProjectBySlugAction(slug);
	if (!response.success || !response.data) {
		return { title: "Project Not Found" };
	}
	return { title: response.data.name };
}

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
		<div className="mx-auto max-w-450 space-y-5">
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

				<div className="flex items-center gap-4">
					<PresenceAvatars projectId={project.id} />
					<ProjectHeaderActions project={project} />
				</div>
			</div>

			<div className="flex min-h-125 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-muted/30 p-2 sm:min-h-150 sm:p-3 lg:p-4">
				<KanbanBoard
					projectId={project.id}
					projectName={project.name}
					canManageColumns={project.canManageColumns}
					canMutateTasks={project.capabilities.canMutateTasks}
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

			<ProjectMembersModal
				project={project}
				currentUserId={project.currentUserId}
				permission={project.permission}
				canManageMembers={project.capabilities.canManageMembers}
			/>
		</div>
	);
}
