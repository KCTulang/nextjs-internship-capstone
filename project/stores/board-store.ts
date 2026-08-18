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

export interface Task {
	id: string;
	title: string;
	description: string | null;
	listId: string;
	assigneeId: string | null;
	priority: "low" | "medium" | "high";
	dueDate: Date | null;
	position: number;
	labels: string[] | null;
	createdAt: Date | null;
	updatedAt: Date | null;
	assignee?: {
		id: string;
		name: string;
		email: string;
	} | null;
	comments?: { id: string }[];
}

export interface List {
	id: string;
	name: string;
	projectId: string;
	position: number;
	createdAt: Date | null;
	updatedAt: Date | null;
	tasks: Task[];
}

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
	error: string | null;

	setMembers: (members: Member[]) => void;
	fetchBoard: (projectId: string) => Promise<void>;
	generateDefaultLists: (projectId: string) => Promise<void>;
	applyRealtimeEvent: (event: CollaborationEvent) => void;

	createTask: (
		data: Partial<Task> & {
			title: string;
			listId: string;
			position: number;
		},
		projectId?: string | null,
	) => Promise<void>;
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

	addList: (name: string, projectId: string) => Promise<void>;
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
	error: null,
	selectedTaskIds: [],
	setSelectedTaskIds: (ids) => set({ selectedTaskIds: ids }),

	setMembers: (members) => set({ members }),

	applyRealtimeEvent: (event) => {
		const _state = get();

		if (event.type === "task.created" && event.payload?.task) {
			const task = event.payload.task as Task;
			set((state) => ({
				lists: state.lists.map((list) =>
					list.id === task.listId && !list.tasks.some((t) => t.id === task.id)
						? {
								...list,
								tasks: [...list.tasks, task].sort(
									(a, b) => a.position - b.position,
								),
							}
						: list,
				),
			}));
		} else if (event.type === "task.updated" && event.payload?.task) {
			const task = event.payload.task as Task;
			set((state) => ({
				lists: state.lists.map((list) => ({
					...list,
					tasks: list.tasks.map((t) =>
						t.id === task.id ? { ...t, ...task } : t,
					),
				})),
			}));
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
					targetList.tasks.sort((a, b) => a.position - b.position);
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
					targetList.tasks.sort((a, b) => a.position - b.position);
				}
				return { lists: newLists };
			});
		} else if (event.type === "list.created" && event.payload?.list) {
			const list = event.payload.list as List;
			set((state) => {
				if (state.lists.some((l) => l.id === list.id)) return state;
				return {
					lists: [...state.lists, { ...list, tasks: [] }].sort(
						(a, b) => a.position - b.position,
					),
				};
			});
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
					.sort((a, b) => a.position - b.position),
			}));
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
			const lists = (res.data as unknown as List[]).sort(
				(a, b) => a.position - b.position,
			);
			lists.forEach((l) => {
				if (l.tasks) l.tasks.sort((a, b) => a.position - b.position);
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
		const res = await createTaskAction(data, projectId);
		if (res.success && res.data) {
			set((state) => {
				const newLists = state.lists.map((list) => {
					if (list.id === data.listId) {
						return {
							...list,
							tasks: [...list.tasks, res.data as unknown as Task],
						};
					}
					return list;
				});
				return { lists: newLists };
			});
			useUIStore
				.getState()
				.addToast({ type: "success", message: "Task created successfully." });
		} else {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to create task.",
			});
		}
	},

	updateTaskDetails: async (taskId, data, projectId) => {
		set((state) => {
			const newLists = state.lists.map((list) => {
				const hasTask = list.tasks.some((t) => t.id === taskId);
				if (!hasTask) return list;

				return {
					...list,
					tasks: list.tasks.map((t) =>
						t.id === taskId ? { ...t, ...data } : t,
					),
				};
			});
			return { lists: newLists };
		});
		const res = await updateTaskAction(taskId, data, projectId);
		if (!res.success) {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to save changes.",
			});
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
		const { lists } = get();
		const maxPosition = lists.reduce((max, l) => Math.max(max, l.position), 0);
		const res = await createListAction({
			name,
			projectId,
			position: maxPosition + 1000,
		});
		if (res.success && res.data) {
			set((state) => ({
				lists: [
					...state.lists,
					{ ...(res.data as unknown as List), tasks: [] },
				],
			}));
			useUIStore
				.getState()
				.addToast({ type: "success", message: "List created successfully." });
		} else {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to create list.",
			});
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
