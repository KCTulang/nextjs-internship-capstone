import { UserProfile } from "@clerk/nextjs";

export default function Test() {
	return (
		<UserProfile
			appearance={{
				elements: {
					navbar: "hidden",
					navbarMobileMenuRow: "hidden",
				},
			}}
		/>
	);
}
