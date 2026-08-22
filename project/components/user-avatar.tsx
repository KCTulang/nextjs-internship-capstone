"use client";

import Image from "next/image";

export interface UserAvatarProps {
	customAvatarUrl?: string | null;
	googleAvatarUrl?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	size?: number;
	className?: string;
}

function getInitials(
	firstName?: string | null,
	lastName?: string | null,
): string {
	const first = firstName?.charAt(0).toUpperCase() ?? "";
	const last = lastName?.charAt(0).toUpperCase() ?? "";
	return first + last || "?";
}

export function UserAvatar({
	customAvatarUrl,
	googleAvatarUrl,
	firstName,
	lastName,
	size = 40,
	className = "",
}: UserAvatarProps) {
	const src = customAvatarUrl ?? googleAvatarUrl ?? null;
	const initials = getInitials(firstName, lastName);

	const baseStyle: React.CSSProperties = {
		width: size,
		height: size,
		borderRadius: "50%",
		overflow: "hidden",
		flexShrink: 0,
	};

	if (src) {
		return (
			<div
				style={baseStyle}
				className={className}
				role="img"
				aria-label={
					`${firstName ?? ""} ${lastName ?? ""}`.trim() || "User avatar"
				}
			>
				<Image
					src={src}
					alt=""
					width={size}
					height={size}
					className="w-full h-full object-cover"
					unoptimized
				/>
			</div>
		);
	}

	return (
		<div
			style={{
				...baseStyle,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: size * 0.4,
				fontWeight: 600,
				background: "hsl(var(--muted))",
				color: "hsl(var(--muted-foreground))",
			}}
			className={className}
			role="img"
			aria-label={
				`${firstName ?? ""} ${lastName ?? ""}`.trim() || "User avatar"
			}
		>
			{initials}
		</div>
	);
}
