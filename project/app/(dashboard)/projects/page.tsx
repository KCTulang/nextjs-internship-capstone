"use client";

import {
	Filter,
	FolderOpen,
	Grid3X3,
	List,
	Plus,
	Search,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ProjectCard } from "@/components/project-card";
import { ProjectGridSkeleton } from "@/components/skeletons/project-card-skeleton";
import { useProjectStore } from "@/hooks/use-projects";
import { getProjectCompletionStats } from "@/lib/tasks/completion";
import { useUIStore } from "@/stores/ui-store";

const STATUS_TABS = ["All", "Active", "Completed"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const SORT_OPTIONS = [
	{ label: "Newest", value: "newest" },
	{ label: "Oldest", value: "oldest" },
	{ label: "Name (A-Z)", value: "name-asc" },
	{ label: "Name (Z-A)", value: "name-desc" },
] as const;
type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export default function ProjectsPage() {
	const { openCreateProjectModal } = useUIStore();
	const { projects, isLoading, error, fetchProjects } = useProjectStore();

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusTab>("All");
	const [sortBy, setSortBy] = useState<SortOption>("newest");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [showFilters, setShowFilters] = useState(false);
	const projectsWithInvalidCompletion = useMemo(
		() =>
			projects.filter(
				(project) => !getProjectCompletionStats(project.lists ?? []).success,
			),
		[projects],
	);

	useEffect(() => {
		fetchProjects(true);
	}, [fetchProjects]);

	const filteredAndSorted = useMemo(() => {
		let result = [...projects];

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.description?.toLowerCase().includes(q),
			);
		}

		if (statusFilter !== "All") {
			result = result.filter((p) => {
				const completion = getProjectCompletionStats(p.lists ?? []);
				if (!completion.success) return statusFilter === "Active";
				return statusFilter === "Completed"
					? completion.progress === 100 && completion.totalTasks > 0
					: !(completion.progress === 100 && completion.totalTasks > 0);
			});
		}

		result.sort((a, b) => {
			if (sortBy === "newest")
				return (
					new Date(b.createdAt || 0).getTime() -
					new Date(a.createdAt || 0).getTime()
				);
			if (sortBy === "oldest")
				return (
					new Date(a.createdAt || 0).getTime() -
					new Date(b.createdAt || 0).getTime()
				);
			if (sortBy === "name-asc") return a.name.localeCompare(b.name);
			if (sortBy === "name-desc") return b.name.localeCompare(a.name);
			return 0;
		});

		return result;
	}, [projects, searchQuery, statusFilter, sortBy]);

	const totalTasks = useMemo(
		() =>
			projects.reduce(
				(s, p) =>
					s + (p.lists?.reduce((ls, l) => ls + (l.tasks?.length || 0), 0) || 0),
				0,
			),
		[projects],
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Projects</h1>
					<p className="text-muted-foreground mt-1">
						{projects.length} project{projects.length !== 1 ? "s" : ""} &middot;{" "}
						{totalTasks} total task{totalTasks !== 1 ? "s" : ""}
					</p>
				</div>
				<button
					id="create-project-btn"
					type="button"
					onClick={openCreateProjectModal}
					className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm shadow-sm"
				>
					<Plus size={18} />
					New Project
				</button>
			</div>

			<div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
				{STATUS_TABS.map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setStatusFilter(tab)}
						className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
							statusFilter === tab
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{tab}
					</button>
				))}
			</div>

			{projectsWithInvalidCompletion.length > 0 && (
				<div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
					{projectsWithInvalidCompletion.length} project
					{projectsWithInvalidCompletion.length === 1 ? " needs" : "s need"} a
					valid completed column. Ask an owner or admin to configure it; those
					projects are not classified as completed.
				</div>
			)}

			<div className="flex flex-col sm:flex-row gap-3">
				<div className="relative flex-1">
					<Search
						className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
						size={16}
					/>
					<input
						id="project-search"
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search projects by name or description..."
						className="w-full pl-9 pr-9 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						>
							<X size={14} />
						</button>
					)}
				</div>

				<div className="flex gap-2">
					<select
						id="project-sort"
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as SortOption)}
						className="px-3 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
					>
						{SORT_OPTIONS.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</select>

					<button
						type="button"
						onClick={() => setShowFilters((v) => !v)}
						className={`inline-flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
							showFilters
								? "border-primary text-primary bg-primary/5"
								: "border-border text-foreground hover:bg-muted"
						}`}
					>
						<Filter size={14} />
						Filters
					</button>

					<div className="flex gap-1 border border-border rounded-lg p-1 bg-card">
						<button
							type="button"
							title="Grid view"
							onClick={() => setViewMode("grid")}
							className={`p-1.5 rounded transition-colors ${
								viewMode === "grid"
									? "bg-muted text-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Grid3X3 size={14} />
						</button>
						<button
							type="button"
							title="List view"
							onClick={() => setViewMode("list")}
							className={`p-1.5 rounded transition-colors ${
								viewMode === "list"
									? "bg-muted text-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<List size={14} />
						</button>
					</div>
				</div>
			</div>

			{(searchQuery || statusFilter !== "All") && (
				<div className="flex items-center gap-2 flex-wrap text-sm">
					<span className="text-muted-foreground">Active filters:</span>
					{searchQuery && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
							Search: &ldquo;{searchQuery}&rdquo;
							<button type="button" onClick={() => setSearchQuery("")}>
								<X size={10} />
							</button>
						</span>
					)}
					{statusFilter !== "All" && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
							Status: {statusFilter}
							<button type="button" onClick={() => setStatusFilter("All")}>
								<X size={10} />
							</button>
						</span>
					)}
					<button
						type="button"
						onClick={() => {
							setSearchQuery("");
							setStatusFilter("All");
						}}
						className="text-muted-foreground hover:text-foreground underline underline-offset-2"
					>
						Clear all
					</button>
				</div>
			)}

			{isLoading && projects.length === 0 ? (
				<ProjectGridSkeleton
					className={
						viewMode === "grid"
							? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
							: "grid-cols-1"
					}
				/>
			) : error && projects.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-16 text-center">
					<p className="font-medium text-destructive">
						Unable to load projects
					</p>
					<p className="mt-1 text-sm text-destructive/80">{error}</p>
					<button
						type="button"
						onClick={() => void fetchProjects(true)}
						className="mt-4 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						Try again
					</button>
				</div>
			) : filteredAndSorted.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-20 border border-dashed border-border rounded-xl text-center">
					<div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
						<FolderOpen size={28} className="text-muted-foreground" />
					</div>
					{searchQuery || statusFilter !== "All" ? (
						<>
							<h3 className="text-lg font-semibold text-foreground mb-2">
								No projects match your filters
							</h3>
							<p className="text-muted-foreground text-sm mb-4">
								Try adjusting your search or filter criteria.
							</p>
							<button
								type="button"
								onClick={() => {
									setSearchQuery("");
									setStatusFilter("All");
								}}
								className="text-primary hover:underline font-medium text-sm"
							>
								Clear filters
							</button>
						</>
					) : (
						<>
							<h3 className="text-lg font-semibold text-foreground mb-2">
								No projects yet
							</h3>
							<p className="text-muted-foreground text-sm mb-4">
								Create your first project to get started.
							</p>
							<button
								type="button"
								onClick={openCreateProjectModal}
								className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
							>
								<Plus size={16} />
								Create Project
							</button>
						</>
					)}
				</div>
			) : (
				<div
					className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
				>
					{filteredAndSorted.map((project) => (
						<ProjectCard key={project.id} project={project} />
					))}
				</div>
			)}
		</div>
	);
}
