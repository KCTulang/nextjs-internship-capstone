import { UserProfile } from "@clerk/nextjs";
import { Bell, Palette, Shield, User } from "lucide-react";

export default function SettingsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-foreground">Settings</h1>
				<p className="text-muted-foreground mt-2">
					Manage your account, sessions, and application preferences
				</p>
			</div>

			{/* Settings Sections */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Settings Navigation */}
				<div className="bg-card rounded-lg border border-border p-6 h-fit">
					<h3 className="text-lg font-semibold text-foreground mb-4">
						Settings
					</h3>
					<nav className="space-y-2">
						{[
							{ name: "Account & Profile", icon: User, active: true },
							{ name: "Notifications", icon: Bell, active: false },
							{ name: "Security", icon: Shield, active: false },
							{ name: "Appearance", icon: Palette, active: false },
						].map((item) => (
							<button
								type="button"
								key={item.name}
								className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
									item.active
										? "bg-primary dark:bg-primary text-primary dark:text-primary"
										: "text-foreground hover:bg-muted"
								}`}
							>
								<item.icon className="mr-3" size={16} />
								{item.name}
							</button>
						))}
					</nav>
				</div>

				{/* Settings Content */}
				<div className="lg:col-span-2">
					{/* Clerk UserProfile handles Profile, Security, and Session Management */}
					<div className="bg-card rounded-lg border border-border overflow-hidden">
						<UserProfile
							appearance={{
								elements: {
									rootBox: "w-full",
									cardBox: "w-full shadow-none border-none",
									navbar: "hidden", // We can hide Clerk's side navbar to use our own layout, or keep it. Let's keep it default for a full settings experience.
								},
							}}
							routing="hash"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
