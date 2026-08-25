import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountSettingsSkeleton } from "@/components/skeletons/settings-skeletons";
import { queries } from "@/lib/db";
import { AccountSettings } from "./components/account-settings";

export const metadata: Metadata = {
	title: "Settings",
};

async function AccountSettingsData() {
	const { userId } = await auth.protect();
	const dbUser = await queries.users.getByClerkId(userId);

	return (
		<div className="w-full">
			<AccountSettings
				customAvatarUrl={dbUser?.customAvatarUrl ?? null}
				googleAvatarUrl={dbUser?.googleAvatarUrl ?? null}
			/>
		</div>
	);
}

export default function SettingsPage() {
	return (
		<Suspense fallback={<AccountSettingsSkeleton />}>
			<AccountSettingsData />
		</Suspense>
	);
}
