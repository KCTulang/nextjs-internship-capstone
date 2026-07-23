import { SignUp } from "@clerk/nextjs";

// TODO: Task 2.3 - Create sign-in and sign-up pages
export default function SignUpPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-platinum-900 dark:bg-outer_space-600 px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500 mb-2">
						Create Account
					</h1>
					<p className="text-paynes_gray-500 dark:text-french_gray-400">
						Join our project management platform
					</p>
				</div>

				{/* TODO: Task 2.3 - Replace with actual Clerk SignUp component */}
				<SignUp />
			</div>
		</div>
	);
}

/*
TODO: Task 2.3 Implementation Notes:
- Import SignUp from @clerk/nextjs
- Configure sign-up redirects
- Style to match design system
- Add proper error handling
- Set up webhook for user data sync (Task 2.5)
*/
