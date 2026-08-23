import { create } from "zustand";
import {
	bulkUpdateListOrderAction,
	createListAction,
	deleteListAction,
	generateDefaultListsAction,
	getListsAction,
	updateListAction,
} from "@/app/actions/lists";
import {
	bulkUpdateTaskOrderAction,
	createTaskAction,
	deleteTaskAction,
	updateTaskAction,
} from "@/app/actions/tasks";
import type { CollaborationEvent } from "@/services/realtime/events";
import { useUIStore } from "@/stores/ui-store";
import type { TaskDTO } from "@/types/task";
import type { TaskPriority } from "@/utils/validations";
import {
	applyCompletedListDesignation,
	type BoardList,
	compareBoardLists,
	compareBoardTasks,
	upsertListById,
	upsertTaskById,
} from "./board-state";

export type Task = TaskDTO;
export type List = BoardList;

export interface Member {
	id: string;
	name: string;
	email: string;
}

export interface TasksState {
	lists: List[];
	members: Member[];
	isLoading: boolean;
	isSyncing: boolean;
	isCreatingTask: boolean;
	isCreatingList: boolean;
	error: string | null;
	mutationVersions: Record<string, number>;

	setMembers: (members: Member[]) => void;
	fetchBoard: (projectId: string) => Promise<void>;
	generateDefaultLists: (projectId: string) => Promise<void>;
	applyRealtimeEvent: (event: CollaborationEvent) => void;
	reconcileTasks: (tasks: TaskDTO[]) => void;

	createTask: (
		data: {
			title: string;
			description?: string;
			listId: string;
			priority?: TaskPriority;
			dueDate?: string | null;
			assigneeId?: string | null;
			labels?: string[];
		},
		projectId?: string | null,
	) => Promise<{
		success: boolean;
		error?: string;
		fieldErrors?: Record<string, string>;
	}>;
	updateTaskDetails: (
		taskId: string,
		data: Partial<Task>,
		projectId?: string | null,
	) => Promise<void>;
	updateTaskComments: (taskId: string, comments: { id: string }[]) => void;
	moveTask: (
		taskId: string,
		sourceListId: string,
		destListId: string,
		destIndex: number,
		projectId: string,
	) => Promise<void>;
	deleteTask: (taskId: string, projectId?: string | null) => Promise<void>;

	addList: (
		name: string,
		projectId: string,
	) => Promise<{ success: boolean; error?: string }>;
	renameList: (
		listId: string,
		name: string,
		projectId: string,
	) => Promise<void>;
	removeList: (listId: string, projectId: string) => Promise<void>;
	moveList: (
		listId: string,
		newPosition: number,
		projectId: string,
	) => Promise<void>;

	selectedTaskIds: string[];
	setSelectedTaskIds: (ids: string[]) => void;
	toggleTaskSelection: (taskId: string, force?: boolean) => void;
	clearSelection: () => void;
	deleteSelectedTasks: (projectId: string) => Promise<void>;
	moveSelectedTasks: (destListId: string, projectId: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
	lists: [],
	members: [],
	isLoading: false,
	isSyncing: false,
	isCreatingTask: false,
	isCreatingList: false,
	error: null,
	mutationVersions: {},
	selectedTaskIds: [],
	setSelectedTaskIds: (ids) => set({ selectedTaskIds: ids }),

	setMembers: (members) => set({ members }),
	reconcileTasks: (tasks) =>
		set((state) => ({
			lists: tasks.reduce(upsertTaskById, state.lists),
		})),

	applyRealtimeEvent: (event) => {
		if (event.type === "task.created" && event.payload?.task) {
			const task = event.payload.task as Task;
			set((state) => ({ lists: upsertTaskById(state.lists, task) }));
		} else if (event.type === "task.updated" && event.payload?.task) {
			const updatedTask = event.payload.task as Task;
			set((state) => ({ lists: upsertTaskById(state.lists, updatedTask) }));
		} else if (event.type === "task.deleted") {
			set((state) => ({
				lists: state.lists.map((list) => ({
					...list,
					tasks: list.tasks.filter((t) => t.id !== event.entityId),
				})),
			}));
		} else if (event.type === "task.moved" && event.payload?.task) {
			const task = event.payload.task as Task;
			set((state) => {
				const newLists = state.lists.map((list) => ({
					...list,
					tasks: list.tasks.filter((t) => t.id !== task.id),
				}));
				const targetList = newLists.find((l) => l.id === task.listId);
				if (targetList) {
					targetList.tasks.push(task);
					targetList.tasks.sort(compareBoardTasks);
				}
				return { lists: newLists };
			});
		} else if (event.type === "task.reordered" && event.payload) {
			const payload = event.payload as {
				id: string;
				listId: string;
				position: number;
			};
			const { id, listId, position } = payload;
			set((state) => {
				const newLists = state.lists.map((list) => ({
					...list,
					tasks: list.tasks.filter((t) => t.id !== id),
				}));

				const originalTask = state.lists
					.flatMap((l) => l.tasks)
					.find((t) => t.id === id);
				const targetList = newLists.find((l) => l.id === listId);

				if (originalTask && targetList) {
					targetList.tasks.push({ ...originalTask, listId, position });
					targetList.tasks.sort(compareBoardTasks);
				}
				return { lists: newLists };
			});
		} else if (event.type === "list.created" && event.payload?.list) {
			const list = event.payload.list as Omit<List, "tasks">;
			set((state) => ({ lists: upsertListById(state.lists, list) }));
		} else if (event.type === "list.updated" && event.payload?.list) {
			const listData = event.payload.list as {
				id: string;
				[key: string]: unknown;
			};
			set((state) => ({
				lists: state.lists.map((l) =>
					l.id === listData.id ? { ...l, ...listData } : l,
				),
			}));
		} else if (event.type === "list.deleted") {
			set((state) => ({
				lists: state.lists.filter((l) => l.id !== event.entityId),
			}));
		} else if (event.type === "list.reordered" && event.payload) {
			const payload = event.payload as { id: string; position: number };
			const { id, position } = payload;
			set((state) => ({
				lists: state.lists
					.map((l) => (l.id === id ? { ...l, position } : l))
					.sort(compareBoardLists),
			}));
		} else if (event.type === "list.completion_changed") {
			const { completedListId } = event.payload;
			const result = applyCompletedListDesignation(
				get().lists,
				completedListId,
			);
			if (result.status === "unknown") {
				void get().fetchBoard(event.projectId);
				return;
			}
			set({ lists: result.lists });
		} else if (
			event.type === "task.assigned" ||
			event.type === "task.unassigned"
		) {
			get().fetchBoard(event.projectId);
		}
	},

	toggleTaskSelection: (taskId, force) =>
		set((state) => {
			const isSelected = state.selectedTaskIds.includes(taskId);
			if (force === true && !isSelected)
				return { selectedTaskIds: [...state.selectedTaskIds, taskId] };
			if (force === false && isSelected)
				return {
					selectedTaskIds: state.selectedTaskIds.filter((id) => id !== taskId),
				};
			if (force !== undefined) return state;

			return {
				selectedTaskIds: isSelected
					? state.selectedTaskIds.filter((id) => id !== taskId)
					: [...state.selectedTaskIds, taskId],
			};
		}),

	clearSelection: () => set({ selectedTaskIds: [] }),

	deleteSelectedTasks: async (projectId) => {
		const { selectedTaskIds } = get();
		if (selectedTaskIds.length === 0) return;

		set((state) => ({
			lists: state.lists.map((list) => ({
				...list,
				tasks: list.tasks.filter((t) => !selectedTaskIds.includes(t.id)),
			})),
			selectedTaskIds: [],
		}));

		for (const id of selectedTaskIds) {
			await deleteTaskAction(id, projectId);
		}
		useUIStore.getState().addToast({
			type: "success",
			message: `Deleted ${selectedTaskIds.length} tasks`,
		});
	},

	moveSelectedTasks: async (destListId, projectId) => {
		const { selectedTaskIds, lists } = get();
		if (selectedTaskIds.length === 0) return;

		const tasksToMove = lists
			.flatMap((l) => l.tasks)
			.filter((t) => selectedTaskIds.includes(t.id));

		set((state) => {
			return {
				lists: state.lists.map((list) => {
					if (list.id === destListId) {
						return {
							...list,
							tasks: [
								...list.tasks,
								...tasksToMove
									.filter((t) => t.listId !== destListId)
									.map((t) => ({ ...t, listId: destListId })),
							],
						};
					}
					return {
						...list,
						tasks: list.tasks.filter(
							(t) => !selectedTaskIds.includes(t.id) || t.listId === destListId,
						),
					};
				}),
				selectedTaskIds: [],
			};
		});

		for (const task of tasksToMove) {
			if (task.listId !== destListId) {
				await updateTaskAction(task.id, { listId: destListId }, projectId);
			}
		}
		useUIStore.getState().addToast({
			type: "success",
			message: `Moved ${selectedTaskIds.length} tasks`,
		});
	},

	fetchBoard: async (projectId: string) => {
		set({ isLoading: true, error: null });
		const res = await getListsAction(projectId);
		if (res.success && res.data) {
			const lists = (res.data as unknown as List[]).sort(compareBoardLists);
			lists.forEach((l) => {
				if (l.tasks) l.tasks.sort(compareBoardTasks);
			});
			set({ lists, isLoading: false });
		} else {
			set({ error: res.error || "Failed to load board", isLoading: false });
		}
	},

	generateDefaultLists: async (projectId: string) => {
		set({ isLoading: true });
		const res = await generateDefaultListsAction(projectId);
		if (res.success) {
			await get().fetchBoard(projectId);
		} else {
			set({ error: "Failed to generate default lists", isLoading: false });
		}
	},

	createTask: async (data, projectId) => {
		if (get().isCreatingTask) {
			return { success: false, error: "Task creation is already in progress." };
		}
		set({ isCreatingTask: true });
		try {
			const res = await createTaskAction(data, projectId);
			if (res.success) {
				set((state) => ({ lists: upsertTaskById(state.lists, res.data) }));
				useUIStore.getState().addToast({
					type: "success",
					message: "Task created successfully.",
				});
				return { success: true };
			}
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to create task.",
			});
			return res;
		} finally {
			set({ isCreatingTask: false });
		}
	},

	updateTaskDetails: async (taskId, data, projectId) => {
		const reqId = Date.now();
		let previousTaskState: Task | null = null;

		for (const list of get().lists) {
			const t = list.tasks.find((t) => t.id === taskId);
			if (t) {
				previousTaskState = t;
				break;
			}
		}

		set((state) => {
			if (!previousTaskState)
				return {
					mutationVersions: { ...state.mutationVersions, [taskId]: reqId },
				};

			const finalTask = { ...previousTaskState, ...data };

			const newLists = state.lists.map((list) => ({
				...list,
				tasks: list.tasks.filter((t) => t.id !== taskId),
			}));

			const targetList = newLists.find((l) => l.id === finalTask.listId);
			if (targetList) {
				targetList.tasks.push(finalTask);
				targetList.tasks.sort(compareBoardTasks);
			}

			return {
				lists: newLists,
				mutationVersions: { ...state.mutationVersions, [taskId]: reqId },
			};
		});

		const res = await updateTaskAction(taskId, data, projectId);
		if (!res.success) {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to save changes.",
			});

			if (previousTaskState) {
				const prevTask = previousTaskState;
				set((state) => {
					const currentVersion = state.mutationVersions[taskId];
					if (currentVersion !== reqId) {
						return state;
					}

					const newLists = state.lists.map((list) => ({
						...list,
						tasks: list.tasks.filter((t) => t.id !== taskId),
					}));

					const targetList = newLists.find((l) => l.id === prevTask.listId);
					if (targetList) {
						targetList.tasks.push(prevTask);
						targetList.tasks.sort(compareBoardTasks);
					}

					return { lists: newLists };
				});
			}
		}
	},

	updateTaskComments: (taskId, comments) => {
		set((state) => {
			const newLists = state.lists.map((list) => {
				const hasTask = list.tasks.some((t) => t.id === taskId);
				if (!hasTask) return list;

				return {
					...list,
					tasks: list.tasks.map((t) =>
						t.id === taskId ? { ...t, comments } : t,
					),
				};
			});
			return { lists: newLists };
		});
	},

	moveTask: async (taskId, sourceListId, destListId, destIndex, projectId) => {
		const snapshot = JSON.stringify(get().lists);
		const updates: { id: string; listId: string; position: number }[] = [];
		let derivedProjectId = projectId;

		set((state) => {
			const lists = JSON.parse(JSON.stringify(state.lists)) as List[];
			const sourceList = lists.find((l) => l.id === sourceListId);
			const destList = lists.find((l) => l.id === destListId);

			if (!sourceList || !destList) return state;
			derivedProjectId = sourceList.projectId || projectId;

			const taskIndex = sourceList.tasks.findIndex((t) => t.id === taskId);
			if (taskIndex === -1) return state;

			if (sourceListId === destListId) {
				const newTasks = [...sourceList.tasks];
				const [movedTask] = newTasks.splice(taskIndex, 1);
				newTasks.splice(destIndex, 0, movedTask);

				newTasks.forEach((t, i) => {
					t.position = (i + 1) * 1024;
				});
				sourceList.tasks = newTasks;

				const originalSourceList = state.lists.find(
					(l) => l.id === sourceListId,
				);
				newTasks.forEach((t) => {
					const origTask = originalSourceList?.tasks.find(
						(ot) => ot.id === t.id,
					);
					if (!origTask || origTask.position !== t.position) {
						updates.push({ id: t.id, listId: t.listId, position: t.position });
					}
				});
			} else {
				const [movedTask] = sourceList.tasks.splice(taskIndex, 1);
				movedTask.listId = destListId;

				destList.tasks.splice(destIndex, 0, movedTask);

				sourceList.tasks.forEach((t, i) => {
					t.position = (i + 1) * 1024;
				});
				destList.tasks.forEach((t, i) => {
					t.position = (i + 1) * 1024;
				});

				const originalSourceList = state.lists.find(
					(l) => l.id === sourceListId,
				);
				const originalDestList = state.lists.find((l) => l.id === destListId);

				sourceList.tasks.forEach((t) => {
					const origTask = originalSourceList?.tasks.find(
						(ot) => ot.id === t.id,
					);
					if (!origTask || origTask.position !== t.position) {
						updates.push({ id: t.id, listId: t.listId, position: t.position });
					}
				});
				destList.tasks.forEach((t) => {
					const origTask = originalDestList?.tasks.find((ot) => ot.id === t.id);
					if (
						!origTask ||
						origTask.position !== t.position ||
						origTask.listId !== t.listId
					) {
						updates.push({ id: t.id, listId: t.listId, position: t.position });
					}
				});
			}

			return { lists, isSyncing: true };
		});

		if (updates.length > 0) {
			const res = await bulkUpdateTaskOrderAction(updates, derivedProjectId);
			if (!res.success) {
				useUIStore.getState().addToast({
					type: "error",
					message: res.error || "Failed to move task. Reverting.",
				});
				set({ lists: JSON.parse(snapshot) });
			} else {
				set((state) => ({
					lists: res.data.reduce(upsertTaskById, state.lists),
				}));
			}
		}
		set({ isSyncing: false });
	},

	deleteTask: async (taskId, projectId) => {
		set((state) => ({
			lists: state.lists.map((list) => ({
				...list,
				tasks: list.tasks.filter((t) => t.id !== taskId),
			})),
		}));
		const res = await deleteTaskAction(taskId, projectId);
		if (res.success) {
			useUIStore
				.getState()
				.addToast({ type: "success", message: "Task deleted successfully." });
		} else {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to delete task.",
			});
		}
	},

	addList: async (name, projectId) => {
		if (get().isCreatingList) {
			return { success: false, error: "List creation is already in progress." };
		}
		set({ isCreatingList: true });
		const { lists } = get();
		const maxPosition = lists.reduce((max, l) => Math.max(max, l.position), 0);
		try {
			const res = await createListAction({
				name,
				projectId,
				position: maxPosition + 1000,
			});
			if (res.success && res.data) {
				set((state) => ({
					lists: upsertListById(state.lists, res.data as Omit<List, "tasks">),
				}));
				useUIStore.getState().addToast({
					type: "success",
					message: "List created successfully.",
				});
				return { success: true };
			}
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to create list.",
			});
			return { success: false, error: res.error || "Failed to create list." };
		} finally {
			set({ isCreatingList: false });
		}
	},

	renameList: async (listId, name, projectId) => {
		set((state) => ({
			lists: state.lists.map((l) => (l.id === listId ? { ...l, name } : l)),
		}));
		const res = await updateListAction(listId, { name }, projectId);
		if (res.success) {
			useUIStore
				.getState()
				.addToast({ type: "success", message: "List renamed successfully." });
		} else {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to rename list.",
			});
		}
	},

	removeList: async (listId, projectId) => {
		set((state) => ({
			lists: state.lists.filter((l) => l.id !== listId),
		}));
		const res = await deleteListAction(listId, projectId);
		if (res.success) {
			useUIStore
				.getState()
				.addToast({ type: "success", message: "List deleted successfully." });
		} else {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to delete list.",
			});
		}
	},

	moveList: async (listId, destIndex, projectId) => {
		const snapshot = JSON.stringify(get().lists);
		const updates: { id: string; position: number }[] = [];

		set((state) => {
			const lists = JSON.parse(JSON.stringify(state.lists)) as List[];
			const sourceIndex = lists.findIndex((l) => l.id === listId);
			if (sourceIndex === -1) return state;

			const [list] = lists.splice(sourceIndex, 1);
			lists.splice(destIndex, 0, list);

			lists.forEach((l, i) => {
				l.position = (i + 1) * 1024;
			});

			lists.forEach((l) => {
				const origList = state.lists.find((ol) => ol.id === l.id);
				if (!origList || origList.position !== l.position) {
					updates.push({ id: l.id, position: l.position });
				}
			});

			return { lists, isSyncing: true };
		});

		if (updates.length > 0) {
			const res = await bulkUpdateListOrderAction(updates, projectId);
			if (!res.success) {
				useUIStore.getState().addToast({
					type: "error",
					message: res.error || "Failed to move list. Reverting.",
				});
				set({ lists: JSON.parse(snapshot) });
			}
		}
		set({ isSyncing: false });
	},
}));
