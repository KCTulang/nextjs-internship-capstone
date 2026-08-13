import { create } from "zustand";
import {
	createListAction,
	deleteListAction,
	generateDefaultListsAction,
	getListsAction,
	updateListAction,
} from "@/app/actions/lists";
import {
	createTaskAction,
	deleteTaskAction,
	updateTaskAction,
} from "@/app/actions/tasks";
import { useUIStore } from "@/stores/ui-store";

export interface Task {
	id: string;
	title: string;
	description: string | null;
	listId: string;
	assigneeId: string | null;
	priority: string;
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
	error: string | null;

	setMembers: (members: Member[]) => void;
	fetchBoard: (projectId: string) => Promise<void>;
	generateDefaultLists: (projectId: string) => Promise<void>;

	createTask: (
		data: Partial<Task> & { title: string; listId: string; position: number },
		projectId: string,
	) => Promise<void>;
	updateTaskDetails: (
		taskId: string,
		data: Partial<Task>,
		projectId: string,
	) => Promise<void>;
	updateTaskComments: (taskId: string, comments: { id: string }[]) => void;
	moveTask: (
		taskId: string,
		sourceListId: string,
		destListId: string,
		newPosition: number,
		projectId: string,
	) => Promise<void>;
	deleteTask: (taskId: string, projectId: string) => Promise<void>;

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

	optimisticMoveTask: (
		taskId: string,
		sourceListId: string,
		destListId: string,
		destIndex: number,
	) => number;
	optimisticMoveList: (listId: string, destIndex: number) => number;
	selectedTaskIds: string[];
	toggleTaskSelection: (taskId: string, force?: boolean) => void;
	clearSelection: () => void;
	deleteSelectedTasks: (projectId: string) => Promise<void>;
	moveSelectedTasks: (destListId: string, projectId: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
	lists: [],
	members: [],
	isLoading: false,
	error: null,
	selectedTaskIds: [],

	setMembers: (members) => set({ members }),

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

	optimisticMoveTask: (taskId, sourceListId, destListId, destIndex) => {
		let newPosition = 0;
		set((state) => {
			const lists = [...state.lists];
			const sourceListIndex = lists.findIndex((l) => l.id === sourceListId);
			const destListIndex = lists.findIndex((l) => l.id === destListId);

			if (sourceListIndex === -1 || destListIndex === -1) return state;

			const sourceList = {
				...lists[sourceListIndex],
				tasks: [...(lists[sourceListIndex].tasks || [])],
			};
			const destList =
				sourceListId === destListId
					? sourceList
					: {
							...lists[destListIndex],
							tasks: [...(lists[destListIndex].tasks || [])],
						};

			const taskIndex = sourceList.tasks.findIndex((t) => t.id === taskId);
			if (taskIndex === -1) return state;

			let actualDestIndex = destIndex;
			if (sourceListId === destListId && taskIndex < destIndex) {
				actualDestIndex--;
			}

			const task = { ...sourceList.tasks.splice(taskIndex, 1)[0] };
			task.listId = destListId;

			const prevTask = destList.tasks[actualDestIndex - 1];
			const nextTask = destList.tasks[actualDestIndex];

			if (!prevTask && !nextTask) {
				newPosition = 65536;
			} else if (!prevTask) {
				newPosition = nextTask.position / 2;
			} else if (!nextTask) {
				newPosition = prevTask.position + 65536;
			} else {
				newPosition =
					prevTask.position + (nextTask.position - prevTask.position) / 2;
			}
			newPosition = Math.round(newPosition);
			task.position = newPosition;

			destList.tasks.splice(actualDestIndex, 0, task);

			lists[sourceListIndex] = sourceList;
			lists[destListIndex] = destList;

			return { lists };
		});
		return newPosition;
	},

	moveTask: async (taskId, sourceListId, destListId, destIndex, projectId) => {
		const newPos = get().optimisticMoveTask(
			taskId,
			sourceListId,
			destListId,
			destIndex,
		);
		const res = await updateTaskAction(
			taskId,
			{ listId: destListId, position: newPos },
			projectId,
		);
		if (!res.success) {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to move task.",
			});
		}
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

	optimisticMoveList: (listId, destIndex) => {
		let newPosition = 0;
		set((state) => {
			const lists = [...state.lists];
			const sourceIndex = lists.findIndex((l) => l.id === listId);
			if (sourceIndex === -1) return state;

			let actualDestIndex = destIndex;
			if (sourceIndex < destIndex) {
				actualDestIndex--;
			}

			const [list] = lists.splice(sourceIndex, 1);

			const prevList = lists[actualDestIndex - 1];
			const nextList = lists[actualDestIndex];

			if (!prevList && !nextList) {
				newPosition = 65536;
			} else if (!prevList) {
				newPosition = nextList.position / 2;
			} else if (!nextList) {
				newPosition = prevList.position + 65536;
			} else {
				newPosition =
					prevList.position + (nextList.position - prevList.position) / 2;
			}
			newPosition = Math.round(newPosition);
			list.position = newPosition;

			lists.splice(actualDestIndex, 0, list);
			return { lists };
		});
		return newPosition;
	},

	moveList: async (listId, destIndex, projectId) => {
		const newPos = get().optimisticMoveList(listId, destIndex);
		const res = await updateListAction(listId, { position: newPos }, projectId);
		if (!res.success) {
			useUIStore.getState().addToast({
				type: "error",
				message: res.error || "Failed to move list.",
			});
		}
	},
}));
