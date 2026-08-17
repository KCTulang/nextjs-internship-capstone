"use client";

import {
	Calendar,
	MoreHorizontal,
	Settings,
	Trash2,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/hooks/use-projects";
import { useProjectStore } from "@/hooks/use-projects";
import { useUIStore } from "@/stores/ui-store";

export function ProjectHeaderActions({ project }: { project: Project }) {
	const { openEditProjectModal } = useUIStore();
	const { deleteProject } = useProjectStore();
	const router = useRouter();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleDelete = async () => {
		setIsMenuOpen(false);
		if (
			window.confirm(
				"Are you sure you want to delete this project? This action cannot be undone.",
			)
		) {
			await deleteProject(project.id);
			router.push("/dashboard");
		}
	};

	return (
		<div className="flex items-center space-x-1 sm:space-x-2 w-full sm:w-auto">
			<button
				type="button"
				onClick={() => useUIStore.getState().openInviteMemberModal()}
				className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
				title="Team Members"
			>
				<Users size={20} />
			</button>
			<button
				type="button"
				onClick={() => router.push("/calendar")}
				className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
				title="Calendar View"
			>
				<Calendar size={20} />
			</button>
			<button
				type="button"
				onClick={() => openEditProjectModal(project)}
				className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
				title="Project Settings"
			>
				<Settings size={20} />
			</button>
			<div className="relative" ref={menuRef}>
				<button
					type="button"
					onClick={() => setIsMenuOpen(!isMenuOpen)}
					className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
					title="More Options"
				>
					<MoreHorizontal size={20} />
				</button>
				{isMenuOpen && (
					<div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border shadow-lg rounded-xl overflow-hidden py-1 z-50 animate-in slide-in-from-top-2">
						<button
							type="button"
							onClick={handleDelete}
							className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2 font-medium"
						>
							<Trash2 size={16} /> Delete Project
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
