"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getTaskCreationOptionsAction } from "@/app/actions/tasks";
import { useTasksStore } from "@/stores/board-store";
import { useUIStore } from "@/stores/ui-store";
import {
	createTaskSchema,
	TASK_PRIORITIES,
	type TaskPriority,
} from "@/utils/validations";
import { Modal } from "../ui/modal";

interface CreationMember {
	id: string;
	name: string;
	email: string;
}

interface CreationProject {
	id: string;
	name: string;
	lists: { id: string; name: string; isCompleted: boolean }[];
	members: CreationMember[];
}

type FieldName =
	| "projectId"
	| "listId"
	| "title"
	| "description"
	| "assigneeId"
	| "priority"
	| "dueDate"
	| "labels";

interface FormValues {
	projectId: string;
	listId: string;
	title: string;
	description: string;
	assigneeId: string;
	priority: TaskPriority;
	dueDate: string;
	labels: string;
}

const FIELD_ORDER: FieldName[] = [
	"projectId",
	"listId",
	"title",
	"description",
	"assigneeId",
	"priority",
	"dueDate",
	"labels",
];

const controlClassName =
	"h-11 w-full rounded-lg border border-input bg-background px-3 text-sm leading-none text-foreground shadow-sm transition-colors hover:border-foreground/30 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20";
const selectClassName = `${controlClassName} appearance-none pr-10`;
const textareaClassName =
	"min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-foreground/30 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20";

function RequiredIndicator() {
	return (
		<>
			<span aria-hidden="true" className="ml-1 text-destructive">
				*
			</span>
			<span className="sr-only"> (required)</span>
		</>
	);
}

function OptionalIndicator() {
	return (
		<span className="ml-1 text-xs font-normal text-muted-foreground">
			(optional)
		</span>
	);
}

function FieldError({ id, message }: { id: string; message?: string }) {
	if (!message) return null;
	return (
		<p id={id} className="mt-1.5 text-xs text-destructive">
			{message}
		</p>
	);
}

function SelectChevron() {
	return (
		<ChevronDown
			aria-hidden="true"
			className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
		/>
	);
}

export function CreateTaskModal() {
	const { createTask, lists, members, isCreatingTask } = useTasksStore();
	const {
		isCreateTaskModalOpen,
		closeCreateTaskModal,
		selectedListIdForNewTask,
		activeProjectId,
		activeProjectName,
		initialDueDate,
		taskCreationSource,
	} = useUIStore();
	const projectRef = useRef<HTMLSelectElement>(null);
	const listRef = useRef<HTMLSelectElement>(null);
	const titleRef = useRef<HTMLInputElement>(null);
	const descriptionRef = useRef<HTMLTextAreaElement>(null);
	const assigneeRef = useRef<HTMLSelectElement>(null);
	const priorityRef = useRef<HTMLSelectElement>(null);
	const dueDateRef = useRef<HTMLInputElement>(null);
	const labelsRef = useRef<HTMLInputElement>(null);
	const submissionRef = useRef(false);

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<TaskPriority>("medium");
	const [assigneeId, setAssigneeId] = useState("unassigned");
	const [dueDate, setDueDate] = useState("");
	const [labels, setLabels] = useState("");
	const [selectedProjectId, setSelectedProjectId] = useState("");
	const [selectedListId, setSelectedListId] = useState("");
	const [projects, setProjects] = useState<CreationProject[]>([]);
	const [isLoadingContext, setIsLoadingContext] = useState(false);
	const [contextError, setContextError] = useState<string | null>(null);
	const [touchedFields, setTouchedFields] = useState<
		Partial<Record<FieldName, boolean>>
	>({});
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [submitError, setSubmitError] = useState<string | null>(null);

	const isGlobal = taskCreationSource === "global";
	const isColumn = taskCreationSource === "column";

	useEffect(() => {
		if (!isCreateTaskModalOpen) return;
		setTitle("");
		setDescription("");
		setPriority("medium");
		setAssigneeId("unassigned");
		setDueDate(initialDueDate || "");
		setLabels("");
		setSelectedProjectId(activeProjectId || "");
		setSelectedListId(selectedListIdForNewTask || "");
		setTouchedFields({});
		setFieldErrors({});
		setSubmitError(null);
		submissionRef.current = false;
	}, [
		activeProjectId,
		initialDueDate,
		isCreateTaskModalOpen,
		selectedListIdForNewTask,
	]);

	useEffect(() => {
		if (!isCreateTaskModalOpen || !isGlobal) return;
		let cancelled = false;
		setIsLoadingContext(true);
		setContextError(null);
		void getTaskCreationOptionsAction().then((result) => {
			if (cancelled) return;
			setIsLoadingContext(false);
			if (!result.success || !result.data) {
				setProjects([]);
				setContextError(result.error || "Could not load projects.");
				return;
			}
			setProjects(result.data as CreationProject[]);
		});
		return () => {
			cancelled = true;
		};
	}, [isCreateTaskModalOpen, isGlobal]);

	const selectedProject = projects.find(
		(project) => project.id === selectedProjectId,
	);
	const availableLists = isGlobal ? selectedProject?.lists || [] : lists;
	const availableMembers = isGlobal ? selectedProject?.members || [] : members;
	const inheritedList = lists.find((list) => list.id === selectedListId);

	useEffect(() => {
		if (!isCreateTaskModalOpen || !isGlobal) return;
		if (!selectedProjectId) {
			setSelectedListId("");
			setAssigneeId("unassigned");
			return;
		}
		if (!availableLists.some((list) => list.id === selectedListId)) {
			const nextListId = availableLists[0]?.id || "";
			setSelectedListId(nextListId);
			if (nextListId) {
				setFieldErrors((current) => {
					if (!current.listId) return current;
					const next = { ...current };
					delete next.listId;
					return next;
				});
			}
		}
		if (
			assigneeId !== "unassigned" &&
			!availableMembers.some((member) => member.id === assigneeId)
		) {
			setAssigneeId("unassigned");
		}
	}, [
		assigneeId,
		availableLists,
		availableMembers,
		isCreateTaskModalOpen,
		isGlobal,
		selectedListId,
		selectedProjectId,
	]);

	const currentValues = (overrides: Partial<FormValues> = {}): FormValues => ({
		projectId: selectedProjectId,
		listId: selectedListId,
		title,
		description,
		assigneeId,
		priority,
		dueDate,
		labels,
		...overrides,
	});

	const validationPayload = (overrides: Partial<FormValues> = {}) => {
		const values = currentValues(overrides);
		return {
			title: values.title,
			description: values.description.trim() || undefined,
			priority: values.priority,
			assigneeId: values.assigneeId === "unassigned" ? null : values.assigneeId,
			dueDate: values.dueDate || null,
			labels: values.labels
				.split(",")
				.map((label) => label.trim())
				.filter(Boolean),
			listId: values.listId,
		};
	};

	const getFieldError = (
		field: FieldName,
		overrides: Partial<FormValues> = {},
	) => {
		const values = currentValues(overrides);
		if (field === "projectId") {
			return isGlobal && !values.projectId ? "Select a project." : undefined;
		}

		const validation = createTaskSchema.safeParse(validationPayload(overrides));
		if (validation.success) return undefined;
		return validation.error.issues.find((issue) => issue.path[0] === field)
			?.message;
	};

	const updateFieldError = (
		field: FieldName,
		overrides: Partial<FormValues> = {},
	) => {
		const message = getFieldError(field, overrides);
		setFieldErrors((current) => {
			if (message) return { ...current, [field]: message };
			if (!current[field]) return current;
			const next = { ...current };
			delete next[field];
			return next;
		});
	};

	const validateOnBlur = (field: FieldName) => {
		setTouchedFields((current) => ({ ...current, [field]: true }));
		updateFieldError(field);
	};

	const validateAfterChange = (
		field: FieldName,
		overrides: Partial<FormValues>,
	) => {
		if (touchedFields[field] || fieldErrors[field]) {
			updateFieldError(field, overrides);
			setSubmitError(null);
		}
	};

	const focusFirstInvalidField = (errors: Record<string, string>) => {
		const refs: Partial<Record<FieldName, HTMLElement | null>> = {
			projectId: projectRef.current,
			listId: listRef.current,
			title: titleRef.current,
			description: descriptionRef.current,
			assigneeId: assigneeRef.current,
			priority: priorityRef.current,
			dueDate: dueDateRef.current,
			labels: labelsRef.current,
		};
		const target = FIELD_ORDER.find((field) => errors[field] && refs[field]);
		if (!target) return;
		requestAnimationFrame(() => {
			refs[target]?.focus({ preventScroll: true });
			refs[target]?.scrollIntoView({ block: "nearest" });
		});
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (submissionRef.current || isCreatingTask) return;

		const validation = createTaskSchema.safeParse(validationPayload());
		const nextFieldErrors: Record<string, string> = {};
		if (!validation.success) {
			for (const issue of validation.error.issues) {
				const field = String(issue.path[0] || "form");
				nextFieldErrors[field] ??= issue.message;
			}
		}
		if (isGlobal && !selectedProjectId) {
			nextFieldErrors.projectId = "Select a project.";
		}
		if (!selectedProjectId && !isGlobal) {
			setSubmitError(
				"The project context is unavailable. Close this dialog and try again.",
			);
			return;
		}
		if (!validation.success || Object.keys(nextFieldErrors).length > 0) {
			setTouchedFields(
				Object.fromEntries(FIELD_ORDER.map((field) => [field, true])),
			);
			setFieldErrors(nextFieldErrors);
			setSubmitError("Please correct the highlighted fields.");
			focusFirstInvalidField(nextFieldErrors);
			return;
		}

		submissionRef.current = true;
		setFieldErrors({});
		setSubmitError(null);
		try {
			const result = await createTask(validation.data, selectedProjectId);
			if (!result.success) {
				const serverErrors = result.fieldErrors || {};
				setFieldErrors(serverErrors);
				setTouchedFields((current) => ({
					...current,
					...Object.fromEntries(
						Object.keys(serverErrors).map((field) => [field, true]),
					),
				}));
				setSubmitError(
					result.error || "Task creation failed. Please try again.",
				);
				focusFirstInvalidField(serverErrors);
				return;
			}
			closeCreateTaskModal();
		} finally {
			submissionRef.current = false;
		}
	};

	const canSubmit = !isLoadingContext && !isCreatingTask;

	return (
		<Modal
			isOpen={isCreateTaskModalOpen}
			onClose={closeCreateTaskModal}
			labelledBy="create-task-title"
			initialFocusRef={titleRef}
			className="flex max-h-[calc(100dvh-2rem)] max-w-[36rem] flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-3rem)]"
		>
			<div className="shrink-0 border-b border-border/60 px-5 py-4 sm:px-6">
				<h2
					id="create-task-title"
					className="text-xl font-semibold text-foreground"
				>
					Create New Task
				</h2>
			</div>

			<form
				onSubmit={handleSubmit}
				noValidate
				className="flex min-h-0 flex-1 flex-col"
			>
				<div className="scrollbar-thin space-y-3.5 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
					{isColumn ? (
						<div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
							<span className="font-medium text-foreground">
								{activeProjectName || "Current project"}
							</span>
							<span className="mx-2 text-muted-foreground">/</span>
							<span className="font-medium text-foreground">
								{inheritedList?.name || "Current list"}
							</span>
							<FieldError id="task-list-error" message={fieldErrors.listId} />
						</div>
					) : isGlobal ? (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div>
								<label
									htmlFor="task-project"
									className="mb-1.5 block text-sm font-medium"
								>
									Project
									<RequiredIndicator />
								</label>
								<div className="relative">
									<select
										ref={projectRef}
										id="task-project"
										value={selectedProjectId}
										onChange={(event) => {
											const projectId = event.target.value;
											setSelectedProjectId(projectId);
											validateAfterChange("projectId", { projectId });
										}}
										onBlur={() => validateOnBlur("projectId")}
										disabled={isLoadingContext}
										required
										aria-required="true"
										aria-invalid={Boolean(fieldErrors.projectId)}
										aria-describedby={
											fieldErrors.projectId ? "task-project-error" : undefined
										}
										className={selectClassName}
									>
										<option value="">Select a project...</option>
										{projects.map((project) => (
											<option key={project.id} value={project.id}>
												{project.name}
											</option>
										))}
									</select>
									<SelectChevron />
								</div>
								<FieldError
									id="task-project-error"
									message={fieldErrors.projectId}
								/>
							</div>
							<div>
								<label
									htmlFor="task-list"
									className="mb-1.5 block text-sm font-medium"
								>
									List
									<RequiredIndicator />
								</label>
								<div className="relative">
									<select
										ref={listRef}
										id="task-list"
										value={selectedListId}
										onChange={(event) => {
											const listId = event.target.value;
											setSelectedListId(listId);
											validateAfterChange("listId", { listId });
										}}
										onBlur={() => validateOnBlur("listId")}
										disabled={!selectedProjectId || availableLists.length === 0}
										required
										aria-required="true"
										aria-invalid={Boolean(fieldErrors.listId)}
										aria-describedby={
											fieldErrors.listId ? "task-list-error" : undefined
										}
										className={selectClassName}
									>
										<option value="">Select a list...</option>
										{availableLists.map((list) => (
											<option key={list.id} value={list.id}>
												{list.name}
											</option>
										))}
									</select>
									<SelectChevron />
								</div>
								<FieldError id="task-list-error" message={fieldErrors.listId} />
							</div>
							{contextError && (
								<p
									role="alert"
									className="text-sm text-destructive sm:col-span-2"
								>
									{contextError}
								</p>
							)}
						</div>
					) : (
						<div>
							<label
								htmlFor="task-list"
								className="mb-1.5 block text-sm font-medium"
							>
								List
								<RequiredIndicator />
							</label>
							<div className="relative">
								<select
									ref={listRef}
									id="task-list"
									value={selectedListId}
									onChange={(event) => {
										const listId = event.target.value;
										setSelectedListId(listId);
										validateAfterChange("listId", { listId });
									}}
									onBlur={() => validateOnBlur("listId")}
									required
									aria-required="true"
									aria-invalid={Boolean(fieldErrors.listId)}
									aria-describedby={
										fieldErrors.listId ? "task-list-error" : undefined
									}
									className={selectClassName}
								>
									<option value="">Select a list...</option>
									{availableLists.map((list) => (
										<option key={list.id} value={list.id}>
											{list.name}
										</option>
									))}
								</select>
								<SelectChevron />
							</div>
							<FieldError id="task-list-error" message={fieldErrors.listId} />
						</div>
					)}

					<p className="text-right text-xs text-muted-foreground">
						<span aria-hidden="true" className="text-destructive">
							*
						</span>{" "}
						Required
					</p>

					<div>
						<label
							htmlFor="task-title-input"
							className="mb-1.5 block text-sm font-medium"
						>
							Title
							<RequiredIndicator />
						</label>
						<input
							ref={titleRef}
							id="task-title-input"
							type="text"
							required
							aria-required="true"
							maxLength={200}
							value={title}
							onChange={(event) => {
								const nextTitle = event.target.value;
								setTitle(nextTitle);
								validateAfterChange("title", { title: nextTitle });
							}}
							onBlur={() => validateOnBlur("title")}
							aria-invalid={Boolean(fieldErrors.title)}
							aria-describedby={
								fieldErrors.title ? "task-title-error" : undefined
							}
							placeholder="Task title..."
							className={`${controlClassName} text-base font-medium placeholder:text-muted-foreground`}
						/>
						<FieldError id="task-title-error" message={fieldErrors.title} />
					</div>

					<div>
						<label
							htmlFor="task-description"
							className="mb-1.5 block text-sm font-medium"
						>
							Description
							<OptionalIndicator />
						</label>
						<textarea
							ref={descriptionRef}
							id="task-description"
							rows={3}
							maxLength={2000}
							value={description}
							onChange={(event) => {
								const nextDescription = event.target.value;
								setDescription(nextDescription);
								validateAfterChange("description", {
									description: nextDescription,
								});
							}}
							onBlur={() => validateOnBlur("description")}
							aria-invalid={Boolean(fieldErrors.description)}
							aria-describedby={
								fieldErrors.description ? "task-description-error" : undefined
							}
							className={textareaClassName}
						/>
						<FieldError
							id="task-description-error"
							message={fieldErrors.description}
						/>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<label
								htmlFor="task-assignee"
								className="mb-1.5 block text-sm font-medium"
							>
								Assignee
								<OptionalIndicator />
							</label>
							<div className="relative">
								<select
									ref={assigneeRef}
									id="task-assignee"
									value={assigneeId}
									onChange={(event) => {
										const nextAssigneeId = event.target.value;
										setAssigneeId(nextAssigneeId);
										validateAfterChange("assigneeId", {
											assigneeId: nextAssigneeId,
										});
									}}
									onBlur={() => validateOnBlur("assigneeId")}
									aria-invalid={Boolean(fieldErrors.assigneeId)}
									aria-describedby={
										fieldErrors.assigneeId ? "task-assignee-error" : undefined
									}
									className={selectClassName}
								>
									<option value="unassigned">Unassigned</option>
									{availableMembers.map((member) => (
										<option key={member.id} value={member.id}>
											{member.name || member.email}
										</option>
									))}
								</select>
								<SelectChevron />
							</div>
							<FieldError
								id="task-assignee-error"
								message={fieldErrors.assigneeId}
							/>
						</div>
						<div>
							<label
								htmlFor="task-priority"
								className="mb-1.5 block text-sm font-medium"
							>
								Priority
								<RequiredIndicator />
							</label>
							<div className="relative">
								<select
									ref={priorityRef}
									id="task-priority"
									value={priority}
									onChange={(event) => {
										const nextPriority = event.target.value as TaskPriority;
										setPriority(nextPriority);
										validateAfterChange("priority", { priority: nextPriority });
									}}
									onBlur={() => validateOnBlur("priority")}
									required
									aria-required="true"
									aria-invalid={Boolean(fieldErrors.priority)}
									aria-describedby={
										fieldErrors.priority ? "task-priority-error" : undefined
									}
									className={selectClassName}
								>
									{TASK_PRIORITIES.map((value) => (
										<option key={value} value={value}>
											{value[0].toUpperCase() + value.slice(1)}
										</option>
									))}
								</select>
								<SelectChevron />
							</div>
							<FieldError
								id="task-priority-error"
								message={fieldErrors.priority}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<label
								htmlFor="task-due-date"
								className="mb-1.5 block text-sm font-medium"
							>
								Due Date
								<OptionalIndicator />
							</label>
							<input
								ref={dueDateRef}
								id="task-due-date"
								type="date"
								value={dueDate}
								onChange={(event) => {
									const nextDueDate = event.target.value;
									setDueDate(nextDueDate);
									validateAfterChange("dueDate", { dueDate: nextDueDate });
								}}
								onBlur={() => validateOnBlur("dueDate")}
								aria-invalid={Boolean(fieldErrors.dueDate)}
								aria-describedby={
									fieldErrors.dueDate ? "task-due-date-error" : undefined
								}
								className={`${controlClassName} dark:[color-scheme:dark]`}
							/>
							<FieldError
								id="task-due-date-error"
								message={fieldErrors.dueDate}
							/>
						</div>
						<div>
							<label
								htmlFor="task-labels"
								className="mb-1.5 block text-sm font-medium"
							>
								Labels
								<OptionalIndicator />
							</label>
							<input
								ref={labelsRef}
								id="task-labels"
								type="text"
								value={labels}
								onChange={(event) => {
									const nextLabels = event.target.value;
									setLabels(nextLabels);
									validateAfterChange("labels", { labels: nextLabels });
								}}
								onBlur={() => validateOnBlur("labels")}
								aria-invalid={Boolean(fieldErrors.labels)}
								aria-describedby={
									fieldErrors.labels ? "task-labels-error" : undefined
								}
								placeholder="bug, frontend"
								className={`${controlClassName} placeholder:text-muted-foreground`}
							/>
							<FieldError id="task-labels-error" message={fieldErrors.labels} />
						</div>
					</div>

					<div aria-live="assertive" aria-atomic="true" className="min-h-5">
						{submitError && (
							<p role="alert" className="text-sm text-destructive">
								{submitError}
							</p>
						)}
					</div>
				</div>

				<div className="flex shrink-0 justify-end gap-3 border-t border-border/60 bg-muted/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
					<button
						type="button"
						onClick={closeCreateTaskModal}
						disabled={isCreatingTask}
						className="h-10 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!canSubmit}
						className="h-10 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isCreatingTask ? "Creating..." : "Create Task"}
					</button>
				</div>
			</form>
		</Modal>
	);
}
