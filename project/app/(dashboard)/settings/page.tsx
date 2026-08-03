import { UserProfile } from "@clerk/nextjs";
import { Bell, Palette, Shield, User } from "lucide-react";

export default function SettingsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-outer_space-500 dark:text-platinum-500">
					Settings
				</h1>
				<p className="text-paynes_gray-500 dark:text-french_gray-500 mt-2">
					Manage your account, sessions, and application preferences
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 p-6 h-fit">
					<h3 className="text-lg font-semibold text-outer_space-500 dark:text-platinum-500 mb-4">
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
								key={item.name}
								type="button"
								className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
									item.active
										? "bg-blue_munsell-100 dark:bg-blue_munsell-900 text-blue_munsell-700 dark:text-blue_munsell-300"
										: "text-outer_space-500 dark:text-platinum-500 hover:bg-platinum-500 dark:hover:bg-paynes_gray-400"
								}`}
							>
								<item.icon className="mr-3" size={16} />
								{item.name}
							</button>
						))}
					</nav>
				</div>

				<div className="lg:col-span-2">
					<div className="bg-white dark:bg-outer_space-500 rounded-lg border border-french_gray-300 dark:border-paynes_gray-400 overflow-hidden">
						<UserProfile
							appearance={{
								elements: {
									rootBox: "w-full",
									cardBox: "w-full shadow-none border-none",
									navbar: "hidden",
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
