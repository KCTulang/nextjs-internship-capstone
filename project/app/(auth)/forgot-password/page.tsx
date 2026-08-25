"use client";

import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useSignIn } from "@clerk/nextjs/legacy";
import type { SignInResource } from "@clerk/nextjs/types";
import { ArrowLeft, Eye, EyeOff, Loader2, Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, Suspense, useRef, useState } from "react";
import { z } from "zod";
import { useTheme } from "@/components/theme-provider";

const emailSchema = z.object({
	email: z.string().email("Enter a valid email address."),
});

const resetSchema = z
	.object({
		code: z.string().min(1, "Enter the verification code."),
		password: z.string().min(8, "Password must be at least 8 characters."),
		confirmPassword: z.string().min(1, "Confirm your new password."),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match.",
		path: ["confirmPassword"],
	});

type Stage = "email" | "code";

export default function ForgotPasswordPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center text-slate-500">
					Loading...
				</div>
			}
		>
			<ForgotPasswordContent />
		</Suspense>
	);
}

function ForgotPasswordContent() {
	const { isLoaded, signIn, setActive } = useSignIn();
	const router = useRouter();
	const { theme, setTheme } = useTheme();

	const [stage, setStage] = useState<Stage>("email");
	const [sentEmail, setSentEmail] = useState("");

	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [codeError, setCodeError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [confirmPasswordError, setConfirmPasswordError] = useState<
		string | null
	>(null);

	const submissionLock = useRef(false);

	function clearErrors() {
		setError(null);
		setEmailError(null);
		setCodeError(null);
		setPasswordError(null);
		setConfirmPasswordError(null);
	}

	function showClerkError(
		err: unknown,
		fallback: string,
		fallbackField?: "email" | "code" | "password",
	) {
		if (!isClerkAPIResponseError(err)) {
			setError(fallback);
			return;
		}

		const clerkErr = err.errors[0];
		const message = clerkErr?.longMessage ?? clerkErr?.message ?? fallback;
		const parameter = clerkErr?.meta?.paramName;
		const errorCode = clerkErr?.code ?? "";
		const field =
			parameter === "identifier" || errorCode.includes("identifier")
				? "email"
				: parameter === "code" || errorCode.includes("code")
					? "code"
					: parameter === "password" || errorCode.includes("password")
						? "password"
						: fallbackField;

		if (field === "email") setEmailError(message);
		else if (field === "code") setCodeError(message);
		else if (field === "password") setPasswordError(message);
		else setError(message);
	}

	async function completeReset(result: SignInResource): Promise<boolean> {
		if (!setActive) {
			setError("Authentication is still loading. Please try again.");
			return false;
		}
		if (!result.createdSessionId) {
			setError("Reset completed without a session. Please try again.");
			return false;
		}
		await setActive({ session: result.createdSessionId });
		router.replace("/dashboard");
		router.refresh();
		return true;
	}

	async function handleSendCode(e: FormEvent) {
		e.preventDefault();
		if (!isLoaded || !signIn || submissionLock.current) return;

		clearErrors();

		const parsed = emailSchema.safeParse({ email: email.trim() });
		if (!parsed.success) {
			setEmailError(
				parsed.error.flatten().fieldErrors.email?.[0] ??
					"Enter a valid email address.",
			);
			return;
		}

		submissionLock.current = true;
		setIsSubmitting(true);
		try {
			const result = await signIn.create({
				strategy: "reset_password_email_code",
				identifier: email.trim(),
			});

			if (result.status === "needs_first_factor") {
				setSentEmail(email.trim());
				setCode("");
				setPassword("");
				setConfirmPassword("");
				setStage("code");
			} else {
				setError(
					"Could not send a reset code. Please check your email and try again.",
				);
			}
		} catch (err) {
			showClerkError(
				err,
				"Failed to send reset code. Please try again.",
				"email",
			);
		} finally {
			submissionLock.current = false;
			setIsSubmitting(false);
		}
	}

	async function handleReset(e: FormEvent) {
		e.preventDefault();
		if (!isLoaded || !signIn || submissionLock.current) return;

		clearErrors();

		const parsed = resetSchema.safeParse({ code, password, confirmPassword });
		if (!parsed.success) {
			const fieldErrors = parsed.error.flatten().fieldErrors;
			if (fieldErrors.code?.[0]) setCodeError(fieldErrors.code[0]);
			if (fieldErrors.password?.[0]) setPasswordError(fieldErrors.password[0]);
			if (fieldErrors.confirmPassword?.[0])
				setConfirmPasswordError(fieldErrors.confirmPassword[0]);
			return;
		}

		submissionLock.current = true;
		setIsSubmitting(true);
		try {
			const result = await signIn.attemptFirstFactor({
				strategy: "reset_password_email_code",
				code: code.trim(),
				password,
			});

			if (result.status === "complete") {
				await completeReset(result);
				return;
			}

			if (result.status === "needs_new_password") {
				const fallback = await signIn.resetPassword({ password });
				if (fallback.status === "complete" && fallback.createdSessionId) {
					await completeReset(fallback);
				} else {
					setError("Password reset could not be completed. Please try again.");
				}
				return;
			}

			if (result.status === "needs_second_factor") {
				setError("Additional verification is required to reset your password.");
				return;
			}

			if (result.status === "needs_client_trust") {
				setError(
					"Additional security verification is required. Please try signing in again.",
				);
				return;
			}

			if (result.status === "needs_protect_check") {
				setError(
					"Additional security verification is required. Please try again.",
				);
				return;
			}

			setError("Password reset could not be completed. Please try again.");
		} catch (err) {
			showClerkError(err, "Password reset failed. Please try again.");
		} finally {
			submissionLock.current = false;
			setIsSubmitting(false);
		}
	}

	return (
		<div className="min-h-screen text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors">
			<div className="absolute top-6 left-6 md:top-8 md:left-8 z-20">
				<Link
					href="/"
					className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
				>
					<ArrowLeft size={16} />
					Back to home
				</Link>
			</div>

			<div className="absolute top-6 right-6 md:top-8 md:right-8 z-20">
				<button
					type="button"
					onClick={() => setTheme(theme === "light" ? "dark" : "light")}
					className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg hover:scale-105 transition-transform"
					aria-label="Toggle theme"
				>
					{theme === "light" ? (
						<Moon size={20} fill="currentColor" />
					) : (
						<Sun size={20} />
					)}
				</button>
			</div>

			<div className="w-full max-w-95 z-10 flex flex-col items-center">
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

				{stage === "email" ? (
					<>
						<div className="mb-8 text-center w-full">
							<h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white mb-2">
								Forgot your password?
							</h1>
							<p className="text-sm text-slate-500 dark:text-zinc-400">
								Enter your email and we'll send you a verification code.
							</p>
						</div>

						<form
							onSubmit={handleSendCode}
							noValidate
							className="w-full space-y-5"
						>
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
									htmlFor="forgot-email"
									className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
								>
									Email address
								</label>
								<input
									id="forgot-email"
									type="email"
									autoComplete="email"
									required
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										setEmailError(null);
									}}
									aria-invalid={Boolean(emailError)}
									aria-describedby={
										emailError ? "forgot-email-error" : undefined
									}
									placeholder="you@example.com"
									className="w-full px-5 py-3.5 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all shadow-sm"
								/>
								{emailError && (
									<p
										id="forgot-email-error"
										className="px-2 text-sm text-red-600 dark:text-red-400"
									>
										{emailError}
									</p>
								)}
							</div>

							<button
								type="submit"
								disabled={!isLoaded || isSubmitting}
								className="w-full flex items-center justify-center gap-2 mt-4 py-3.5 px-6 rounded-full bg-[#0F172A] dark:bg-white text-white dark:text-black text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
							>
								{isSubmitting ? (
									<>
										<Loader2 size={18} className="animate-spin" />
										Sending…
									</>
								) : (
									"Send Code"
								)}
							</button>
						</form>

						<p className="mt-8 text-center text-sm text-slate-500 dark:text-zinc-400">
							Remember your password?{" "}
							<Link
								href="/sign-in"
								className="font-bold text-slate-900 dark:text-white hover:underline transition-all"
							>
								Sign in
							</Link>
						</p>
					</>
				) : (
					<>
						<div className="mb-8 text-center w-full">
							<h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white mb-2">
								Check your email
							</h1>
							<p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
								We sent a verification code to{" "}
								<span className="font-bold text-slate-900 dark:text-white">
									{sentEmail}
								</span>
							</p>
						</div>

						<form
							onSubmit={handleReset}
							noValidate
							className="w-full space-y-5"
						>
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
									htmlFor="forgot-code"
									className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
								>
									Verification code
								</label>
								<input
									id="forgot-code"
									type="text"
									inputMode="numeric"
									autoComplete="one-time-code"
									maxLength={6}
									required
									value={code}
									onChange={(e) => {
										setCode(e.target.value.replace(/\D/g, ""));
										setCodeError(null);
									}}
									aria-invalid={Boolean(codeError)}
									aria-describedby={codeError ? "forgot-code-error" : undefined}
									placeholder="123456"
									className="w-full px-5 py-4 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-lg text-center tracking-[0.5em] placeholder:text-slate-400 dark:placeholder:text-zinc-600 placeholder:tracking-normal focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all shadow-sm font-mono"
								/>
								{codeError && (
									<p
										id="forgot-code-error"
										className="px-2 text-sm text-red-600 dark:text-red-400"
									>
										{codeError}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<label
									htmlFor="forgot-password"
									className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
								>
									New password
								</label>
								<div className="relative">
									<input
										id="forgot-password"
										type={showPassword ? "text" : "password"}
										autoComplete="new-password"
										required
										value={password}
										onChange={(e) => {
											setPassword(e.target.value);
											setPasswordError(null);
										}}
										aria-invalid={Boolean(passwordError)}
										aria-describedby={
											passwordError ? "forgot-password-error" : undefined
										}
										placeholder="At least 8 characters"
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
								{passwordError && (
									<p
										id="forgot-password-error"
										className="px-2 text-sm text-red-600 dark:text-red-400"
									>
										{passwordError}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<label
									htmlFor="forgot-confirm-password"
									className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
								>
									Confirm password
								</label>
								<div className="relative">
									<input
										id="forgot-confirm-password"
										type={showConfirmPassword ? "text" : "password"}
										autoComplete="new-password"
										required
										value={confirmPassword}
										onChange={(e) => {
											setConfirmPassword(e.target.value);
											setConfirmPasswordError(null);
										}}
										aria-invalid={Boolean(confirmPasswordError)}
										aria-describedby={
											confirmPasswordError
												? "forgot-confirm-password-error"
												: undefined
										}
										placeholder="Re-enter your password"
										className="w-full px-5 py-3.5 pr-12 rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.3)] dark:focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all shadow-sm"
									/>
									<button
										type="button"
										onClick={() => setShowConfirmPassword((v) => !v)}
										className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-white transition-colors"
										aria-label={
											showConfirmPassword
												? "Hide confirm password"
												: "Show confirm password"
										}
									>
										{showConfirmPassword ? (
											<EyeOff size={18} />
										) : (
											<Eye size={18} />
										)}
									</button>
								</div>
								{confirmPasswordError && (
									<p
										id="forgot-confirm-password-error"
										className="px-2 text-sm text-red-600 dark:text-red-400"
									>
										{confirmPasswordError}
									</p>
								)}
							</div>

							<button
								type="submit"
								disabled={!isLoaded || isSubmitting}
								className="w-full flex items-center justify-center gap-2 mt-4 py-3.5 px-6 rounded-full bg-[#0F172A] dark:bg-white text-white dark:text-black text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
							>
								{isSubmitting ? (
									<>
										<Loader2 size={18} className="animate-spin" />
										Resetting…
									</>
								) : (
									"Reset Password"
								)}
							</button>
						</form>

						<button
							type="button"
							disabled={isSubmitting}
							onClick={() => {
								setStage("email");
								setCode("");
								setPassword("");
								setConfirmPassword("");
								clearErrors();
							}}
							className="mt-6 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
						>
							← Back
						</button>
					</>
				)}
			</div>
		</div>
	);
}
