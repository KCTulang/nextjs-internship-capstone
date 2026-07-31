import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-foreground mb-2">
						Create Account
					</h1>
					<p className="text-muted-foreground">
						Join our project management platform
					</p>
				</div>

				<SignUp />
			</div>
		</div>
	);
}

/*
TODO: Task 2.5 - Set up webhook for user data sync
*/
