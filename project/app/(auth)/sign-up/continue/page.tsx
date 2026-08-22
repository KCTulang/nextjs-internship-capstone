"use client";

import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useSignUp } from "@clerk/nextjs/legacy";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

export default function SignUpContinuePage() {
	const { isLoaded, signUp, setActive } = useSignUp();
	const router = useRouter();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

	const [formData, setFormData] = useState<Record<string, string>>({
		firstName: signUp?.firstName || "",
		lastName: signUp?.lastName || "",
		email: signUp?.emailAddress || "",
	});

	const missingFields = (signUp?.missingFields as string[]) || [];
	const genuinelyMissingFields = missingFields.filter((field) => {
		if (field === "first_name" && signUp?.firstName) return false;
		if (field === "last_name" && signUp?.lastName) return false;
		if (field === "email_address" && signUp?.emailAddress) return false;
		return true;
	});

	useEffect(() => {
		if (isLoaded && signUp) {
			if (signUp.status === "complete") {
				if (signUp.createdSessionId) {
					setActive({ session: signUp.createdSessionId }).then(() =>
						router.push("/dashboard"),
					);
				} else {
					router.push("/dashboard");
				}
			} else if (signUp.status !== "missing_requirements") {
				router.push("/sign-up");
			}
		}
	}, [isLoaded, signUp, router, setActive]);

	useEffect(() => {
		async function handleAutoSubmit() {
			if (!signUp) return;
			setIsSubmitting(true);
			try {
				const updateParams: Parameters<typeof signUp.update>[0] = {};
				if (missingFields.includes("first_name"))
					updateParams.firstName = signUp.firstName || "";
				if (missingFields.includes("last_name"))
					updateParams.lastName = signUp.lastName || "";
				if (missingFields.includes("email_address"))
					updateParams.emailAddress = signUp.emailAddress || "";

				const result = await signUp.update(updateParams);

				if (result.status === "complete") {
					await setActive({ session: result.createdSessionId });
					router.push("/dashboard");
				}
			} catch (err: unknown) {
				if (isClerkAPIResponseError(err)) {
					setError(
						err.errors?.[0]?.longMessage ??
							err.errors?.[0]?.message ??
							"Something went wrong.",
					);
				} else if (err instanceof Error) {
					setError(err.message);
				} else {
					setError("Something went wrong.");
				}
			} finally {
				setIsSubmitting(false);
			}
		}

		if (
			isLoaded &&
			signUp &&
			signUp.status === "missing_requirements" &&
			genuinelyMissingFields.length === 0 &&
			!isSubmitting &&
			!error
		) {
			handleAutoSubmit();
		}
	}, [
		isLoaded,
		signUp,
		genuinelyMissingFields.length,
		isSubmitting,
		error,
		missingFields,
		setActive,
		router,
	]);

	if (signUp && signUp.status !== "missing_requirements") {
		return null;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!signUp) return;

		setError(null);
		setIsSubmitting(true);
		setFieldErrors({});

		const errors: Record<string, string[]> = {};
		if (
			genuinelyMissingFields.includes("first_name") &&
			!formData.firstName?.trim()
		) {
			errors.firstName = ["First name is required"];
		}
		if (
			genuinelyMissingFields.includes("last_name") &&
			!formData.lastName?.trim()
		) {
			errors.lastName = ["Last name is required"];
		}
		if (
			genuinelyMissingFields.includes("email_address") &&
			!formData.email?.trim()
		) {
			errors.email = ["Email is required"];
		}
		if (
			genuinelyMissingFields.includes("password") &&
			!formData.password?.trim()
		) {
			errors.password = ["Password is required"];
		}

		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			setIsSubmitting(false);
			return;
		}

		try {
			const updateParams: Parameters<typeof signUp.update>[0] = {};
			if (missingFields.includes("first_name"))
				updateParams.firstName =
					formData.firstName?.trim() || signUp.firstName || "";
			if (missingFields.includes("last_name"))
				updateParams.lastName =
					formData.lastName?.trim() || signUp.lastName || "";
			if (missingFields.includes("email_address"))
				updateParams.emailAddress =
					formData.email?.trim() || signUp.emailAddress || "";
			if (missingFields.includes("password"))
				updateParams.password = formData.password;

			const result = await signUp.update(updateParams);

			if (result.status === "complete") {
				await setActive({ session: result.createdSessionId });
				router.push("/dashboard");
			}
		} catch (err: unknown) {
			if (isClerkAPIResponseError(err)) {
				setError(
					err.errors?.[0]?.longMessage ??
						err.errors?.[0]?.message ??
						"Something went wrong.",
				);
			} else if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("Something went wrong.");
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-4">
			<div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 p-8 flex flex-col items-center">
				{!isLoaded || !signUp ? (
					<Loader2 className="w-8 h-8 animate-spin text-slate-400 my-12" />
				) : genuinelyMissingFields.length === 0 ? (
					<div className="flex flex-col items-center gap-4 my-8">
						<Loader2 className="w-8 h-8 animate-spin text-slate-400" />
						<p className="text-sm text-slate-500 font-medium">
							Completing your account...
						</p>
						{error && (
							<p className="text-sm text-red-500 font-medium">{error}</p>
						)}
					</div>
				) : (
					<div className="w-full">
						<div className="text-center mb-8">
							<h1 className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white mb-2">
								Almost there
							</h1>
							<p className="text-sm text-slate-500 dark:text-zinc-400">
								Please provide the missing information to complete your account.
							</p>
						</div>

						{error && (
							<div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
								<p className="text-sm text-red-600 dark:text-red-400 font-medium">
									{error}
								</p>
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-4">
							{genuinelyMissingFields.includes("first_name") && (
								<div className="space-y-2">
									<label
										htmlFor="first_name"
										className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
									>
										First Name
									</label>
									<input
										id="first_name"
										type="text"
										value={formData.firstName || ""}
										onChange={(e) =>
											setFormData({ ...formData, firstName: e.target.value })
										}
										className={`w-full px-5 py-3.5 rounded-full border ${
											fieldErrors.firstName
												? "border-red-500"
												: "border-slate-200 dark:border-zinc-800"
										} bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all`}
										placeholder="Jane"
									/>
									{fieldErrors.firstName && (
										<p className="text-xs text-red-500 font-medium pl-2">
											{fieldErrors.firstName[0]}
										</p>
									)}
								</div>
							)}

							{genuinelyMissingFields.includes("last_name") && (
								<div className="space-y-2">
									<label
										htmlFor="last_name"
										className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
									>
										Last Name
									</label>
									<input
										id="last_name"
										type="text"
										value={formData.lastName || ""}
										onChange={(e) =>
											setFormData({ ...formData, lastName: e.target.value })
										}
										className={`w-full px-5 py-3.5 rounded-full border ${
											fieldErrors.lastName
												? "border-red-500"
												: "border-slate-200 dark:border-zinc-800"
										} bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all`}
										placeholder="Doe"
									/>
									{fieldErrors.lastName && (
										<p className="text-xs text-red-500 font-medium pl-2">
											{fieldErrors.lastName[0]}
										</p>
									)}
								</div>
							)}

							{genuinelyMissingFields.includes("email_address") && (
								<div className="space-y-2">
									<label
										htmlFor="email_address"
										className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
									>
										Email address
									</label>
									<input
										id="email_address"
										type="email"
										value={formData.email || ""}
										onChange={(e) =>
											setFormData({ ...formData, email: e.target.value })
										}
										className={`w-full px-5 py-3.5 rounded-full border ${
											fieldErrors.email
												? "border-red-500"
												: "border-slate-200 dark:border-zinc-800"
										} bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all`}
										placeholder="you@example.com"
									/>
									{fieldErrors.email && (
										<p className="text-xs text-red-500 font-medium pl-2">
											{fieldErrors.email[0]}
										</p>
									)}
								</div>
							)}

							{genuinelyMissingFields.includes("password") && (
								<div className="space-y-2">
									<label
										htmlFor="password"
										className="block text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-zinc-400"
									>
										Password
									</label>
									<input
										id="password"
										type="password"
										value={formData.password || ""}
										onChange={(e) =>
											setFormData({ ...formData, password: e.target.value })
										}
										className={`w-full px-5 py-3.5 rounded-full border ${
											fieldErrors.password
												? "border-red-500"
												: "border-slate-200 dark:border-zinc-800"
										} bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all`}
										placeholder="Create a password"
									/>
									{fieldErrors.password && (
										<p className="text-xs text-red-500 font-medium pl-2">
											{fieldErrors.password[0]}
										</p>
									)}
								</div>
							)}

							<button
								type="submit"
								disabled={isSubmitting}
								className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[15px] font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 mt-4"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="w-5 h-5 animate-spin" />
										Saving...
									</>
								) : (
									"Complete Account"
								)}
							</button>
						</form>
					</div>
				)}
			</div>
		</div>
	);
}
