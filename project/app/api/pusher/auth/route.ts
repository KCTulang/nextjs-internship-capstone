import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectMembers, projects, users } from "@/lib/db/schema";
import { pusherServer } from "@/lib/realtime/pusher";

export async function POST(req: NextRequest) {
	const { userId: clerkId } = await auth();

	if (!clerkId) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const user = await currentUser();
	if (!user) {
		return new NextResponse("User not found", { status: 401 });
	}

	const dbUser = await db.query.users.findFirst({
		where: eq(users.clerkId, clerkId),
	});

	if (!dbUser) {
		return new NextResponse("User not found in database", { status: 401 });
	}

	const internalUserId = dbUser.id;

	const data = await req.formData();
	const socketId = data.get("socket_id") as string;
	const channel = data.get("channel_name") as string;

	if (!socketId || !channel) {
		return new NextResponse("Missing socket_id or channel_name", {
			status: 400,
		});
	}

	if (
		channel.startsWith("private-project-") ||
		channel.startsWith("presence-project-")
	) {
		const projectId = channel
			.replace("private-project-", "")
			.replace("presence-project-", "");

		const project = await db.query.projects.findFirst({
			where: eq(projects.id, projectId),
		});

		if (!project) {
			return new NextResponse("Project not found", { status: 404 });
		}

		let isAuthorized = false;
		if (project.ownerId === internalUserId) {
			isAuthorized = true;
		} else {
			const member = await db.query.projectMembers.findFirst({
				where: and(
					eq(projectMembers.projectId, projectId),
					eq(projectMembers.userId, internalUserId),
				),
			});
			if (member) {
				isAuthorized = true;
			}
		}

		if (!isAuthorized) {
			return new NextResponse("Forbidden", { status: 403 });
		}
	} else if (channel.startsWith("private-user-")) {
		const channelUserId = channel.replace("private-user-", "");
		if (channelUserId !== clerkId) {
			return new NextResponse("Forbidden", { status: 403 });
		}
	}

	const name = user.firstName
		? `${user.firstName} ${user.lastName || ""}`.trim()
		: user.emailAddresses[0]?.emailAddress || "Unknown";

	const presenceData = {
		user_id: clerkId,
		user_info: {
			name,
			imageUrl: user.imageUrl,
		},
	};

	try {
		const authResponse = pusherServer.authorizeChannel(
			socketId,
			channel,
			presenceData,
		);
		return NextResponse.json(authResponse);
	} catch (error) {
		console.error("Pusher auth error:", error);
		return new NextResponse("Internal error", { status: 500 });
	}
}
