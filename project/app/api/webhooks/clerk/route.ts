import type { WebhookEvent } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Webhook } from "svix";
import { queries } from "@/lib/db";

export async function POST(req: Request) {
	const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		throw new Error(
			"Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local",
		);
	}

	const headerPayload = await headers();
	const svix_id = headerPayload.get("svix-id");
	const svix_timestamp = headerPayload.get("svix-timestamp");
	const svix_signature = headerPayload.get("svix-signature");

	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response("Error occured -- no svix headers", {
			status: 400,
		});
	}

	const body = await req.text();
	try {
		JSON.parse(body);
	} catch (_err) {
		return new Response("Error parsing body", { status: 400 });
	}

	const wh = new Webhook(WEBHOOK_SECRET);

	let evt: WebhookEvent;

	try {
		evt = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		console.error("Error verifying webhook:", err);
		return new Response("Error occured", {
			status: 400,
		});
	}

	const eventType = evt.type;

	if (eventType === "user.created") {
		const {
			id,
			email_addresses,
			first_name,
			last_name,
			image_url,
			primary_email_address_id,
		} = evt.data;

		const primaryEmailObj =
			email_addresses?.find(
				(e: { id: string; email_address: string }) =>
					e.id === primary_email_address_id,
			) || email_addresses?.[0];
		const primaryEmail = primaryEmailObj?.email_address;
		const fullName = `${first_name || ""} ${last_name || ""}`.trim();
		const name = fullName || primaryEmail?.split("@")[0] || id;

		if (primaryEmail) {
			try {
				await queries.users.create({
					clerkId: id,
					email: primaryEmail,
					name: name,
					imageUrl: image_url,
				});
				console.log(`User created in database: ${id}`);
				revalidatePath("/team");
			} catch (err) {
				console.error("Error creating user in database:", err);
				return new Response("Error creating user", { status: 500 });
			}
		}
	}

	if (eventType === "user.updated") {
		const {
			id,
			email_addresses,
			first_name,
			last_name,
			image_url,
			primary_email_address_id,
		} = evt.data;

		const primaryEmailObj =
			email_addresses?.find(
				(e: { id: string; email_address: string }) =>
					e.id === primary_email_address_id,
			) || email_addresses?.[0];
		const primaryEmail = primaryEmailObj?.email_address;
		const fullName = `${first_name || ""} ${last_name || ""}`.trim();
		const name = fullName || primaryEmail?.split("@")[0] || id;

		if (primaryEmail) {
			try {
				const result = await queries.users.update(id, {
					email: primaryEmail,
					name: name,
					imageUrl: image_url,
				});

				if (result.length === 0) {
					await queries.users.create({
						clerkId: id,
						email: primaryEmail,
						name: name,
						imageUrl: image_url,
					});
					console.log(`User fallback created in database: ${id}`);
				} else {
					console.log(`User updated in database: ${id}`);
				}
				revalidatePath("/team");
			} catch (err) {
				console.error("Error updating user in database:", err);
				return new Response("Error updating user", { status: 500 });
			}
		}
	}

	if (eventType === "user.deleted") {
		const { id } = evt.data;

		if (id) {
			try {
				await queries.users.delete(id);
				console.log(`User deleted from database: ${id}`);
			} catch (err) {
				console.error("Error deleting user from database:", err);
				return new Response("Error deleting user", { status: 500 });
			}
		}
	}

	return new Response("Webhook received", { status: 200 });
}
