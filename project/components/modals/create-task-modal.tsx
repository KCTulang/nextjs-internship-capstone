"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useProjectStore } from "@/hooks/use-projects";
import { useTasksStore } from "@/hooks/use-tasks";
import { useUIStore } from "@/stores/ui-store";

export function CreateTaskModal() {
	const { createTask, members } = useTasksStore();
	const {
		isCreateTaskModalOpen,
		closeCreateTaskModal,
		selectedListIdForNewTask,
		activeProjectId,
		initialDueDate,
	} = useUIStore();
	const { projects } = useProjectStore();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
	const [assigneeId, setAssigneeId] = useState("unassigned");
	const [dueDate, setDueDate] = useState("");
	const [labels, setLabels] = useState("");
	const [selectedProjectId, setSelectedProjectId] = useState<string | "">("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (isCreateTaskModalOpen) {
			if (initialDueDate) {
				setDueDate(format(initialDueDate, "yyyy-MM-dd'T'HH:mm"));
			} else {
				setDueDate("");
			}
			setSelectedProjectId(activeProjectId || "");
		}
	}, [isCreateTaskModalOpen, initialDueDate, activeProjectId]);

	if (!isCreateTaskModalOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		setIsSubmitting(true);

		let targetListId = selectedListIdForNewTask;
		let targetProjectId = activeProjectId;

		if (!activeProjectId && selectedProjectId) {
			targetProjectId = selectedProjectId;
			const p = projects.find((proj) => proj.id === selectedProjectId);
			if (p?.lists && p.lists.length > 0) {
				targetListId = p.lists[0].id;
			}
		}

		await createTask(
			{
				title: title.trim(),
				description: description.trim() || undefined,
				priority,
				assigneeId: assigneeId === "unassigned" ? null : assigneeId,
				dueDate: dueDate ? new Date(dueDate) : null,
				labels: labels
					? labels
							.split(",")
							.map((l) => l.trim())
							.filter(Boolean)
					: null,
				listId: targetListId || undefined,
				position: 1000,
			},
			targetProjectId || "",
		);

		setIsSubmitting(false);
		setTitle("");
		setDescription("");
		setPriority("medium");
		setAssigneeId("unassigned");
		setDueDate("");
		setLabels("");
		closeCreateTaskModal();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
			<div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
				<h3 className="text-xl font-semibold text-foreground mb-4">
					Create New Task
				</h3>

				<form onSubmit={handleSubmit} className="space-y-4">
					{!activeProjectId && (
						<div>
							<label
								htmlFor="task-project"
								className="block text-sm font-medium text-foreground mb-1"
							>
								Project (Optional)
							</label>
							<select
								id="task-project"
								value={selectedProjectId}
								onChange={(e) => setSelectedProjectId(e.target.value)}
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value="">No Project (Standalone Task)</option>
								{projects.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
							</select>
						</div>
					)}
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

					<div className="grid grid-cols-2 gap-4">
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
								onChange={(e) =>
									setPriority(e.target.value as "low" | "medium" | "high")
								}
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="urgent">Urgent</option>
							</select>
						</div>

						<div>
							<label
								htmlFor="task-assignee"
								className="block text-sm font-medium text-foreground mb-1"
							>
								Assignee
							</label>
							<select
								id="task-assignee"
								value={assigneeId}
								onChange={(e) => setAssigneeId(e.target.value)}
								className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
							>
								<option value="unassigned">Unassigned</option>
								{members?.map((member) => (
									<option key={member.id} value={member.id}>
										{member.name || member.email}
									</option>
								))}
							</select>
						</div>
					</div>

					<div>
						<label
							htmlFor="task-due-date"
							className="block text-sm font-medium text-foreground mb-1"
						>
							Due Date (Optional)
						</label>
						<input
							id="task-due-date"
							type="date"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
					</div>

					<div>
						<label
							htmlFor="task-labels"
							className="block text-sm font-medium text-foreground mb-1"
						>
							Labels (Optional, comma-separated)
						</label>
						<input
							id="task-labels"
							type="text"
							value={labels}
							onChange={(e) => setLabels(e.target.value)}
							placeholder="e.g. bug, high priority, frontend"
							className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
						/>
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
