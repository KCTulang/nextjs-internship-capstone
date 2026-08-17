"use client";

import { useUser } from "@clerk/nextjs";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useState } from "react";
import { setPasswordAction } from "@/app/actions/user";

export function SetPasswordModal() {
	const { isLoaded, user } = useUser();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const requirements = [
		{
			id: "length",
			text: "At least 8 characters",
			test: (p: string) => p.length >= 8,
		},
		{
			id: "uppercase",
			text: "At least one uppercase letter",
			test: (p: string) => /[A-Z]/.test(p),
		},
		{
			id: "lowercase",
			text: "At least one lowercase letter",
			test: (p: string) => /[a-z]/.test(p),
		},
		{
			id: "number",
			text: "At least one number",
			test: (p: string) => /[0-9]/.test(p),
		},
		{
			id: "special",
			text: "At least one special character",
			test: (p: string) => /[^A-Za-z0-9]/.test(p),
		},
	];

	const metRequirements = requirements.filter((req) => req.test(password));
	const isPasswordStrong = metRequirements.length === requirements.length;
	const passwordsMatch = password === confirmPassword;
	const strengthPercentage =
		(metRequirements.length / requirements.length) * 100;

	if (!isLoaded || !user || user.passwordEnabled) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!isPasswordStrong || !passwordsMatch) return;
		setIsSubmitting(true);
		setError(null);
		try {
			const res = await setPasswordAction(password);
			if (res.success) {
				await user.reload();
			} else {
				let errorMessage = res.error || "Failed to set password.";
				if (errorMessage === "Given password is not strong enough.") {
					errorMessage =
						"Password is too common or easily guessable. Please avoid sequences like '1234' or dictionary words.";
				}
				setError(errorMessage);
			}
		} catch (err) {
			let errorMessage =
				(err instanceof Error ? err.message : "Failed to set password.") ??
				"Failed to set password.";
			if (errorMessage === "Given password is not strong enough.") {
				errorMessage =
					"Password is too common or easily guessable. Please avoid sequences like '1234' or dictionary words.";
			}
			setError(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-100 flex items-center justify-center bg-background/95 backdrop-blur-sm">
			<div className="bg-card w-full max-w-md p-8 rounded-2xl shadow-2xl border border-border mx-4">
				<h2 className="text-2xl font-bold mb-2">Secure your account</h2>
				<p className="text-sm text-muted-foreground mb-6">
					You signed up with Google, but we require all users to have a local
					password as a fallback. Please set one now to continue to your
					dashboard.
				</p>
				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
							{error}
						</div>
					)}
					<div className="space-y-2">
						<label
							htmlFor="new-password"
							className="block text-xs font-bold uppercase tracking-widest text-muted-foreground"
						>
							New Password
						</label>
						<div className="relative">
							<input
								id="new-password"
								type={showPassword ? "text" : "password"}
								placeholder="Enter a strong password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full pl-4 pr-12 py-3 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
								required
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
							>
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
					</div>

					<div className="space-y-2 pt-2">
						<label
							htmlFor="confirm-password"
							className="block text-xs font-bold uppercase tracking-widest text-muted-foreground"
						>
							Confirm Password
						</label>
						<div className="relative">
							<input
								id="confirm-password"
								type={showConfirmPassword ? "text" : "password"}
								placeholder="Confirm your password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								className="w-full pl-4 pr-12 py-3 bg-muted/50 border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
								required
							/>
							<button
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
							>
								{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{confirmPassword && !passwordsMatch && (
							<p className="text-xs text-destructive mt-1 flex items-center gap-1">
								<X size={12} /> Passwords do not match
							</p>
						)}
					</div>

					<div className="space-y-3 pt-2">
						<div className="h-2 w-full bg-muted rounded-full overflow-hidden">
							<div
								className={`h-full transition-all duration-300 ${
									strengthPercentage < 40
										? "bg-destructive"
										: strengthPercentage < 80
											? "bg-yellow-500"
											: "bg-green-500"
								}`}
								style={{ width: `${strengthPercentage}%` }}
							/>
						</div>

						<ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
							{requirements.map((req) => {
								const isMet = req.test(password);
								return (
									<li
										key={req.id}
										className={`flex items-center gap-1.5 ${isMet ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
									>
										{isMet ? (
											<Check size={14} className="shrink-0" />
										) : (
											<X size={14} className="shrink-0 opacity-50" />
										)}
										<span>{req.text}</span>
									</li>
								);
							})}
						</ul>
					</div>

					<button
						type="submit"
						disabled={isSubmitting || !isPasswordStrong || !passwordsMatch}
						className="w-full flex justify-center items-center py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="animate-spin mr-2" size={18} />
								Saving...
							</>
						) : (
							"Set Password & Continue"
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
