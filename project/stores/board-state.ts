import type { TaskDTO } from "@/types/task";

export interface BoardList {
	id: string;
	name: string;
	projectId: string;
	position: number;
	isCompleted: boolean;
	createdAt: Date | string | null;
	updatedAt: Date | string | null;
	tasks: TaskDTO[];
}

export type IncomingBoardList = Omit<BoardList, "tasks"> & {
	tasks?: TaskDTO[];
};

export function compareBoardLists(a: BoardList, b: BoardList): number {
	return a.position - b.position || a.id.localeCompare(b.id);
}

export function compareBoardTasks(a: TaskDTO, b: TaskDTO): number {
	return (
		a.position - b.position ||
		a.createdAt.localeCompare(b.createdAt) ||
		a.id.localeCompare(b.id)
	);
}

export function upsertListById(
	lists: BoardList[],
	incoming: IncomingBoardList,
): BoardList[] {
	const firstIndex = lists.findIndex((list) => list.id === incoming.id);

	if (firstIndex === -1) {
		return [...lists, { ...incoming, tasks: incoming.tasks ?? [] }].sort(
			compareBoardLists,
		);
	}

	const existing = lists[firstIndex];
	const merged: BoardList = {
		...existing,
		...incoming,
		tasks: existing.tasks,
	};
	const next = lists.slice();
	next[firstIndex] = merged;

	return next
		.filter((list, index) => list.id !== incoming.id || index === firstIndex)
		.sort(compareBoardLists);
}

export function upsertTaskById(
	lists: BoardList[],
	incoming: TaskDTO,
): BoardList[] {
	let existingTask: TaskDTO | undefined;
	let existingListId: string | undefined;

	for (const list of lists) {
		const task = list.tasks.find((candidate) => candidate.id === incoming.id);
		if (task) {
			existingTask = task;
			existingListId = list.id;
			break;
		}
	}

	const mergedTask: TaskDTO = existingTask
		? { ...existingTask, ...incoming }
		: incoming;

	if (existingTask && existingListId === mergedTask.listId) {
		return lists.map((list) => {
			if (list.id !== existingListId) {
				if (!list.tasks.some((task) => task.id === mergedTask.id)) return list;
				return {
					...list,
					tasks: list.tasks.filter((task) => task.id !== mergedTask.id),
				};
			}
			let replaced = false;
			const tasks = list.tasks
				.map((task) => {
					if (task.id !== mergedTask.id) return task;
					if (replaced) return null;
					replaced = true;
					return mergedTask;
				})
				.filter((task): task is TaskDTO => task !== null)
				.sort(compareBoardTasks);
			return { ...list, tasks };
		});
	}

	const next = lists.map((list) => ({
		...list,
		tasks: list.tasks.filter((task) => task.id !== incoming.id),
	}));
	const targetList = next.find((list) => list.id === mergedTask.listId);

	if (!targetList) return lists;

	targetList.tasks.push(mergedTask);
	targetList.tasks.sort(compareBoardTasks);
	return next;
}

export function applyCompletedListDesignation(
	lists: BoardList[],
	completedListId: string,
): { status: "applied" | "unknown"; lists: BoardList[] } {
	if (!lists.some((list) => list.id === completedListId)) {
		return { status: "unknown", lists };
	}

	return {
		status: "applied",
		lists: lists.map((list) => ({
			...list,
			isCompleted: list.id === completedListId,
		})),
	};
}
