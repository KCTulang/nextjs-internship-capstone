import { useEffect, useState } from "react";
import { useFocusStore } from "@/stores/focus-store";

export function useFocusTimer() {
	const { isLockedIn, startTime } = useFocusStore();
	const [timeElapsed, setTimeElapsed] = useState(0);

	useEffect(() => {
		let intervalId: NodeJS.Timeout;

		if (isLockedIn && startTime) {
			setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));

			intervalId = setInterval(() => {
				setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
			}, 1000);
		} else {
			setTimeElapsed(0);
		}

		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isLockedIn, startTime]);

	const formatTime = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) {
			return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
		}
		return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	};

	return { timeElapsed, formattedTime: formatTime(timeElapsed) };
}
