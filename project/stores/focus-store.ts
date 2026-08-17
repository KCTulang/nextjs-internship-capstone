import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Task } from "@/types";

export type AudioMode = "silence" | "white-noise" | "lofi";

export interface FocusSessionState {
	isLockedIn: boolean;
	activeTask: Task | null;
	audioMode: AudioMode;
	startTime: number | null;
	startLockIn: (task: Task) => void;
	endLockIn: () => void;
	toggleNoise: () => void;
}

export const useFocusStore = create<FocusSessionState>()(
	persist(
		(set) => ({
			isLockedIn: false,
			activeTask: null,
			audioMode: "silence",
			startTime: null,
			startLockIn: (task) =>
				set({ isLockedIn: true, activeTask: task, startTime: Date.now() }),
			endLockIn: () =>
				set({
					isLockedIn: false,
					activeTask: null,
					startTime: null,
					audioMode: "silence",
				}),
			toggleNoise: () =>
				set((state) => {
					const cycle: Record<AudioMode, AudioMode> = {
						silence: "white-noise",
						"white-noise": "lofi",
						lofi: "silence",
					};
					return { audioMode: cycle[state.audioMode] };
				}),
		}),
		{
			name: "lock-in-storage",
		},
	),
);
