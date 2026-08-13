"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function setPasswordAction(password: string) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return { success: false, error: "Unauthorized" };
		}

		const client = await clerkClient();

		await client.users.updateUser(userId, { password });
		return { success: true };
	} catch (error: unknown) {
		console.error("Failed to set password via server:", error);
		const err = error as
			| { errors?: Array<{ message?: string }>; message?: string }
			| undefined;
		return {
			success: false,
			error:
				err?.errors?.[0]?.message ?? err?.message ?? "Failed to set password",
		};
	}
}
