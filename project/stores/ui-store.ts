import { create } from "zustand";
import type { CalendarTask } from "@/components/calendar/calendar-grid";
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
	activeProjectName: string | null;
	initialDueDate: string | null;
	taskCreationSource: "column" | "board" | "global";
	isEditProjectModalOpen: boolean;
	selectedProjectForEdit: Project | null;
	openEditProjectModal: (project: Project) => void;
	closeEditProjectModal: () => void;
	isProjectMembersModalOpen: boolean;
	openProjectMembersModal: () => void;
	closeProjectMembersModal: () => void;
	isProjectDeadlinesModalOpen: boolean;
	openProjectDeadlinesModal: () => void;
	closeProjectDeadlinesModal: () => void;

	isTaskDetailModalOpen: boolean;
	selectedTaskId: string | null;

	isPreviewTaskModalOpen: boolean;
	selectedPreviewTask: CalendarTask | null;

	sidebarOpen: boolean;
	theme: "light" | "dark";

	isLoading: boolean;
	loadingMessage: string;

	error: string | null;

	toasts: Toast[];

	openCreateProjectModal: () => void;
	closeCreateProjectModal: () => void;
	openCreateTaskModal: (options?: {
		listId?: string;
		projectId?: string;
		projectName?: string;
		initialDueDate?: string;
		source?: "column" | "board" | "global";
	}) => void;
	closeCreateTaskModal: () => void;
	isInviteMemberModalOpen: boolean;
	openInviteMemberModal: () => void;
	closeInviteMemberModal: () => void;
	openTaskDetailModal: (taskId: string) => void;
	closeTaskDetailModal: () => void;
	openPreviewTaskModal: (task: CalendarTask) => void;
	closePreviewTaskModal: () => void;
	toggleSidebar: () => void;
	setTheme: (theme: "light" | "dark") => void;
	setLoading: (loading: boolean, message?: string) => void;
	setError: (error: string | null) => void;
	clearError: () => void;
	addToast: (toast: Omit<Toast, "id">) => void;
	removeToast: (id: string) => void;

	isConfirmModalOpen: boolean;
	confirmModalProps: {
		title: string;
		description: string;
		confirmText?: string;
		cancelText?: string;
		onConfirm: () => void | Promise<void>;
	} | null;
	openConfirmModal: (props: NonNullable<UIState["confirmModalProps"]>) => void;
	closeConfirmModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
	isCreateProjectModalOpen: false,
	isCreateTaskModalOpen: false,
	selectedListIdForNewTask: null,
	activeProjectId: null,
	activeProjectName: null,
	initialDueDate: null,
	taskCreationSource: "global",
	isEditProjectModalOpen: false,
	selectedProjectForEdit: null,
	isProjectMembersModalOpen: false,
	isProjectDeadlinesModalOpen: false,
	isTaskDetailModalOpen: false,
	selectedTaskId: null,
	isPreviewTaskModalOpen: false,
	selectedPreviewTask: null,

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
	openProjectMembersModal: () => set({ isProjectMembersModalOpen: true }),
	closeProjectMembersModal: () => set({ isProjectMembersModalOpen: false }),
	openProjectDeadlinesModal: () => set({ isProjectDeadlinesModalOpen: true }),
	closeProjectDeadlinesModal: () => set({ isProjectDeadlinesModalOpen: false }),
	isInviteMemberModalOpen: false,
	openInviteMemberModal: () => set({ isInviteMemberModalOpen: true }),
	closeInviteMemberModal: () => set({ isInviteMemberModalOpen: false }),
	openCreateTaskModal: (options) =>
		set({
			isCreateTaskModalOpen: true,
			selectedListIdForNewTask: options?.listId || null,
			activeProjectId: options?.projectId || null,
			activeProjectName: options?.projectName || null,
			initialDueDate: options?.initialDueDate || null,
			taskCreationSource: options?.source || "global",
		}),
	closeCreateTaskModal: () =>
		set({
			isCreateTaskModalOpen: false,
			selectedListIdForNewTask: null,
			activeProjectId: null,
			activeProjectName: null,
			initialDueDate: null,
			taskCreationSource: "global",
		}),
	openTaskDetailModal: (taskId) =>
		set({ isTaskDetailModalOpen: true, selectedTaskId: taskId }),
	closeTaskDetailModal: () =>
		set({ isTaskDetailModalOpen: false, selectedTaskId: null }),
	openPreviewTaskModal: (task) =>
		set({ isPreviewTaskModalOpen: true, selectedPreviewTask: task }),
	closePreviewTaskModal: () =>
		set({ isPreviewTaskModalOpen: false, selectedPreviewTask: null }),
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

	isConfirmModalOpen: false,
	confirmModalProps: null,
	openConfirmModal: (props) =>
		set({ isConfirmModalOpen: true, confirmModalProps: props }),
	closeConfirmModal: () =>
		set({ isConfirmModalOpen: false, confirmModalProps: null }),
}));
