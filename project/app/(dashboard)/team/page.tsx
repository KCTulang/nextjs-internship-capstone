import { auth } from "@clerk/nextjs/server";
import {
	getPendingInvitationsForUserAction,
	getSentInvitationsAction,
	getTeamMembersAction,
} from "@/app/actions/members";
import { queries } from "@/lib/db";
import { TeamPageClient } from "./team-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Team",
};

export default async function TeamPage() {
	const { userId: clerkId } = await auth();
	let currentUserId = "";

	if (clerkId) {
		const user = await queries.users.getByClerkId(clerkId);
		if (user) currentUserId = user.id;
	}

	const [teamRes, myInvitesRes, sentInvitesRes] = await Promise.all([
		getTeamMembersAction(),
		getPendingInvitationsForUserAction(),
		getSentInvitationsAction(),
	]);

	const members = teamRes.success ? (teamRes.data ?? []) : [];
	const myInvites = myInvitesRes.success ? (myInvitesRes.data ?? []) : [];
	const sentInvites = sentInvitesRes.success ? (sentInvitesRes.data ?? []) : [];

	return (
		<TeamPageClient
			initialMembers={members}
			initialMyInvites={myInvites}
			initialSentInvites={sentInvites}
			currentUserId={currentUserId}
		/>
	);
}
