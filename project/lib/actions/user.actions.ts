"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { queries } from "@/lib/db";

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
		const imageUrl = updatedClerkUser.imageUrl;

		const result = await queries.users.update(clerkId, {
			name,
			imageUrl,
		});

		if (result.length === 0) {
			await queries.users.create({
				clerkId,
				email: primaryEmail || "",
				name,
				imageUrl,
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
