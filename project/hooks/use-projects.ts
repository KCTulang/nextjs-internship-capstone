import { create } from "zustand";
import {
	createProjectAction,
	deleteProjectAction,
	getProjectsAction,
	updateProjectAction,
} from "@/app/actions/projects";
import type {
	ProjectCapabilities,
	ProjectPermission,
} from "@/lib/project-permissions";
import { useUIStore } from "@/stores/ui-store";

export interface Project {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	ownerId: string;
	createdAt: Date | null;
	updatedAt: Date | null;
	dueDate?: Date | null;
	permission?: ProjectPermission | null;
	capabilities?: ProjectCapabilities;
	members?: unknown[];
	lists?: {
		id: string;
		name: string;
		isCompleted: boolean;
		tasks: unknown[];
	}[];
}

interface ProjectStore {
	projects: Project[];
	searchQuery: string;
	isLoading: boolean;
	error: string | null;

	page: number;
	hasMore: boolean;

	setSearchQuery: (query: string) => void;
	filteredProjects: () => Project[];

	fetchProjects: (reset?: boolean) => Promise<void>;
	createProject: (data: {
		name: string;
		description?: string;
		dueDate?: Date | null;
		ownerId: string;
	}) => Promise<void>;
	updateProject: (
		id: string,
		data: { name?: string; description?: string; dueDate?: Date | null },
	) => Promise<void>;
	deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
	projects: [],
	searchQuery: "",
	isLoading: false,
	error: null,
	page: 0,
	hasMore: true,

	setSearchQuery: (query) => set({ searchQuery: query }),
	filteredProjects: () => {
		const { projects, searchQuery } = get();
		if (!searchQuery.trim()) return projects;
		return projects.filter(
			(p) =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				p.description?.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	},

	fetchProjects: async (reset = false) => {
		const { page, projects } = get();
		const limit = 100;
		const offset = reset ? 0 : page * limit;

		set({ isLoading: true, error: null });

		const res = await getProjectsAction(limit, offset);
		if (res.success && res.data) {
			const newProjects: Project[] = res.data;
			set({
				projects: reset ? newProjects : [...projects, ...newProjects],
				page: reset ? 1 : page + 1,
				hasMore: newProjects.length === limit,
				isLoading: false,
			});
		} else {
			set({ error: res.error || "Failed to fetch", isLoading: false });
		}
	},

	createProject: async (data) => {
		const res = await createProjectAction(data);
		if (res.success && res.data) {
			set((state) => ({
				projects: [res.data, ...state.projects],
			}));
			useUIStore.getState().addToast({
				type: "success",
				message: "Project created successfully.",
			});
		} else {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to create project.",
			});
		}
	},

	updateProject: async (id, data) => {
		set((state) => ({
			projects: state.projects.map((p) =>
				p.id === id ? { ...p, ...data } : p,
			),
		}));
		const res = await updateProjectAction(id, data);
		if (res.success) {
			useUIStore.getState().addToast({
				type: "success",
				message: "Project updated successfully.",
			});
		} else {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to update project.",
			});
		}
	},

	deleteProject: async (id) => {
		set((state) => ({
			projects: state.projects.filter((p) => p.id !== id),
		}));
		const res = await deleteProjectAction(id);
		if (res.success) {
			useUIStore.getState().addToast({
				type: "success",
				message: "Project deleted successfully.",
			});
		} else {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to delete project.",
			});
		}
	},
}));
