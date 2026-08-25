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
		<div className="mx-auto w-full min-w-0 max-w-450 space-y-5">
			<div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex w-full min-w-0 items-start gap-2 sm:gap-4 lg:flex-1">
					<Link
						href="/dashboard"
						className="-ml-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted sm:ml-0"
						aria-label="Back to dashboard"
					>
						<ArrowLeft size={20} />
					</Link>
					<div className="min-w-0 flex-1">
						<h1 className="wrap-break-word text-2xl font-bold text-foreground sm:text-3xl lg:truncate">
							{project.name}
						</h1>
						<p className="mt-0.5 wrap-break-word text-sm text-muted-foreground sm:mt-1 sm:text-base lg:truncate">
							Kanban board view for project management
						</p>
					</div>
				</div>

				<div className="flex w-full min-w-0 flex-wrap items-center gap-3 lg:w-auto lg:shrink-0 lg:flex-nowrap">
					<PresenceAvatars projectId={project.id} />
					<ProjectHeaderActions project={project} />
				</div>
			</div>

			<div className="flex min-h-125 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-muted/30 p-0 sm:min-h-150 sm:p-3 lg:p-4">
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
