import { auth, currentUser } from "@clerk/nextjs/server";
import { queries } from "@/lib/db";
import DashboardLayout from "./dashboard-layout";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { userId } = await auth.protect();

	let dbUser = await queries.users.getByClerkId(userId);
	if (!dbUser) {
		const user = await currentUser();
		if (user) {
			const primaryEmailObj =
				user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId) ||
				user.emailAddresses[0];
			const primaryEmail = primaryEmailObj?.emailAddress;
			const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
			const name = fullName || primaryEmail?.split("@")[0] || userId;
			const googleAvatarUrl =
				user.externalAccounts.find((account) => account.provider === "google")
					?.imageUrl ?? null;

			if (primaryEmail) {
				try {
					await queries.users.create({
						clerkId: userId,
						email: primaryEmail,
						name: name,
						googleAvatarUrl,
					});
				} catch (err: unknown) {
					if (
						err instanceof Error &&
						(err.message.includes("duplicate key") ||
							err.message.includes("unique constraint") ||
							(err as { code?: string }).code === "23505")
					) {
					} else {
						console.error("Dashboard fallback sync failed:", err);
					}
				}
			}
		}
		dbUser = await queries.users.getByClerkId(userId);
	}

	return (
		<DashboardLayout
			customAvatarUrl={dbUser?.customAvatarUrl ?? null}
			googleAvatarUrl={dbUser?.googleAvatarUrl ?? null}
		>
			{children}
		</DashboardLayout>
	);
}
