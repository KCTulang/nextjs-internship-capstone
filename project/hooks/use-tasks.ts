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
	createdAt: Date | null;
	updatedAt: Date | null;
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

export interface TasksState {
	lists: List[];
	isLoading: boolean;
	error: string | null;

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
}

export const useTasksStore = create<TasksState>((set, get) => ({
	lists: [],
	isLoading: false,
	error: null,

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

			const [task] = sourceList.tasks.splice(taskIndex, 1);
			task.listId = destListId;

			const prevTask = destList.tasks[destIndex - 1];
			const nextTask = destList.tasks[destIndex];

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

			destList.tasks.splice(destIndex, 0, task);

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

			const [list] = lists.splice(sourceIndex, 1);

			const prevList = lists[destIndex - 1];
			const nextList = lists[destIndex];

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

			lists.splice(destIndex, 0, list);
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
