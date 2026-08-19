"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/hooks/use-projects";
import { useUIStore } from "@/stores/ui-store";
import { updateProjectSchema } from "@/utils/validations";

export function EditProjectModal() {
	const { updateProject } = useProjectStore();
	const {
		isEditProjectModalOpen,
		closeEditProjectModal,
		selectedProjectForEdit,
	} = useUIStore();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (selectedProjectForEdit) {
			setName(selectedProjectForEdit.name);
			setDescription(selectedProjectForEdit.description || "");
			setDueDate(
				selectedProjectForEdit.dueDate
					? new Date(selectedProjectForEdit.dueDate).toISOString().split("T")[0]
					: "",
			);
		}
	}, [selectedProjectForEdit]);

	const nameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditProjectModalOpen) {
			const timer = setTimeout(() => nameInputRef.current?.focus(), 50);
			return () => clearTimeout(timer);
		}
	}, [isEditProjectModalOpen]);

	if (!isEditProjectModalOpen || !selectedProjectForEdit) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		const parsed = updateProjectSchema.safeParse({
			name,
			description,
			dueDate: dueDate ? new Date(dueDate) : undefined,
		});
		if (!parsed.success) {
			const first = parsed.error.issues[0];
			useUIStore.getState().addToast({
				type: "error",
				message: first?.message ?? "Invalid input",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			await updateProject(selectedProjectForEdit.id, {
				name: parsed.data.name,
				description: parsed.data.description,
				dueDate: parsed.data.dueDate,
			});
			closeEditProjectModal();
		} catch {
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) closeEditProjectModal();
	};

	const hasChanges =
		name.trim() !== selectedProjectForEdit.name ||
		(description.trim() || "") !== (selectedProjectForEdit.description || "") ||
		dueDate !==
			(selectedProjectForEdit.dueDate
				? new Date(selectedProjectForEdit.dueDate).toISOString().split("T")[0]
				: "");

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="edit-project-title"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			onClick={handleBackdropClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					handleBackdropClick(e as unknown as React.MouseEvent);
				}
			}}
		>
			<div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h3
							id="edit-project-title"
							className="text-xl font-semibold text-foreground"
						>
							Edit Project
						</h3>
						<p className="text-sm text-muted-foreground mt-0.5">
							Update your project details
						</p>
					</div>
					<button
						type="button"
						onClick={closeEditProjectModal}
						className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
						aria-label="Close modal"
					>
						<X size={18} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label
							htmlFor="edit-project-name"
							className="block text-sm font-medium text-foreground mb-1.5"
						>
							Project Name <span className="text-destructive">*</span>
						</label>
						<input
							id="edit-project-name"
							ref={nameInputRef}
							type="text"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={80}
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition placeholder:text-muted-foreground"
							placeholder="e.g., Marketing Campaign"
						/>
						<div className="flex justify-end mt-1">
							<span className="text-xs text-muted-foreground">
								{name.length}/80
							</span>
						</div>
					</div>

					<div>
						<label
							htmlFor="edit-project-description"
							className="block text-sm font-medium text-foreground mb-1.5"
						>
							Description{" "}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</label>
						<textarea
							id="edit-project-description"
							rows={3}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							maxLength={500}
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition placeholder:text-muted-foreground resize-none"
							placeholder="What is this project about?"
						/>
						<div className="flex justify-end mt-1">
							<span className="text-xs text-muted-foreground">
								{description.length}/500
							</span>
						</div>
					</div>

					<div>
						<label
							htmlFor="edit-project-due-date"
							className="block text-sm font-medium text-foreground mb-1.5"
						>
							Target Date{" "}
							<span className="text-muted-foreground font-normal">
								(optional)
							</span>
						</label>
						<input
							id="edit-project-due-date"
							type="date"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition placeholder:text-muted-foreground dark:[scheme:dark]"
						/>
					</div>

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={closeEditProjectModal}
							className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || !name.trim() || !hasChanges}
							className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-30"
						>
							{isSubmitting ? (
								<span className="flex items-center gap-2 justify-center">
									<svg
										className="animate-spin h-3.5 w-3.5"
										viewBox="0 0 24 24"
										fill="none"
										aria-hidden="true"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
										/>
									</svg>
									Saving...
								</span>
							) : (
								"Save Changes"
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
