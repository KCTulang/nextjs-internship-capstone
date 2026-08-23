export interface CompletionListLike {
	id: string;
	projectId: string;
	isCompleted: boolean;
}

export interface CompletionListWithTasks {
	isCompleted: boolean;
	tasks?: readonly unknown[];
}

export interface CompletionTaskLike {
	id: string;
	listId: string | null;
}

export type CompletionMetadataErrorCode =
	| "MISSING_COMPLETED_LIST"
	| "MULTIPLE_COMPLETED_LISTS";

export interface CompletionMetadataError {
	success: false;
	code: CompletionMetadataErrorCode;
	error: string;
	guidance: string;
}

function completionMetadataError(count: number): CompletionMetadataError {
	if (count === 0) {
		return {
			success: false,
			code: "MISSING_COMPLETED_LIST",
			error: "This project has no designated completed column.",
			guidance: "Ask a project owner or admin to set a column as completed.",
		};
	}

	return {
		success: false,
		code: "MULTIPLE_COMPLETED_LISTS",
		error: "This project has multiple designated completed columns.",
		guidance: "Ask a project owner or admin to repair the completed column.",
	};
}

export function getCompletedList<T extends CompletionListLike>(
	lists: readonly T[],
): T | null {
	return lists.find((list) => list.isCompleted) ?? null;
}

export function getProjectCompletionStats(
	lists: readonly CompletionListWithTasks[],
):
	| {
			success: true;
			totalTasks: number;
			completedTasks: number;
			progress: number;
	  }
	| CompletionMetadataError {
	const completedLists = lists.filter((list) => list.isCompleted);
	if (completedLists.length !== 1) {
		return completionMetadataError(completedLists.length);
	}

	let totalTasks = 0;
	let completedTasks = 0;

	for (const list of lists) {
		const taskCount = list.tasks?.length ?? 0;
		totalTasks += taskCount;
		if (list.isCompleted) completedTasks += taskCount;
	}

	return {
		success: true as const,
		totalTasks,
		completedTasks,
		progress:
			totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
	};
}

export function hasExactlyOneCompletedList(
	lists: readonly Pick<CompletionListLike, "isCompleted">[],
) {
	return lists.filter((list) => list.isCompleted).length === 1;
}

export function getTasksNeedingCompletionMove<T extends CompletionTaskLike>(
	tasks: readonly T[],
	completedListId: string,
) {
	return tasks.filter((task) => task.listId !== completedListId);
}

export function resolveCompletionDestinations<T extends CompletionListLike>(
	projectIds: readonly string[],
	lists: readonly T[],
): { success: true; destinations: Map<string, T> } | CompletionMetadataError {
	const destinations = new Map<string, T>();

	for (const projectId of new Set(projectIds)) {
		const matches = lists.filter(
			(list) => list.projectId === projectId && list.isCompleted,
		);
		if (matches.length === 0) {
			return completionMetadataError(0);
		}
		if (matches.length > 1) {
			return completionMetadataError(matches.length);
		}
		destinations.set(projectId, matches[0]);
	}

	return { success: true, destinations };
}
