"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * SSO Callback page — Clerk handles the OAuth callback automatically.
 * This page is the `redirectUrl` destination after OAuth redirect.
 * Clerk's AuthenticateWithRedirectCallback completes the session and
 * then redirects to `redirectUrlComplete` (/dashboard).
 */
export default function SSOCallbackPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<AuthenticateWithRedirectCallback />
		</div>
	);
}
