import { useEffect, useState } from "react";
import { useFocusStore } from "@/stores/focus-store";

export function useFocusTimer() {
	const { isLockedIn, startTime } = useFocusStore();
	const [timeElapsed, setTimeElapsed] = useState(0);
	const [pauseStartedAt, setPauseStartedAt] = useState<number | null>(null);
	const [accumulatedPause, setAccumulatedPause] = useState(0);

	const pause = () => {
		if (pauseStartedAt === null) {
			setPauseStartedAt(Date.now());
		}
	};

	const resume = () => {
		if (pauseStartedAt !== null) {
			setAccumulatedPause((prev) => prev + (Date.now() - pauseStartedAt));
			setPauseStartedAt(null);
		}
	};

	useEffect(() => {
		let intervalId: NodeJS.Timeout;

		if (isLockedIn && startTime) {
			if (pauseStartedAt === null) {
				const calculate = () =>
					Math.floor((Date.now() - startTime - accumulatedPause) / 1000);

				setTimeElapsed(calculate());
				intervalId = setInterval(() => {
					setTimeElapsed(calculate());
				}, 1000);
			}
		} else {
			setTimeElapsed(0);
			setPauseStartedAt(null);
			setAccumulatedPause(0);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isLockedIn, startTime, pauseStartedAt, accumulatedPause]);

	const formatTime = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) {
			return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
		}
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	return { timeElapsed, formattedTime: formatTime(timeElapsed), pause, resume };
}
