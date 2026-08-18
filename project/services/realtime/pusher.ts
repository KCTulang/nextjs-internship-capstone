import PusherServer from "pusher";
import PusherClient from "pusher-js";

export const pusherServer = new PusherServer({
	appId: process.env.PUSHER_APP_ID || "dummy-app-id",
	key: process.env.NEXT_PUBLIC_PUSHER_KEY || "dummy-key",
	secret: process.env.PUSHER_SECRET || "dummy-secret",
	cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
	useTLS: true,
});

let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
	if (typeof window === "undefined") return null;

	if (!pusherClientInstance) {
		pusherClientInstance = new PusherClient(
			process.env.NEXT_PUBLIC_PUSHER_KEY || "dummy-key",
			{
				cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
				authEndpoint: "/api/pusher/auth",
			},
		);
	}
	return pusherClientInstance;
};
