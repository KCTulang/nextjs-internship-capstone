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
	const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
	const [selectedListId, setSelectedListId] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showMoreOptions, setShowMoreOptions] = useState(false);

	useEffect(() => {
		if (isCreateTaskModalOpen) {
			if (initialDueDate) {
				setDueDate(format(initialDueDate, "yyyy-MM-dd'T'HH:mm"));
			} else {
				setDueDate("");
			}
			setSelectedProjectId(activeProjectId || "");
			setSelectedListId(selectedListIdForNewTask || "");
			setShowMoreOptions(false);
		}
	}, [
		isCreateTaskModalOpen,
		initialDueDate,
		activeProjectId,
		selectedListIdForNewTask,
	]);

	// When the user changes the project in the dropdown, reset the list ID
	useEffect(() => {
		if (!isCreateTaskModalOpen) return;
		if (!selectedProjectId) {
			setSelectedListId("");
			return;
		}

		const project = projects.find((p) => p.id === selectedProjectId);
		if (project && project.lists && project.lists.length > 0) {
			// Check if currently selected list belongs to the new project
			const listExists = project.lists.some((l) => l.id === selectedListId);
			if (!listExists) {
				// If not, default to the first list
				setSelectedListId(project.lists[0].id);
			}
		} else {
			setSelectedListId("");
		}
	}, [selectedProjectId, projects, isCreateTaskModalOpen, selectedListId]);

	if (!isCreateTaskModalOpen) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (
			!title.trim() ||
			!selectedProjectId ||
			selectedProjectId === "none" ||
			!selectedListId
		)
			return;

		setIsSubmitting(true);

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
				listId: selectedListId,
				position: 1000,
			},
			selectedProjectId === "none" ? "" : selectedProjectId,
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

	const currentProject = projects.find((p) => p.id === selectedProjectId);
	const availableLists = currentProject?.lists || [];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
			<div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
				<div className="p-6 pb-4 border-b border-border/50 shrink-0">
					<h3 className="text-xl font-semibold text-foreground">
						{activeProjectId ? "Create New Task" : "Quick Create Task"}
					</h3>
				</div>

				<form
					onSubmit={handleSubmit}
					className="flex flex-col flex-1 overflow-hidden"
				>
					<div className="p-6 space-y-4 overflow-y-auto min-h-0">
						<div>
							<input
								id="task-title"
								type="text"
								required
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Task title..."
								className="w-full bg-background border border-border rounded-lg px-4 py-3 text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
							/>
						</div>

						{!activeProjectId && (
							<div className="space-y-4 pt-2">
								<div>
									<label
										htmlFor="task-project"
										className="block text-sm font-medium text-foreground mb-1.5"
									>
										Project
									</label>
									<select
										id="task-project"
										value={selectedProjectId}
										onChange={(e) => setSelectedProjectId(e.target.value)}
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
									>
										<option value="none" disabled>
											Select a project...
										</option>
										{projects.map((p) => (
											<option key={p.id} value={p.id}>
												{p.name}
											</option>
										))}
									</select>
								</div>
							</div>
						)}

						{selectedProjectId && selectedProjectId !== "none" && (
							<div>
								<label
									htmlFor="task-list"
									className="block text-sm font-medium text-foreground mb-1.5"
								>
									Status / List
								</label>
								<select
									id="task-list"
									value={selectedListId}
									onChange={(e) => setSelectedListId(e.target.value)}
									required
									className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
								>
									<option value="" disabled>
										Select a list...
									</option>
									{availableLists.map((l) => (
										<option key={l.id} value={l.id}>
											{l.name}
										</option>
									))}
								</select>
							</div>
						)}

						{!showMoreOptions && (
							<div className="pt-2">
								<button
									type="button"
									onClick={() => setShowMoreOptions(true)}
									className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
								>
									+ More options
								</button>
							</div>
						)}

						{showMoreOptions && (
							<div className="space-y-4 pt-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<label
											htmlFor="task-due-date"
											className="block text-sm font-medium text-foreground mb-1.5"
										>
											Due Date
										</label>
										<input
											id="task-due-date"
											type="datetime-local"
											value={dueDate}
											onChange={(e) => setDueDate(e.target.value)}
											className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
										/>
									</div>

									<div>
										<label
											htmlFor="task-priority"
											className="block text-sm font-medium text-foreground mb-1.5"
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
								</div>

								<div>
									<label
										htmlFor="task-assignee"
										className="block text-sm font-medium text-foreground mb-1.5"
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

								<div>
									<label
										htmlFor="task-labels"
										className="block text-sm font-medium text-foreground mb-1.5"
									>
										Labels (comma-separated)
									</label>
									<input
										id="task-labels"
										type="text"
										value={labels}
										onChange={(e) => setLabels(e.target.value)}
										placeholder="e.g. bug, frontend"
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
									/>
								</div>

								<div>
									<label
										htmlFor="task-description"
										className="block text-sm font-medium text-foreground mb-1.5"
									>
										Description
									</label>
									<textarea
										id="task-description"
										rows={3}
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder="Add more details about this task..."
										className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
									/>
								</div>
							</div>
						)}
					</div>

					<div className="flex justify-end gap-3 p-6 border-t border-border/50 bg-muted/10 shrink-0">
						<button
							type="button"
							onClick={closeCreateTaskModal}
							className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={
								isSubmitting ||
								!title.trim() ||
								!selectedProjectId ||
								selectedProjectId === "none" ||
								!selectedListId
							}
							className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
						>
							{isSubmitting ? "Creating..." : "Create"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
