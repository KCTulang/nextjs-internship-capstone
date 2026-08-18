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
import { useCallback, useEffect, useRef, useState } from "react";
import {
	broadcastFocusStateAction,
	saveFocusSession,
} from "@/app/actions/focus-sessions";
import { useFocusTimer } from "@/hooks/use-focus-timer";
import { useTasksStore } from "@/hooks/use-tasks";
import { useFocusStore } from "@/stores/focus-store";
import { useUIStore } from "@/stores/ui-store";

const focusMusicTracks = [
	"/audio/focus-music-1.mp3",
	"/audio/focus-music-2.mp3",
	"/audio/focus-music-3.mp3",
];

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
	const holdProgress = useMotionValue(0);
	const holdAnimationRef = useRef<ReturnType<typeof animate> | null>(null);

	const audioWhiteNoiseRef = useRef<HTMLAudioElement | null>(null);
	const audioFocusMusicRef = useRef<HTMLAudioElement | null>(null);
	const [audioInitialized, setAudioInitialized] = useState(false);

	const [showChoices, setShowChoices] = useState(false);
	const [focusMusicIndex, setFocusMusicIndex] = useState(0);

	const isSavingRef = useRef(false);
	const [completionState, setCompletionState] = useState<
		"none" | "break" | "finish"
	>("none");

	useEffect(() => {
		if (isLockedIn) {
			setCompletionState("none");
			isSavingRef.current = false;
		}
	}, [isLockedIn]);

	const exitOverlay = useCallback(() => {
		setCompletionState("none");
		setShowChoices(false);
		if (holdAnimationRef.current) {
			holdAnimationRef.current.stop();
		}
		holdProgress.set(0);
		isSavingRef.current = false;
		endLockIn();
	}, [endLockIn, holdProgress]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			audioWhiteNoiseRef.current = new window.Audio("/audio/white-noise.mp3");
			audioWhiteNoiseRef.current.loop = true;
			audioFocusMusicRef.current = new window.Audio();
			setAudioInitialized(true);
		}
		return () => {
			audioWhiteNoiseRef.current?.pause();
			audioFocusMusicRef.current?.pause();
		};
	}, []);

	useEffect(() => {
		if (!audioInitialized) return;
		if (audioFocusMusicRef.current) {
			audioFocusMusicRef.current.src = focusMusicTracks[focusMusicIndex];
		}
	}, [focusMusicIndex, audioInitialized]);

	useEffect(() => {
		const primeAudio = () => {
			audioWhiteNoiseRef.current
				?.play()
				.then(() => audioWhiteNoiseRef.current?.pause())
				.catch((e) => {
					if (e instanceof Error && e.name !== "AbortError") console.error(e);
				});
			audioFocusMusicRef.current
				?.play()
				.then(() => audioFocusMusicRef.current?.pause())
				.catch((e: unknown) => {
					if (e instanceof Error && e.name !== "AbortError") console.error(e);
				});
		};
		window.addEventListener("prime-audio", primeAudio);
		return () => window.removeEventListener("prime-audio", primeAudio);
	}, []);

	useEffect(() => {
		if (!audioInitialized) return;
		const audioElement = audioFocusMusicRef.current;
		if (!audioElement) return;

		const handleEnded = () => {
			setFocusMusicIndex((prev) => (prev + 1) % focusMusicTracks.length);
		};

		audioElement.addEventListener("ended", handleEnded);
		return () => {
			audioElement.removeEventListener("ended", handleEnded);
		};
	}, [audioInitialized]);

	useEffect(() => {
		if (!audioInitialized) return;
		const focusAudio = audioFocusMusicRef.current;
		const whiteNoiseAudio = audioWhiteNoiseRef.current;
		if (!focusAudio || !whiteNoiseAudio) return;

		const handlePlayError = (err: unknown) => {
			if (err instanceof Error && err.name !== "AbortError") {
				console.error("Audio playback error:", err);
			}
		};

		if (audioMode !== "focus-music" && focusMusicIndex !== 0) {
			setFocusMusicIndex(0);
			return;
		}

		if (audioMode === "white-noise") {
			focusAudio.pause();
			if (focusAudio.readyState > 0) focusAudio.currentTime = 0;
			whiteNoiseAudio.play().catch(handlePlayError);
		} else if (audioMode === "focus-music") {
			whiteNoiseAudio.pause();
			if (whiteNoiseAudio.readyState > 0) whiteNoiseAudio.currentTime = 0;

			focusAudio.load();
			focusAudio.play().catch(handlePlayError);
		} else {
			whiteNoiseAudio.pause();
			if (whiteNoiseAudio.readyState > 0) whiteNoiseAudio.currentTime = 0;
			focusAudio.pause();
			if (focusAudio.readyState > 0) focusAudio.currentTime = 0;
		}
	}, [audioMode, focusMusicIndex, audioInitialized]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isLockedIn) {
				if (completionState !== "none") {
					exitOverlay();
				} else if (!showChoices) {
					setShowChoices(true);
				} else {
					setShowChoices(false);
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isLockedIn, showChoices, completionState, exitOverlay]);

	useEffect(() => {
		if (isLockedIn) {
			document.body.style.overflow = "hidden";
			if (activeTask) {
				const parentList = lists.find((l) => l.id === activeTask.listId);
				if (parentList?.projectId) {
					broadcastFocusStateAction(
						activeTask.id,
						parentList.projectId,
						"started",
					);
				}
			}
		} else {
			document.body.style.overflow = "";
			if (activeTask) {
				const parentList = lists.find((l) => l.id === activeTask.listId);
				if (parentList?.projectId) {
					broadcastFocusStateAction(
						activeTask.id,
						parentList.projectId,
						"completed",
					);
				}
			}
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isLockedIn, activeTask, lists]);

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
			exitOverlay();
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
				}
			}

			audioWhiteNoiseRef.current?.pause();
			audioFocusMusicRef.current?.pause();

			setCompletionState(action);
		} catch (_error) {
			addToast({
				message: "Failed to save focus session.",
				type: "error",
			});
			isSavingRef.current = false;
			exitOverlay();
		}
	};

	return (
		<AnimatePresence>
			{isLockedIn && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black text-white"
				>
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
						{completionState !== "none" ? (
							<motion.div
								key="completion"
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{ duration: 0.4, ease: "easeOut" }}
								className="relative z-10 flex w-full max-w-md flex-col items-center text-center px-6"
							>
								{completionState === "finish" ? (
									<CheckCircle2 className="h-16 w-16 text-primary mb-6" />
								) : (
									<Coffee className="h-16 w-16 text-primary mb-6" />
								)}

								<h2 className="text-3xl font-bold tracking-tight text-white mb-4">
									{completionState === "finish"
										? "Task complete."
										: "Nice work."}
								</h2>

								<p className="text-lg text-white/70 mb-10 leading-relaxed">
									You stayed focused for{" "}
									<strong className="text-white font-semibold">
										{formattedTime}
									</strong>
									.<br />
									{completionState === "finish"
										? "Well done."
										: "You deserve a break."}
								</p>

								<button
									type="button"
									onClick={exitOverlay}
									className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/50"
								>
									{completionState === "finish" ? "Done" : "Take a Break"}
								</button>
							</motion.div>
						) : !showChoices ? (
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
									<span>
										Audio Mode:{" "}
										{audioMode === "focus-music" ? "Focus Music" : audioMode}
									</span>
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
	);
}
