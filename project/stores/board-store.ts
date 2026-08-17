/**
 * Task 5.3 – Client-side board state management.
 *
 * Board state (lists, tasks, loading, drag-and-drop) lives in `use-tasks.ts`
 * (a Zustand store) which also handles Task 5.4 optimistic UI updates.
 *
 * Re-export everything from there so any code that imports from this file
 * continues to work.
 */

export type { List, Task, TasksState } from "@/hooks/use-tasks";
export { useTasksStore } from "@/hooks/use-tasks";
