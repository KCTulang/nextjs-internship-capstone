"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { queries } from "@/lib/db";

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

export async function updateUserProfileAction(
	firstName: string,
	lastName: string,
) {
	try {
		const { userId: clerkId } = await auth();

		if (!clerkId) {
			throw new Error("Unauthorized");
		}

		const client = await clerkClient();
		const updatedClerkUser = await client.users.updateUser(clerkId, {
			firstName,
			lastName,
		});

		const fullName =
			`${updatedClerkUser.firstName || ""} ${updatedClerkUser.lastName || ""}`.trim();
		const primaryEmail = updatedClerkUser.emailAddresses[0]?.emailAddress;
		const name = fullName || primaryEmail?.split("@")[0] || clerkId;

		const result = await queries.users.update(clerkId, {
			name,
		});

		if (result.length === 0) {
			await queries.users.create({
				clerkId,
				email: primaryEmail || "",
				name,
			});
		}

		revalidatePath("/team");
		revalidatePath("/(dashboard)/team", "page");

		return { success: true };
	} catch (error) {
		console.error("Failed to update user profile manually:", error);
		return { success: false, error: "Failed to update user profile" };
	}
}

export async function persistCustomAvatarAction() {
	try {
		const { userId: clerkId } = await auth();
		if (!clerkId) {
			return { success: false, error: "Unauthorized" };
		}

		const client = await clerkClient();
		const refreshed = await client.users.getUser(clerkId);
		const finalUrl = refreshed.imageUrl;

		await queries.users.update(clerkId, {
			customAvatarUrl: finalUrl,
		});

		revalidatePath("/settings");
		revalidatePath("/team");

		return { success: true };
	} catch (error) {
		console.error("Failed to persist custom avatar:", error);
		return { success: false, error: "Failed to persist custom avatar" };
	}
}

export async function clearCustomAvatarAction() {
	try {
		const { userId: clerkId } = await auth();
		if (!clerkId) {
			return { success: false, error: "Unauthorized" };
		}

		await queries.users.update(clerkId, {
			customAvatarUrl: null,
		});

		revalidatePath("/settings");
		revalidatePath("/team");

		return { success: true };
	} catch (error) {
		console.error("Failed to clear custom avatar:", error);
		return { success: false, error: "Failed to clear custom avatar" };
	}
}

export async function syncGoogleAvatarAction() {
	try {
		const { userId: clerkId } = await auth();
		if (!clerkId) {
			return { success: false, error: "Unauthorized" };
		}

		const client = await clerkClient();
		const refreshed = await client.users.getUser(clerkId);
		const googleAccount = refreshed.externalAccounts.find(
			(account) => account.provider === "google",
		);

		const googleAvatarUrl = googleAccount?.imageUrl ?? null;

		await queries.users.update(clerkId, {
			googleAvatarUrl,
		});

		revalidatePath("/settings");
		revalidatePath("/team");

		return { success: true };
	} catch (error) {
		console.error("Failed to sync google avatar:", error);
		return { success: false, error: "Failed to sync google avatar" };
	}
}
