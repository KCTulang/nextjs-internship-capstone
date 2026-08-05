"use client";

import { useState } from "react";
import { useTasksStore } from "@/hooks/use-tasks";
import { useUIStore } from "@/stores/ui-store";

export function CreateTaskModal() {
	const { createTask } = useTasksStore();
	const {
		isCreateTaskModalOpen,
		closeCreateTaskModal,
		selectedListIdForNewTask,
		activeProjectId,
	} = useUIStore();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState("medium");
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!isCreateTaskModalOpen || !selectedListIdForNewTask || !activeProjectId)
		return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		setIsSubmitting(true);

		await createTask(
			{
				title: title.trim(),
				description: description.trim() || undefined,
				priority,
				listId: selectedListIdForNewTask,
				position: 1000, // In a real app, query max position of current tasks and add 1000.
			},
			activeProjectId,
		);

		setIsSubmitting(false);
		setTitle("");
		setDescription("");
		setPriority("medium");
		closeCreateTaskModal();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
				<h3 className="text-xl font-semibold text-foreground mb-4">
					Create New Task
				</h3>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="task-title"
							className="block text-sm font-medium text-foreground mb-1"
						>
							Task Title *
						</label>
						<input
							id="task-title"
							type="text"
							required
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Design user dashboard"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>

					<div>
						<label
							htmlFor="task-description"
							className="block text-sm font-medium text-foreground mb-1"
						>
							Description (Optional)
						</label>
						<textarea
							id="task-description"
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Add more details about this task..."
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>

					<div>
						<label
							htmlFor="task-priority"
							className="block text-sm font-medium text-foreground mb-1"
						>
							Priority
						</label>
						<select
							id="task-priority"
							value={priority}
							onChange={(e) => setPriority(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
						</select>
					</div>

					<div className="flex justify-end gap-3 mt-6">
						<button
							type="button"
							onClick={closeCreateTaskModal}
							className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || !title.trim()}
							className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
						>
							{isSubmitting ? "Creating..." : "Create Task"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
