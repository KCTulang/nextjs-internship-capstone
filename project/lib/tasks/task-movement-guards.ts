import { z } from "zod";
import { validateProjectId } from "@/lib/db/project-column-guards";

const uuidSchema = z.string().uuid();

export const taskOrderUpdateSchema = z.object({
	id: uuidSchema,
	listId: uuidSchema,
	position: z.number().int().nonnegative(),
});

export type TaskOrderUpdate = z.infer<typeof taskOrderUpdateSchema>;

export function parseUniqueTaskIds(ids: readonly string[]) {
	const parsed = z.array(uuidSchema).min(1).safeParse(ids);
	if (!parsed.success) return null;
	const uniqueIds = [...new Set(parsed.data)];
	return uniqueIds.length === ids.length ? uniqueIds : null;
}

export function parseTaskOrderRequest(
	projectId: string,
	updates: readonly TaskOrderUpdate[],
):
	| { success: true; projectId: string; updates: TaskOrderUpdate[] }
	| { success: false; error: string } {
	let parsedProjectId: string;
	try {
		parsedProjectId = validateProjectId(projectId);
	} catch {
		return { success: false, error: "Invalid project ID." };
	}

	const parsedUpdates = z
		.array(taskOrderUpdateSchema)
		.min(1)
		.safeParse(updates);
	if (!parsedUpdates.success) {
		return { success: false, error: "Invalid task movement." };
	}
	if (
		new Set(parsedUpdates.data.map((update) => update.id)).size !==
		parsedUpdates.data.length
	) {
		return { success: false, error: "Duplicate task movement." };
	}

	return {
		success: true,
		projectId: parsedProjectId,
		updates: parsedUpdates.data,
	};
}
