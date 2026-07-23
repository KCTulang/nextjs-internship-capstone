// TODO: Task 2.2 - Configure authentication middleware for route protection

// NOTE: Next.js 16+ - The "middleware" file convention is deprecated.
// When implementing authentication, consider using the new "proxy" pattern.
// Learn more: https://nextjs.org/docs/messages/middleware-to-proxy

// Placeholder middleware - currently allows all routes for development
// TODO: Replace with actual Clerk authMiddleware when authentication is implemented
//export default function middleware() {
// TODO: Implement actual authentication middleware
// For now, allow all routes so interns can navigate and see the mock pages
//	console.log("TODO: Implement Clerk authentication middleware");

// Return undefined to allow all requests through
//	return undefined;
//}

//export const config = {
// TODO: Update matcher when implementing actual authentication
// For now, don't match any routes to allow free navigation
//	matcher: [],
//};

/*
TODO: Task 2.2 Implementation Notes for Interns:
- Install and configure Clerk
- Set up authMiddleware to protect routes
- Configure public routes: ["/", "/sign-in", "/sign-up"]
- Protect all dashboard routes: ["/dashboard", "/projects"]
- Add proper redirects for unauthenticated users

Example implementation when ready:
export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up"],
  ignoredRoutes: [],
})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}
*/

import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for Clerk's auto-proxy path
		"/__clerk/:path*",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
