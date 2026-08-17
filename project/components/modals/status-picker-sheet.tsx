"use client";

import { Check } from "lucide-react";
import { Drawer } from "vaul";
import type { List } from "@/hooks/use-tasks";

interface StatusPickerSheetProps {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	taskTitle: string;
	currentListId: string;
	lists: List[];
	onSelect: (listId: string) => void;
}

export function StatusPickerSheet({
	isOpen,
	setIsOpen,
	taskTitle,
	currentListId,
	lists,
	onSelect,
}: StatusPickerSheetProps) {
	return (
		<Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
			<Drawer.Portal>
				<Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 transition-opacity" />
				<Drawer.Content className="bg-card border-t border-border flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 focus:outline-none outline-none">
					<div className="p-4 flex-1 flex flex-col w-full max-w-md mx-auto">
						<div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-border mb-6" />

						<Drawer.Title className="text-lg font-bold text-foreground mb-1 text-center">
							Move Task
						</Drawer.Title>
						<Drawer.Description className="text-sm text-muted-foreground mb-6 text-center line-clamp-1">
							{taskTitle}
						</Drawer.Description>

						<div className="space-y-2 mb-6 overflow-y-auto max-h-[50vh] scrollbar-thin px-1">
							{lists.map((list) => {
								const isCurrent = list.id === currentListId;
								return (
									<button
										key={list.id}
										type="button"
										onClick={() => {
											if (!isCurrent) onSelect(list.id);
											setIsOpen(false);
										}}
										disabled={isCurrent}
										className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary ${
											isCurrent
												? "bg-primary/10 border-2 border-primary/20 opacity-70 cursor-default"
												: "bg-muted/50 hover:bg-muted border-2 border-transparent active:scale-[0.98]"
										}`}
									>
										<span
											className={`font-medium ${isCurrent ? "text-primary" : "text-foreground"}`}
										>
											{list.name}
										</span>
										{isCurrent && <Check size={18} className="text-primary" />}
									</button>
								);
							})}
						</div>
					</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	);
}
