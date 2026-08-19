"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { type List, useTasksStore } from "@/stores/board-store";

interface ManageColumnsSheetProps {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	projectId: string;
}

function SortableColumnItem({ list }: { list: List }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: list.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`flex items-center justify-between p-4 mb-2 bg-card border border-border rounded-xl transition-all ${
				isDragging ? "opacity-50 shadow-lg scale-[1.02] border-primary/50" : ""
			}`}
		>
			<span className="font-medium text-foreground">{list.name}</span>
			<div
				{...attributes}
				{...listeners}
				className="p-2 -mr-2 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
			>
				<GripHorizontal size={20} />
			</div>
		</div>
	);
}

export function ManageColumnsSheet({
	isOpen,
	setIsOpen,
	projectId,
}: ManageColumnsSheetProps) {
	const { lists, moveList } = useTasksStore();
	const [localLists, setLocalLists] = useState(lists);

	useEffect(() => {
		if (isOpen) {
			setLocalLists(lists);
		}
	}, [isOpen, lists]);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = localLists.findIndex((l) => l.id === active.id);
			const newIndex = localLists.findIndex((l) => l.id === over.id);

			setLocalLists((items) => arrayMove(items, oldIndex, newIndex));

			moveList(active.id as string, newIndex, projectId);
		}
	}

	return (
		<Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 transition-opacity" />
				<Drawer.Content className="bg-muted border-t border-border flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 focus:outline-none outline-none mt-24">
					<div className="p-4 flex-1 flex flex-col w-full max-w-md mx-auto max-h-[80vh]">
						<div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-border mb-6" />

						<Drawer.Title className="text-xl font-bold text-foreground mb-1">
							Manage Columns
						</Drawer.Title>
						<Drawer.Description className="text-sm text-muted-foreground mb-6">
							Drag to reorder your board columns.
						</Drawer.Description>

						<div className="flex-1 overflow-y-auto scrollbar-none px-1 pb-10">
							<DndContext
								sensors={sensors}
								collisionDetection={closestCenter}
								onDragEnd={handleDragEnd}
							>
								<SortableContext
									items={localLists.map((l) => l.id)}
									strategy={verticalListSortingStrategy}
								>
									{localLists.map((list) => (
										<SortableColumnItem key={list.id} list={list} />
									))}
								</SortableContext>
							</DndContext>
						</div>
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}
