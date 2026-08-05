"use client";

import { CheckCircle, Clock, Plus, TrendingUp, Users } from "lucide-react";
import { useEffect } from "react";
import { ProjectCard } from "@/components/project-card";
import { useProjectStore } from "@/hooks/use-projects";
import { useUIStore } from "@/stores/ui-store";

export default function DashboardPage() {
	const { openCreateProjectModal } = useUIStore();
	const { projects, isLoading, fetchProjects } = useProjectStore();

	useEffect(() => {
		fetchProjects(true);
	}, [fetchProjects]);

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
				<p className="text-muted-foreground mt-2">
					Welcome back! Here's an overview of your projects and tasks.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{[
					{
						name: "Active Projects",
						value: projects.length.toString(), // Automatically updates!
						icon: TrendingUp,
						change: "+2.5%",
					},
					{ name: "Team Members", value: "24", icon: Users, change: "+4.1%" },
					{
						name: "Completed Tasks",
						value: "156",
						icon: CheckCircle,
						change: "+12.3%",
					},
					{
						name: "Pending Tasks",
						value: "43",
						icon: Clock,
						change: "-2.1%",
					},
				].map((stat) => (
					<div
						key={stat.name}
						className="bg-card overflow-hidden rounded-lg border border-border p-6"
					>
						<div className="flex items-center">
							<div className="shrink-0">
								<div className="w-8 h-8 bg-primary dark:bg-primary rounded-lg flex items-center justify-center">
									<stat.icon className="text-primary" size={20} />
								</div>
							</div>
							<div className="ml-5 w-0 flex-1">
								<dl>
									<dt className="text-sm font-medium text-muted-foreground truncate">
										{stat.name}
									</dt>
									<dd className="flex items-baseline">
										<div className="text-2xl font-semibold text-foreground">
											{stat.value}
										</div>
										<div className="ml-2 flex items-baseline text-sm font-semibold text-green-600 dark:text-green-400">
											{stat.change}
										</div>
									</dd>
								</dl>
							</div>
						</div>
					</div>
				))}
			</div>

			<div className="bg-card rounded-lg border border-border p-6">
				<h3 className="text-lg font-semibold text-foreground mb-4">
					Quick Actions
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<button
						type="button"
						onClick={openCreateProjectModal}
						className="w-full flex items-center justify-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors"
					>
						<Plus size={20} className="mr-2" />
						Create New Project
					</button>
					<button
						type="button"
						className="w-full flex items-center justify-center px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
					>
						<Plus size={20} className="mr-2" />
						Add Team Member
					</button>
					<button
						type="button"
						className="w-full flex items-center justify-center px-4 py-3 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
					>
						<Plus size={20} className="mr-2" />
						Create Task
					</button>
				</div>
			</div>

			<div className="mt-8">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-xl font-bold text-foreground">All Projects</h2>
				</div>

				{isLoading && projects.length === 0 ? (
					<div className="text-center py-10 text-muted-foreground animate-pulse">
						Loading projects...
					</div>
				) : projects.length === 0 ? (
					<div className="text-center py-10 border border-dashed border-border rounded-xl">
						<p className="text-muted-foreground mb-4">No projects yet.</p>
						<button
							type="button"
							onClick={openCreateProjectModal}
							className="text-primary hover:underline font-medium"
						>
							Create your first project
						</button>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{projects.map((project) => (
							<ProjectCard key={project.id} project={project} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
