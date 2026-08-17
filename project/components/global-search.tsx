"use client";

import { CheckSquare, Folder, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { searchAction } from "@/app/actions/search";

export function GlobalSearch() {
	const [isOpen, setIsOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{
		projects: Array<{ id: string; slug: string; name: string }>;
		tasks: Array<{
			id: string;
			title: string;
			projectSlug: string;
			projectName: string;
		}>;
	}>({
		projects: [],
		tasks: [],
	});
	const [isSearching, setIsSearching] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const router = useRouter();

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setIsOpen((open) => !open);
			} else if (e.key === "Escape") {
				setIsOpen(false);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	useEffect(() => {
		if (isOpen) {
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [isOpen]);

	useEffect(() => {
		const timer = setTimeout(() => {
			if (query.trim()) {
				setIsSearching(true);
				searchAction(query).then((res) => {
					if (res.success && res.data) {
						setResults(res.data);
					}
					setIsSearching(false);
				});
			} else {
				setResults({ projects: [], tasks: [] });
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [query]);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
	};

	const navigateTo = (url: string) => {
		setIsOpen(false);
		setQuery("");
		router.push(url);
	};

	return (
		<>
			<button
				type="button"
				className="relative hidden md:block w-48 lg:w-64 cursor-pointer group text-left"
				onClick={() => setIsOpen(true)}
			>
				<Search
					className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-hover:text-foreground transition-colors"
					size={16}
				/>
				<div className="w-full pl-10 pr-4 py-1.5 bg-muted/50 border border-border/50 rounded-lg text-sm text-muted-foreground group-hover:bg-muted transition-colors flex items-center justify-between">
					<span>Search...</span>
					<kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
						<span className="text-xs">⌘</span>K
					</kbd>
				</div>
			</button>

			{isOpen && (
				<div className="fixed inset-0 z-100 flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm">
					<button
						type="button"
						className="fixed inset-0 cursor-default outline-none border-none bg-transparent w-full h-full"
						tabIndex={-1}
						aria-label="Close modal"
						onClick={() => setIsOpen(false)}
					/>
					<div className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<form
							onSubmit={handleSearch}
							className="flex items-center px-4 py-3 border-b border-border"
						>
							{isSearching ? (
								<Loader2
									className="text-muted-foreground mr-3 animate-spin"
									size={20}
								/>
							) : (
								<Search className="text-muted-foreground mr-3" size={20} />
							)}
							<input
								ref={inputRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search projects or tasks..."
								className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-lg text-foreground placeholder:text-muted-foreground/50"
							/>
							<button
								type="button"
								onClick={() => setIsOpen(false)}
								className="px-2 py-1 bg-muted hover:bg-muted/80 rounded text-xs font-medium text-muted-foreground transition-colors ml-2"
							>
								ESC
							</button>
						</form>

						<div className="max-h-[60vh] overflow-y-auto">
							{!query && (
								<div className="p-4 py-8 text-center text-sm text-muted-foreground">
									Type to search your projects and tasks...
								</div>
							)}

							{query &&
								results.projects.length === 0 &&
								results.tasks.length === 0 &&
								!isSearching && (
									<div className="p-4 py-8 text-center text-sm text-muted-foreground">
										No results found for &quot;{query}&quot;
									</div>
								)}

							{results.projects.length > 0 && (
								<div className="p-2">
									<h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Projects
									</h3>
									{results.projects.map((p) => (
										<button
											type="button"
											key={p.id}
											onClick={() => navigateTo(`/projects/${p.slug}`)}
											className="w-full flex items-center px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors text-left"
										>
											<Folder className="mr-3 text-primary/70" size={16} />
											<span className="font-medium text-foreground">
												{p.name}
											</span>
										</button>
									))}
								</div>
							)}

							{results.tasks.length > 0 && (
								<div className="p-2 border-t border-border/50">
									<h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Tasks
									</h3>
									{results.tasks.map((t) => (
										<button
											type="button"
											key={t.id}
											onClick={() =>
												navigateTo(`/projects/${t.projectSlug}?taskId=${t.id}`)
											}
											className="w-full flex flex-col items-start px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors text-left"
										>
											<div className="flex items-center">
												<CheckSquare
													className="mr-3 text-primary/70"
													size={16}
												/>
												<span className="font-medium text-foreground">
													{t.title}
												</span>
											</div>
											<span className="text-xs text-muted-foreground ml-7 mt-0.5">
												in {t.projectName}
											</span>
										</button>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
