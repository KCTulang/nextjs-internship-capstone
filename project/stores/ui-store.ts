// TODO: Task 5.3 - Set up client-side state management with Zustand

/*
TODO: Implementation Notes for Interns:

UI state management store for:
- Modal states (create project, create task, etc.)
- Sidebar state
- Theme preferences
- Loading states
- Error states
- Notifications/toasts

Install: pnpm add zustand

Example structure:
import { create } from 'zustand'

interface UIState {
  // Modal states
  isCreateProjectModalOpen: boolean
  isCreateTaskModalOpen: boolean
  isTaskDetailModalOpen: boolean
  selectedTaskId: string | null

  // UI states
  sidebarOpen: boolean
  theme: 'light' | 'dark'

  // Loading states
  isLoading: boolean
  loadingMessage: string

  // Actions
  openCreateProjectModal: () => void
  closeCreateProjectModal: () => void
  openCreateTaskModal: () => void
  closeCreateTaskModal: () => void
  openTaskDetailModal: (taskId: string) => void
  closeTaskDetailModal: () => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setLoading: (loading: boolean, message?: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  // ... implementation
}))
*/

// TODO: Task 5.3 - Set up client-side state management with Zustand

/*
TODO: Implementation Notes for Interns:

UI state management store for:
- Modal states (create project, create task, etc.)
- Sidebar state
- Theme preferences
- Loading states
- Error states
- Notifications/toasts

Install: pnpm add zustand
*/

import { create } from "zustand";
import type { Project } from "@/hooks/use-projects";

export interface Toast {
	id: string;
	message: string;
	type: "success" | "error" | "info" | "warning";
}

interface UIState {
	isCreateProjectModalOpen: boolean;
	isCreateTaskModalOpen: boolean;
	selectedListIdForNewTask: string | null;
	activeProjectId: string | null;
	isEditProjectModalOpen: boolean;
	selectedProjectForEdit: Project | null;
	openEditProjectModal: (project: Project) => void;
	closeEditProjectModal: () => void;

	isTaskDetailModalOpen: boolean;
	selectedTaskId: string | null;

	sidebarOpen: boolean;
	theme: "light" | "dark";

	isLoading: boolean;
	loadingMessage: string;

	error: string | null;

	toasts: Toast[];

	openCreateProjectModal: () => void;
	closeCreateProjectModal: () => void;
	openCreateTaskModal: (listId: string, projectId: string) => void;
	closeCreateTaskModal: () => void;
	openTaskDetailModal: (taskId: string) => void;
	closeTaskDetailModal: () => void;
	toggleSidebar: () => void;
	setTheme: (theme: "light" | "dark") => void;
	setLoading: (loading: boolean, message?: string) => void;
	setError: (error: string | null) => void;
	clearError: () => void;
	addToast: (toast: Omit<Toast, "id">) => void;
	removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
	isCreateProjectModalOpen: false,
	isCreateTaskModalOpen: false,
	selectedListIdForNewTask: null,
	activeProjectId: null,
	isEditProjectModalOpen: false,
	selectedProjectForEdit: null,
	isTaskDetailModalOpen: false,
	selectedTaskId: null,

	sidebarOpen: false,
	theme: "dark",

	isLoading: false,
	loadingMessage: "",

	error: null,
	toasts: [],

	openCreateProjectModal: () => set({ isCreateProjectModalOpen: true }),
	closeCreateProjectModal: () => set({ isCreateProjectModalOpen: false }),
	openEditProjectModal: (project) =>
		set({ isEditProjectModalOpen: true, selectedProjectForEdit: project }),
	closeEditProjectModal: () =>
		set({ isEditProjectModalOpen: false, selectedProjectForEdit: null }),
	openCreateTaskModal: (listId, projectId) =>
		set({
			isCreateTaskModalOpen: true,
			selectedListIdForNewTask: listId,
			activeProjectId: projectId,
		}),
	closeCreateTaskModal: () =>
		set({
			isCreateTaskModalOpen: false,
			selectedListIdForNewTask: null,
			activeProjectId: null,
		}),
	openTaskDetailModal: (taskId) =>
		set({ isTaskDetailModalOpen: true, selectedTaskId: taskId }),
	closeTaskDetailModal: () =>
		set({ isTaskDetailModalOpen: false, selectedTaskId: null }),
	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
	setTheme: (theme) => set({ theme }),
	setLoading: (loading, message = "") =>
		set({ isLoading: loading, loadingMessage: message }),

	setError: (error) => set({ error }),
	clearError: () => set({ error: null }),

	addToast: (toast) =>
		set((state) => ({
			toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
		})),
	removeToast: (id) =>
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		})),
}));
