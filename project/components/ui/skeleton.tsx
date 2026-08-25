import type { ComponentProps } from "react";
import { cn } from "@/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			{...props}
			aria-hidden="true"
			className={cn(
				"animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none",
				className,
			)}
		/>
	);
}
