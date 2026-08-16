"use client";

import {
	AnimatePresence,
	animate,
	motion,
	useMotionValue,
} from "framer-motion";
import {
	CheckCircle2,
	Coffee,
	Headphones,
	Power,
	Target,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { saveFocusSession } from "@/app/actions/focus-sessions";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { useTasksStore } from "@/hooks/use-tasks";
import { useFocusStore } from "@/stores/focus-store";
import { useUIStore } from "@/stores/ui-store";

export function LockInOverlay() {
	const {
		isLockedIn,
		activeTask,
		audioMode,
		startTime,
		toggleNoise,
		endLockIn,
	} = useFocusStore();
	const { timeElapsed, formattedTime } = useFocusTimer();
	const { addToast } = useUIStore();
	const { lists, moveTask } = useTasksStore();

	const audioWhiteNoiseRef = useRef<HTMLAudioElement>(null);
	const audioLofiRef = useRef<HTMLAudioElement>(null);

	const [showChoices, setShowChoices] = useState(false);
	const isSavingRef = useRef(false);

	const holdProgress = useMotionValue(0);
	const holdAnimationRef = useRef<ReturnType<typeof animate> | null>(null);

	useEffect(() => {
		const primeAudio = () => {
			audioWhiteNoiseRef.current
				?.play()
				.then(() => audioWhiteNoiseRef.current?.pause())
				.catch(() => {});
			audioLofiRef.current
				?.play()
				.then(() => audioLofiRef.current?.pause())
				.catch(() => {});
		};
		window.addEventListener("prime-audio", primeAudio);
		return () => window.removeEventListener("prime-audio", primeAudio);
	}, []);

	useEffect(() => {
		if (audioMode === "white-noise") {
			audioLofiRef.current?.pause();
			audioWhiteNoiseRef.current?.play().catch(console.error);
		} else if (audioMode === "lofi") {
			audioWhiteNoiseRef.current?.pause();
			audioLofiRef.current?.play().catch(console.error);
		} else {
			audioWhiteNoiseRef.current?.pause();
			audioLofiRef.current?.pause();
		}
	}, [audioMode]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isLockedIn && !showChoices) {
				setShowChoices(true);
			} else if (e.key === "Escape" && isLockedIn && showChoices) {
				setShowChoices(false);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isLockedIn, showChoices]);

	useEffect(() => {
		if (isLockedIn) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isLockedIn]);

	const startHold = () => {
		if (showChoices) return;
		holdAnimationRef.current = animate(holdProgress, 1, {
			duration: 1.5,
			ease: "linear",
			onComplete: () => {
				setShowChoices(true);
			},
		});
	};

	const cancelHold = () => {
		if (holdAnimationRef.current) {
			holdAnimationRef.current.stop();
		}
		animate(holdProgress, 0, { duration: 0.3, ease: "easeOut" });
	};

	const getDoneListId = () => {
		if (lists.length === 0) return null;
		const doneList = lists.find(
			(l) =>
				l.name.toLowerCase().includes("done") ||
				l.name.toLowerCase().includes("completed"),
		);
		return doneList ? doneList.id : lists[lists.length - 1].id;
	};

	const handleSessionEnd = async (action: "finish" | "break") => {
		if (isSavingRef.current) return;
		isSavingRef.current = true;

		if (!activeTask || !startTime) {
			endLockIn();
			setShowChoices(false);
			isSavingRef.current = false;
			return;
		}

		const endTime = new Date();
		const duration = timeElapsed;

		const parentList = lists.find((l) => l.id === activeTask.listId);
		const projectId = parentList?.projectId;

		try {
			await saveFocusSession({
				taskId: activeTask.id,
				startTime: new Date(startTime),
				endTime,
				duration,
			});

			if (action === "finish") {
				const doneListId = getDoneListId();

				if (doneListId && projectId && activeTask.listId !== doneListId) {
					await moveTask(
						activeTask.id,
						activeTask.listId,
						doneListId,
						0,
						projectId,
					);
					addToast({
						message: `Task moved to Done. Locked in for ${formattedTime}.`,
						type: "success",
					});
				} else {
					addToast({
						message: `Session saved! Locked in for ${formattedTime}.`,
						type: "success",
					});
				}
			} else {
				addToast({
					message: `Session saved! Take a break. Time: ${formattedTime}.`,
					type: "success",
				});
			}
		} catch (_error) {
			addToast({
				message: "Failed to save focus session.",
				type: "error",
			});
		} finally {
			endLockIn();
			setShowChoices(false);
			isSavingRef.current = false;
			holdProgress.set(0);
		}
	};

	return (
		<>
			<audio
				ref={audioWhiteNoiseRef}
				src="https://cdn.pixabay.com/download/audio/2022/03/15/audio_2c9496ccf2.mp3?filename=brown-noise-94186.mp3"
				loop
			>
				<track kind="captions" />
			</audio>
			<audio
				ref={audioLofiRef}
				src="https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3"
				loop
			>
				<track kind="captions" />
			</audio>

			<AnimatePresence>
				{isLockedIn && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5, ease: "easeInOut" }}
						className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black text-white"
					>
						{/* Ambient Visuals */}
						<div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
							{audioMode === "silence" ? (
								<motion.div
									animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.25, 0.1] }}
									transition={{
										duration: 8,
										repeat: Infinity,
										ease: "easeInOut",
									}}
									className="absolute top-1/2 left-1/2 h-200 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 blur-[100px] will-change-transform"
								/>
							) : (
								<>
									<motion.div
										animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
										transition={{
											duration: 8,
											repeat: Infinity,
											ease: "easeInOut",
										}}
										className="absolute top-1/2 left-1/2 h-160 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px] will-change-transform"
									/>
									<motion.div
										animate={{ opacity: [0.2, 0.4, 0.2] }}
										transition={{
											duration: 15,
											repeat: Infinity,
											ease: "easeInOut",
										}}
										className="absolute top-1/4 left-1/4 h-120 w-120 rounded-full bg-blue-500/10 blur-[120px] will-change-transform"
									/>
									<motion.div
										animate={{ opacity: [0.2, 0.4, 0.2] }}
										transition={{
											duration: 20,
											repeat: Infinity,
											ease: "easeInOut",
										}}
										className="absolute bottom-1/4 right-1/4 h-120 w-120 rounded-full bg-purple-500/10 blur-[120px] will-change-transform"
									/>
								</>
							)}
							<div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
						</div>

						<AnimatePresence mode="wait">
							{!showChoices ? (
								<motion.div
									key="timer"
									initial={{ y: 30, opacity: 0, scale: 0.95 }}
									animate={{ y: 0, opacity: 1, scale: 1 }}
									exit={{ y: -30, opacity: 0, scale: 0.95 }}
									transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
									className="relative z-10 flex flex-col items-center max-w-2xl w-full text-center px-6"
								>
									<div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.1)] backdrop-blur-xl">
										<Target className="h-10 w-10 text-white/90" />
									</div>

									<h2 className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-white/40">
										Deep Work Session
									</h2>
									<h1 className="mb-16 text-4xl sm:text-5xl font-bold tracking-tight text-white/90 max-w-xl mx-auto leading-tight">
										{activeTask?.title || "Stay Focused."}
									</h1>

									<div className="relative mb-20 group">
										<div className="absolute -inset-4 rounded-3xl bg-white/5 blur-xl group-hover:bg-white/10 transition-colors duration-500" />
										<div className="relative font-mono text-[6rem] sm:text-[9rem] font-black leading-none tracking-tighter text-white tabular-nums drop-shadow-2xl">
											{formattedTime}
										</div>
									</div>

									<div className="flex items-center gap-8">
										<button
											type="button"
											onClick={toggleNoise}
											className={`group relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 overflow-hidden ${
												audioMode !== "silence"
													? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] scale-110"
													: "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10"
											}`}
											title="Toggle Audio Mode"
										>
											{audioMode !== "silence" && (
												<motion.div
													animate={{
														opacity: [0.2, 0.5, 0.2],
														scale: [1, 1.2, 1],
													}}
													transition={{ repeat: Infinity, duration: 2 }}
													className="absolute inset-0 bg-black/10 rounded-full"
												/>
											)}
											<Headphones className="h-6 w-6 relative z-10" />
										</button>

										<div className="relative">
											<motion.button
												type="button"
												whileTap={{ scale: 0.95 }}
												onPointerDown={startHold}
												onPointerUp={cancelHold}
												onPointerLeave={cancelHold}
												className="group relative flex h-16 w-56 items-center justify-center gap-3 overflow-hidden rounded-full bg-red-500/10 text-red-400 border border-red-500/20 transition-all duration-300 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] select-none"
											>
												<span className="relative z-10 flex items-center gap-2 font-medium tracking-wide">
													<Power className="h-5 w-5" />
													Hold to Complete
												</span>
												<motion.div
													style={{ scaleX: holdProgress }}
													className="absolute inset-0 z-0 origin-left bg-red-500/40 will-change-transform"
												/>
											</motion.button>
										</div>
									</div>
									<div className="mt-8 text-xs font-medium text-white/30 tracking-widest uppercase flex items-center gap-2">
										<span>Audio Mode: {audioMode}</span>
										<span className="px-2 opacity-50">•</span>
										<span>Press Esc for options</span>
									</div>
								</motion.div>
							) : (
								<motion.div
									key="choices"
									initial={{ y: 30, opacity: 0, scale: 0.95 }}
									animate={{ y: 0, opacity: 1, scale: 1 }}
									exit={{ y: -30, opacity: 0, scale: 0.95 }}
									transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
									className="relative z-10 flex flex-col items-center max-w-2xl w-full text-center px-6"
								>
									<h2 className="mb-4 text-3xl font-bold text-white tracking-tight">
										Session Complete
									</h2>
									<p className="mb-12 text-white/60 text-lg">
										You locked in for {formattedTime}. What would you like to do
										next?
									</p>

									<div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg justify-center">
										<button
											type="button"
											onClick={() => handleSessionEnd("finish")}
											className="flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-primary/20 border border-primary/30 hover:bg-primary/30 hover:border-primary/50 transition-all duration-300 group"
										>
											<div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
												<CheckCircle2 className="h-7 w-7 text-primary" />
											</div>
											<div className="text-center">
												<div className="font-semibold text-lg text-white mb-1">
													Finish Task
												</div>
												<div className="text-xs text-white/50">
													Save time & move to Done
												</div>
											</div>
										</button>

										<button
											type="button"
											onClick={() => handleSessionEnd("break")}
											className="flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
										>
											<div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
												<Coffee className="h-7 w-7 text-white/80" />
											</div>
											<div className="text-center">
												<div className="font-semibold text-lg text-white mb-1">
													Take a Break
												</div>
												<div className="text-xs text-white/50">
													Save time & keep In Progress
												</div>
											</div>
										</button>
									</div>

									<button
										type="button"
										onClick={() => {
											setShowChoices(false);
											cancelHold();
										}}
										className="mt-12 flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors"
									>
										<X className="h-4 w-4" />
										Resume Session
									</button>
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
