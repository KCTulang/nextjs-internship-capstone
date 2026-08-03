"use client";

import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useSignIn } from "@clerk/nextjs/legacy";
import { Eye, EyeOff, Github, Loader2, Moon, Sun, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useTheme } from "@/components/theme-provider";

function GoogleIcon() {
	return (
		<svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
			<path
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
				fill="#4285F4"
			/>
			<path
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
				fill="#34A853"
			/>
			<path
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
				fill="#FBBC05"
			/>
			<path
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
				fill="#EA4335"
			/>
		</svg>
	);
}

export default function SignInPage() {
	const { isLoaded, signIn, setActive } = useSignIn() as {
		isLoaded: boolean;
		signIn: {
			create: (params: {
				identifier: string;
				password: string;
			}) => Promise<{ status: string; createdSessionId: string | null }>;
			authenticateWithRedirect: (params: {
				strategy: string;
				redirectUrl: string;
				redirectUrlComplete: string;
			}) => Promise<void>;
		};
		setActive: (params: { session: string | null }) => Promise<void>;
	};
	const router = useRouter();
	const { theme, setTheme } = useTheme();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [oauthLoading, setOauthLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!isLoaded || !signIn) return;

		setError(null);
		setIsSubmitting(true);

		try {
			const result = await signIn.create({
				identifier: email.trim(),
				password,
			});

			if (result.status === "complete") {
				await setActive({ session: result.createdSessionId });
				router.push("/dashboard");
			}
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setError(
					err.errors[0]?.longMessage ??
						err.errors[0]?.message ??
						"Sign in failed. Please try again.",
				);
			} else {
				setError("Something went wrong. Please try again.");
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleOAuth(strategy: "oauth_google" | "oauth_github") {
		if (!isLoaded || !signIn) return;
		setOauthLoading(strategy);
		try {
			await signIn.authenticateWithRedirect({
				strategy,
				redirectUrl: "/sso-callback",
				redirectUrlComplete: "/dashboard",
			});
		} catch {
			setError("OAuth sign in failed. Please try again.");
			setOauthLoading(null);
		}
	}

	return (
		<div className="min-h-screen text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors">
			{/* Top Left: Back to Home */}
			<div className="absolute top-6 left-6 md:top-8 md:left-8 z-20">
				<Link
					href="/"
					className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
				>
					<ArrowLeft size={16} />
					Back to home
				</Link>
			</div>



			{/* Top Right: Theme Toggle */}
			<div className="absolute top-6 right-6 md:top-8 md:right-8 z-20">
				<button
					type="button"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
					className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:scale-105 transition-transform"
					aria-label="Toggle theme"
				>
					{theme === "light" ? <Moon size={20} fill="currentColor" /> : <Sun size={20} />}
				</button>
			</div>

			{/* Center Container */}
			<div className="w-full max-w-[380px] z-10 flex flex-col items-center">
				{/* Logo */}
				<div className="mb-8">
					<Image
						src="/LockInLogo.svg"
						alt="LockIn"
						width={140}
						height={36}
						className="dark:invert object-contain h-auto w-auto"
						style={{ width: "auto", height: "auto" }}
						priority
					/>
				</div>

				{/* Title */}
				<div className="mb-8 text-center w-full">
					<h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white mb-2">
						Welcome back
					</h1>
					<p className="text-sm text-slate-500 dark:text-zinc-400">
						Sign in to your LockIn account
					</p>
				</div>

				{/* OAuth Buttons */}
				<div className="flex flex-col gap-3 w-full mb-8">
					<button
						type="button"
						onClick={() => handleOAuth("oauth_google")}
						disabled={!isLoaded || oauthLoading !== null || isSubmitting}
						className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
					>
						{oauthLoading === "oauth_google" ? (
							<Loader2 size={18} className="animate-spin" />
						) : (
							<GoogleIcon />
						)}
						Continue with Google
					</button>
					<button
						type="button"
						onClick={() => handleOAuth("oauth_github")}
						disabled={!isLoaded || oauthLoading !== null || isSubmitting}
						className="flex items-center justify-center gap-3 w-full px-4 py-3 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
					>
						{oauthLoading === "oauth_github" ? (
							<Loader2 size={18} className="animate-spin" />
						) : (
							<Github size={18} />
						)}
						Continue with GitHub
					</button>
				</div>

				{/* OR Divider */}
				<div className="flex items-center gap-4 w-full mb-8">
					<div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
					<span className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
						Or
					</span>
					<div className="flex-1 h-px bg-slate-200 dark:bg-zinc-800" />
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} noValidate className="w-full space-y-5">
					{error && (
						<div
							role="alert"
							className="flex items-start gap-3 px-5 py-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm"
						>
							<span className="mt-0.5 shrink-0">⚠</span>
							<span>{error}</span>
						</div>
					)}

					<div className="space-y-2">
						<label
							htmlFor="sign-in-email"
							className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
						>
							Email address
						</label>
						<input
							id="sign-in-email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							className="w-full px-5 py-3.5 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all shadow-sm"
						/>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label
								htmlFor="sign-in-password"
								className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
							>
								Password
							</label>
							<Link
								href="/forgot-password"
								className="text-[12px] font-medium text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors"
							>
								Forgot password?
							</Link>
						</div>
						<div className="relative">
							<input
								id="sign-in-password"
								type={showPassword ? "text" : "password"}
								autoComplete="current-password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter your password"
								className="w-full px-5 py-3.5 pr-12 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all shadow-sm"
							/>
							<button
								type="button"
								onClick={() => setShowPassword((v) => !v)}
								className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-white transition-colors"
								aria-label={
									showPassword ? "Hide password" : "Show password"
								}
							>
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={!isLoaded || isSubmitting || oauthLoading !== null}
						className="w-full flex items-center justify-center gap-2 mt-4 py-3.5 px-6 rounded-full bg-[#0F172A] dark:bg-white text-white dark:text-black text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
					>
						{isSubmitting ? (
							<>
								<Loader2 size={18} className="animate-spin" />
								Signing in…
							</>
						) : (
							"Sign in"
						)}
					</button>
				</form>

				<p className="mt-8 text-center text-sm text-slate-500 dark:text-zinc-400">
					Don't have an account?{" "}
					<Link
						href="/sign-up"
						className="font-bold text-slate-900 dark:text-white hover:underline transition-all"
					>
						Sign up free
					</Link>
				</p>
				

			</div>
		</div>
	);
}
