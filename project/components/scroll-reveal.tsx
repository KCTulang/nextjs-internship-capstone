"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface ScrollRevealProps {
	children: ReactNode;
	className?: string;
	delay?: 0 | 1 | 2 | 3 | 4;
	threshold?: number;
}

export function ScrollReveal({
	children,
	className = "",
	delay = 0,
	threshold = 0.15,
}: ScrollRevealProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					el.classList.add("visible");
				} else {
					el.classList.remove("visible");
				}
			},
			{ threshold },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [threshold]);

	const delayClass = delay > 0 ? `reveal-delay-${delay}` : "";

	return (
		<div ref={ref} className={`reveal ${delayClass} ${className}`.trim()}>
			{children}
		</div>
	);
}
