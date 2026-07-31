"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

export function CreateProjectButton() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors"
			>
				<Plus size={20} className="mr-2" />
				New Project
			</button>

			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-foreground">
								Create New Project
							</h3>
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="p-1 hover:bg-muted rounded"
							>
								<X size={20} />
							</button>
						</div>

						<form className="space-y-4">
							<div>
								<label
									htmlFor="projectName"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Project Name
								</label>
								<input
									id="projectName"
									type="text"
									className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									placeholder="Enter project name"
								/>
							</div>

							<div>
								<label
									htmlFor="description"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Description
								</label>
								<textarea
									id="description"
									rows={3}
									className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									placeholder="Project description"
								/>
							</div>

							<div>
								<label
									htmlFor="dueDate"
									className="block text-sm font-medium text-foreground mb-2"
								>
									Due Date
								</label>
								<input
									id="dueDate"
									type="date"
									className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
								/>
							</div>

							<div className="flex justify-end space-x-3 pt-4">
								<button
									type="button"
									onClick={() => setIsOpen(false)}
									className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors"
								>
									Create Project
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	);
}
