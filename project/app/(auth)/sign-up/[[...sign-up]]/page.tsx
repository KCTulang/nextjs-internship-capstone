"use client";

import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useSignUp } from "@clerk/nextjs/legacy";
import { Eye, EyeOff, Github, Loader2, Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useTheme } from "@/components/theme-provider";

function AuthGlow() {
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 overflow-hidden"
		>
			<div
				className="absolute rounded-full blur-[120px]"
				style={{
					width: "80%",
					height: "80%",
					top: "10%",
					left: "10%",
					background:
						"radial-gradient(ellipse, rgba(147,197,253,0.38) 0%, rgba(96,165,250,0.2) 50%, transparent 72%)",
					animation: "glow-float 12s ease-in-out infinite",
				}}
			/>
			<div
				className="absolute rounded-full blur-[80px]"
				style={{
					width: "45%",
					height: "45%",
					bottom: "5%",
					right: "-5%",
					background:
						"radial-gradient(ellipse, rgba(56,189,248,0.22) 0%, transparent 70%)",
					animation: "glow-drift 16s ease-in-out infinite",
					animationDelay: "-5s",
				}}
			/>
		</div>
	);
}

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

type Stage = "register" | "verify";

export default function SignUpPage() {
	const { isLoaded, signUp, setActive } = useSignUp();
	const router = useRouter();
	const { theme, setTheme } = useTheme();

	const [stage, setStage] = useState<Stage>("register");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [code, setCode] = useState("");

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [oauthLoading, setOauthLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleRegister(e: FormEvent) {
		e.preventDefault();
		if (!isLoaded || !signUp) return;

		setError(null);
		setIsSubmitting(true);

		try {
			await signUp.create({
				emailAddress: email.trim(),
				password,
			});

			await signUp.prepareEmailAddressVerification({
				strategy: "email_code",
			});

			setStage("verify");
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setError(
					err.errors[0]?.longMessage ??
						err.errors[0]?.message ??
						"Sign up failed. Please try again.",
				);
			} else {
				setError("Something went wrong. Please try again.");
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleVerify(e: FormEvent) {
		e.preventDefault();
		if (!isLoaded || !signUp) return;

		setError(null);
		setIsSubmitting(true);

		try {
			const result = await signUp.attemptEmailAddressVerification({ code });

			if (result.status === "complete") {
				await setActive({ session: result.createdSessionId });
				router.push("/dashboard");
			}
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setError(
					err.errors[0]?.longMessage ??
						err.errors[0]?.message ??
						"Verification failed. Please check your code.",
				);
			} else {
				setError("Something went wrong. Please try again.");
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleResend() {
		if (!isLoaded || !signUp) return;
		setError(null);
		try {
			await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
		} catch (err) {
			if (isClerkAPIResponseError(err)) {
				setError(err.errors[0]?.message ?? "Could not resend code.");
			}
		}
	}

	async function handleOAuth(strategy: "oauth_google" | "oauth_github") {
		if (!isLoaded || !signUp) return;
		setOauthLoading(strategy);
		try {
			await signUp.authenticateWithRedirect({
				strategy,
				redirectUrl: "/sso-callback",
				redirectUrlComplete: "/dashboard",
			});
		} catch {
			setError("OAuth sign up failed. Please try again.");
			setOauthLoading(null);
		}
	}

	return (
		<div className="min-h-screen bg-background text-foreground flex">
			<div className="relative flex flex-1 flex-col items-center justify-center px-4 sm:px-8 py-12 overflow-hidden">
				<div className="lg:hidden absolute inset-0">
					<AuthGlow />
				</div>

				<div className="relative z-10 w-full max-w-sm">
					<div className="flex items-center justify-between mb-8">
						<div className="lg:hidden">
							<Image
								src="/LockLogo.svg"
								alt="LockIn"
								width={22}
								height={40}
								className="h-auto dark:invert"
								priority
							/>
						</div>
						<div className="lg:hidden" />
						<button
							type="button"
							onClick={() => setTheme(theme === "light" ? "dark" : "light")}
							className="p-2 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted transition-colors ml-auto"
							aria-label="Toggle theme"
						>
							{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
						</button>
					</div>

					<div className="bg-card border border-border rounded-2xl p-7 shadow-xl shadow-primary/5">
						{stage === "register" ? (
							<>
								<div className="mb-6">
									<h1 className="text-2xl font-bold tracking-tight text-foreground">
										Create your account
									</h1>
									<p className="text-sm text-muted-foreground mt-1">
										Your best work starts here.
									</p>
								</div>

								<div className="flex flex-col gap-2.5 mb-5">
									<button
										type="button"
										onClick={() => handleOAuth("oauth_google")}
										disabled={
											!isLoaded || oauthLoading !== null || isSubmitting
										}
										className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{oauthLoading === "oauth_google" ? (
											<Loader2 size={16} className="animate-spin" />
										) : (
											<GoogleIcon />
										)}
										Continue with Google
									</button>
									<button
										type="button"
										onClick={() => handleOAuth("oauth_github")}
										disabled={
											!isLoaded || oauthLoading !== null || isSubmitting
										}
										className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{oauthLoading === "oauth_github" ? (
											<Loader2 size={16} className="animate-spin" />
										) : (
											<Github size={16} />
										)}
										Continue with GitHub
									</button>
								</div>

								<div className="flex items-center gap-3 mb-5">
									<div className="flex-1 h-px bg-border" />
									<span className="text-xs text-muted-foreground uppercase tracking-wider">
										or
									</span>
									<div className="flex-1 h-px bg-border" />
								</div>

								<form
									onSubmit={handleRegister}
									noValidate
									className="space-y-4"
								>
									{error && (
										<div
											role="alert"
											className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
										>
											<span className="mt-0.5 shrink-0">⚠</span>
											<span>{error}</span>
										</div>
									)}

									<div className="space-y-1.5">
										<label
											htmlFor="sign-up-email"
											className="block text-sm font-medium text-foreground"
										>
											Email address
										</label>
										<input
											id="sign-up-email"
											type="email"
											autoComplete="email"
											required
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="you@example.com"
											className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-shadow"
										/>
									</div>

									<div className="space-y-1.5">
										<label
											htmlFor="sign-up-password"
											className="block text-sm font-medium text-foreground"
										>
											Password
										</label>
										<div className="relative">
											<input
												id="sign-up-password"
												type={showPassword ? "text" : "password"}
												autoComplete="new-password"
												required
												value={password}
												onChange={(e) => setPassword(e.target.value)}
												placeholder="Create a password"
												className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-shadow"
											/>
											<button
												type="button"
												onClick={() => setShowPassword((v) => !v)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
												aria-label={
													showPassword ? "Hide password" : "Show password"
												}
											>
												{showPassword ? (
													<EyeOff size={16} />
												) : (
													<Eye size={16} />
												)}
											</button>
										</div>
										<p className="text-xs text-muted-foreground">
											Must be at least 8 characters.
										</p>
									</div>

									<button
										type="submit"
										disabled={
											!isLoaded || isSubmitting || oauthLoading !== null
										}
										className="w-full flex items-center justify-center gap-2 mt-1 py-2.5 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
									>
										{isSubmitting ? (
											<>
												<Loader2 size={16} className="animate-spin" />
												Creating account…
											</>
										) : (
											"Create account"
										)}
									</button>
								</form>

								<p className="mt-5 text-center text-xs text-muted-foreground">
									Already have an account?{" "}
									<Link
										href="/sign-in"
										className="font-semibold text-foreground hover:text-primary transition-colors"
									>
										Sign in
									</Link>
								</p>
							</>
						) : (
							<>
								<div className="mb-6 text-center">
									<div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary text-xl mb-4">
										✉
									</div>
									<h1 className="text-2xl font-bold tracking-tight text-foreground">
										Check your email
									</h1>
									<p className="text-sm text-muted-foreground mt-2 leading-relaxed">
										We sent a 6-digit verification code to{" "}
										<span className="font-medium text-foreground">{email}</span>
									</p>
								</div>

								<form onSubmit={handleVerify} noValidate className="space-y-4">
									{error && (
										<div
											role="alert"
											className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
										>
											<span className="mt-0.5 shrink-0">⚠</span>
											<span>{error}</span>
										</div>
									)}

									<div className="space-y-1.5">
										<label
											htmlFor="verify-code"
											className="block text-sm font-medium text-foreground"
										>
											Verification code
										</label>
										<input
											id="verify-code"
											type="text"
											inputMode="numeric"
											autoComplete="one-time-code"
											maxLength={6}
											required
											value={code}
											onChange={(e) =>
												setCode(e.target.value.replace(/\D/g, ""))
											}
											placeholder="123456"
											className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm text-center tracking-[0.5em] placeholder:text-muted-foreground/60 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-shadow font-mono"
										/>
									</div>

									<button
										type="submit"
										disabled={!isLoaded || isSubmitting || code.length !== 6}
										className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
									>
										{isSubmitting ? (
											<>
												<Loader2 size={16} className="animate-spin" />
												Verifying…
											</>
										) : (
											"Verify email"
										)}
									</button>
								</form>

								<div className="mt-5 flex flex-col items-center gap-2">
									<p className="text-xs text-muted-foreground">
										Didn't get the code?{" "}
										<button
											type="button"
											onClick={handleResend}
											className="font-semibold text-foreground hover:text-primary transition-colors"
										>
											Resend
										</button>
									</p>
									<button
										type="button"
										onClick={() => {
											setStage("register");
											setCode("");
											setError(null);
										}}
										className="text-xs text-muted-foreground hover:text-foreground transition-colors"
									>
										← Back to registration
									</button>
								</div>
							</>
						)}
					</div>

					<div className="flex lg:hidden justify-center mt-6">
						<Link
							href="/"
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							← Back to LockIn
						</Link>
					</div>
				</div>
			</div>

			<div className="hidden lg:flex relative flex-1 flex-col items-center justify-center px-12 overflow-hidden border-l border-border">
				<AuthGlow />
				<div className="relative z-10 flex flex-col items-center text-center gap-8 max-w-xs">
					<Image
						src="/LockInLogo.svg"
						alt="LockIn"
						width={320}
						height={140}
						className="w-full h-auto dark:invert"
						priority
					/>
					<div className="space-y-2">
						<h2 className="text-xl font-bold text-foreground tracking-tight">
							Your best work starts here.
						</h2>
						<p className="text-muted-foreground text-sm leading-relaxed">
							Join teams that use LockIn to ship faster, stay focused, and
							execute deliverables without the noise.
						</p>
					</div>
				</div>
				<div className="absolute bottom-8 left-0 right-0 flex justify-center">
					<Link
						href="/"
						className="text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						← Back to LockIn
					</Link>
				</div>
			</div>
		</div>
	);
}
