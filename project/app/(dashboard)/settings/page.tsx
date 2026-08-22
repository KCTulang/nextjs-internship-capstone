import { auth } from "@clerk/nextjs/server";
import { queries } from "@/lib/db";
import { AccountSettings } from "./components/account-settings";

export default async function SettingsPage() {
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
