"use client";

import { useUser } from "@clerk/nextjs";
import { Loader2, Mail, Plus, Shield } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useState } from "react";
import { updateUserProfileAction } from "@/lib/actions/user.actions";
import {
	updateNameSchema,
	updateUsernameSchema,
	validate,
} from "@/lib/validations";
import { useUIStore } from "@/stores/ui-store";
import {
	type ReverificationHandler,
	ReverificationModal,
} from "./../../../../components/ui/reverification-modal";

export function AccountSettings() {
	const { user, isLoaded } = useUser();
	const { addToast } = useUIStore();

	const [isEditingName, setIsEditingName] = useState(false);
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [isSavingName, setIsSavingName] = useState(false);

	const [isEditingUsername, setIsEditingUsername] = useState(false);
	const [username, setUsername] = useState("");
	const [isSavingUsername, setIsSavingUsername] = useState(false);

	const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

	const [isAddingEmail, setIsAddingEmail] = useState(false);
	const [newEmail, setNewEmail] = useState("");
	const [emailCode, setEmailCode] = useState("");
	const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
	const [isEmailActionLoading, setIsEmailActionLoading] = useState(false);

	const [reverificationHandler, setReverificationHandler] =
		useState<ReverificationHandler | null>(null);

	if (!isLoaded) {
		return (
			<div className="py-12 flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!user) return null;

	const startEditingName = () => {
		setFirstName(user.firstName || "");
		setLastName(user.lastName || "");
		setIsEditingName(true);
	};

	const saveName = async () => {
		const validation = validate(updateNameSchema, { firstName, lastName });
		if (!validation.success) {
			const firstError = Object.values(validation.errors)[0];
			addToast({ type: "error", message: firstError });
			return;
		}

		setIsSavingName(true);
		try {
			const res = await updateUserProfileAction(firstName, lastName);
			if (!res.success) {
				throw new Error(res.error);
			}
			await user.reload();
			setIsEditingName(false);
			addToast({ type: "success", message: "Profile updated successfully." });
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to update profile.",
			});
		} finally {
			setIsSavingName(false);
		}
	};

	const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploadingAvatar(true);
		try {
			await user.setProfileImage({ file });
			addToast({ type: "success", message: "Profile image updated." });
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to upload image.",
			});
		} finally {
			setIsUploadingAvatar(false);
		}
	};

	const handleAvatarRemove = async () => {
		setIsUploadingAvatar(true);
		try {
			await user.setProfileImage({ file: null });
			addToast({ type: "success", message: "Profile image removed." });
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to remove image.",
			});
		} finally {
			setIsUploadingAvatar(false);
		}
	};

	const startEditingUsername = () => {
		setUsername(user.username || "");
		setIsEditingUsername(true);
	};

	const saveUsername = async () => {
		const validation = validate(updateUsernameSchema, { username });
		if (!validation.success) {
			const firstError = Object.values(validation.errors)[0];
			addToast({ type: "error", message: firstError });
			return;
		}

		setIsSavingUsername(true);
		try {
			await user.update({ username });
			setIsEditingUsername(false);
			addToast({ type: "success", message: "Username updated successfully." });
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to update username.",
			});
		} finally {
			setIsSavingUsername(false);
		}
	};

	const handleAddEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newEmail) return;

		setIsEmailActionLoading(true);
		try {
			const emailAddress = await user.createEmailAddress({ email: newEmail });
			await emailAddress.prepareVerification({ strategy: "email_code" });
			setPendingEmailId(emailAddress.id);
			addToast({ type: "success", message: "Verification code sent." });
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to add email.",
			});
		} finally {
			setIsEmailActionLoading(false);
		}
	};

	const handleVerifyEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!pendingEmailId || !emailCode) return;

		setIsEmailActionLoading(true);
		try {
			const emailAddress = user.emailAddresses.find(
				(e) => e.id === pendingEmailId,
			);
			if (emailAddress) {
				await emailAddress.attemptVerification({ code: emailCode });
				addToast({ type: "success", message: "Email verified successfully." });
				setIsAddingEmail(false);
				setNewEmail("");
				setEmailCode("");
				setPendingEmailId(null);
			}
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Invalid verification code.",
			});
		} finally {
			setIsEmailActionLoading(false);
		}
	};

	const handleRemoveEmail = async (id: string) => {
		const emailAddress = user.emailAddresses.find((e) => e.id === id);
		if (!emailAddress) return;

		setIsEmailActionLoading(true);
		try {
			await emailAddress.destroy();
			addToast({ type: "success", message: "Email removed." });
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to remove email.",
			});
		} finally {
			setIsEmailActionLoading(false);
		}
	};

	const handleSetPrimaryEmail = async (id: string) => {
		setIsEmailActionLoading(true);
		try {
			await user.update({ primaryEmailAddressId: id });
			addToast({ type: "success", message: "Primary email updated." });
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to set primary email.",
			});
		} finally {
			setIsEmailActionLoading(false);
		}
	};

	const handleConnectOAuth = async (
		strategy: "oauth_google" | "oauth_github" | "oauth_microsoft",
	) => {
		try {
			await user.createExternalAccount({
				strategy,
				redirectUrl: "/sso-callback",
			});
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to connect account.",
			});
		}
	};

	const handleDisconnectOAuth = async (id: string) => {
		const externalAccount = user.externalAccounts.find((a) => a.id === id);
		if (!externalAccount) return;

		try {
			await externalAccount.destroy();
			addToast({ type: "success", message: "Account disconnected." });
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err as { errors?: { message?: string; longMessage?: string }[] })
						.errors?.[0]?.message || "Failed to disconnect account.",
			});
		}
	};

	return (
		<div className="py-2 space-y-10 max-w-3xl">
			<ReverificationModal
				handler={reverificationHandler}
				onClose={() => setReverificationHandler(null)}
			/>

			<section>
				<div className="mb-4">
					<h3 className="text-base font-semibold text-foreground">Profile</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Manage your personal information.
					</p>
				</div>
				<div className="border border-border bg-card shadow-sm rounded-xl p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
						<div className="relative group shrink-0">
							<div className="w-20 h-20 rounded-full overflow-hidden border border-border bg-muted">
								{user.hasImage ? (
									<Image
										unoptimized
										width={100}
										height={100}
										src={user.imageUrl}
										alt="Avatar"
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
										{(user.firstName || user.username || "?")
											.charAt(0)
											.toUpperCase()}
									</div>
								)}
							</div>

							<div className="mt-3 flex gap-2">
								<label className="text-xs font-medium text-primary hover:text-primary/80 cursor-pointer transition-colors relative">
									<span>Change</span>
									<input
										type="file"
										accept="image/*"
										className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
										onChange={handleAvatarUpload}
										disabled={isUploadingAvatar}
									/>
								</label>
								{user.hasImage && (
									<>
										<span className="text-muted-foreground text-xs">•</span>
										<button
											type="button"
											onClick={handleAvatarRemove}
											disabled={isUploadingAvatar}
											className="text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
										>
											Remove
										</button>
									</>
								)}
							</div>
						</div>

						<div className="flex-1 w-full">
							{isEditingName ? (
								<div className="space-y-4">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div className="space-y-1.5">
											<label
												htmlFor="fname"
												className="text-xs font-medium text-muted-foreground"
											>
												First Name
											</label>
											<input
												type="text"
												value={firstName}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setFirstName(e.target.value)
												}
												className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
											/>
										</div>
										<div className="space-y-1.5">
											<label
												htmlFor="lname"
												className="text-xs font-medium text-muted-foreground"
											>
												Last Name
											</label>
											<input
												type="text"
												value={lastName}
												onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
													setLastName(e.target.value)
												}
												className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
											/>
										</div>
									</div>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={saveName}
											disabled={isSavingName}
											className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
										>
											Save
										</button>
										<button
											type="button"
											onClick={() => setIsEditingName(false)}
											disabled={isSavingName}
											className="px-3 py-1.5 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-muted/80 transition-colors"
										>
											Cancel
										</button>
									</div>
								</div>
							) : (
								<div className="flex items-center justify-between">
									<div>
										<h4 className="text-sm font-medium text-foreground">
											Name
										</h4>
										<p className="text-sm text-foreground mt-1">
											{user.firstName || user.lastName
												? `${user.firstName || ""} ${user.lastName || ""}`
												: "Not set"}
										</p>
									</div>
									<button
										type="button"
										onClick={startEditingName}
										className="text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 bg-primary/10 rounded-md"
									>
										Update
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</section>

			<section>
				<div className="mb-4">
					<h3 className="text-base font-semibold text-foreground">Username</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Your unique application identifier.
					</p>
				</div>
				<div className="border border-border bg-card shadow-sm rounded-xl p-6">
					{isEditingUsername ? (
						<div className="space-y-4 max-w-sm">
							<div className="space-y-1.5">
								<input
									type="text"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
									placeholder="Choose a username"
								/>
							</div>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={saveUsername}
									disabled={isSavingUsername}
									className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
								>
									Save
								</button>
								<button
									type="button"
									onClick={() => setIsEditingUsername(false)}
									disabled={isSavingUsername}
									className="px-3 py-1.5 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-muted/80 transition-colors"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-foreground">
									{user.username || "Not set"}
								</p>
							</div>
							<button
								type="button"
								onClick={startEditingUsername}
								className="text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 bg-primary/10 rounded-md"
							>
								Update
							</button>
						</div>
					)}
				</div>
			</section>

			<section>
				<div className="mb-4">
					<h3 className="text-base font-semibold text-foreground">
						Email addresses
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Manage the email addresses linked to your account.
					</p>
				</div>
				<div className="border border-border bg-card shadow-sm rounded-xl divide-y divide-border">
					{user.emailAddresses.map((email) => {
						const isPrimary = user.primaryEmailAddressId === email.id;
						return (
							<div
								key={email.id}
								className="p-6 flex items-center justify-between"
							>
								<div>
									<div className="flex items-center gap-3">
										<p className="text-sm font-medium text-foreground">
											{email.emailAddress}
										</p>
										{isPrimary && (
											<span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
												Primary
											</span>
										)}
										{email.verification.status !== "verified" && (
											<span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
												Unverified
											</span>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									{!isPrimary && email.verification.status === "verified" && (
										<button
											type="button"
											onClick={() => handleSetPrimaryEmail(email.id)}
											disabled={isEmailActionLoading}
											className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
										>
											Set as primary
										</button>
									)}
									{!isPrimary && (
										<button
											type="button"
											onClick={() => handleRemoveEmail(email.id)}
											disabled={isEmailActionLoading}
											className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors px-2 py-1"
										>
											Remove
										</button>
									)}
								</div>
							</div>
						);
					})}

					<div className="p-6 bg-muted/30">
						{isAddingEmail ? (
							<form
								onSubmit={pendingEmailId ? handleVerifyEmail : handleAddEmail}
								className="space-y-4 max-w-sm"
							>
								<div className="space-y-1.5">
									<label
										htmlFor="email"
										className="text-xs font-medium text-foreground"
									>
										{pendingEmailId ? "Verification Code" : "New Email Address"}
									</label>
									{pendingEmailId ? (
										<input
											type="text"
											value={emailCode}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setEmailCode(e.target.value)
											}
											className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
											placeholder="123456"
											required
										/>
									) : (
										<input
											type="email"
											value={newEmail}
											onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
												setNewEmail(e.target.value)
											}
											className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
											placeholder="hello@example.com"
											required
										/>
									)}
								</div>
								<div className="flex gap-2">
									<button
										type="submit"
										disabled={isEmailActionLoading}
										className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
									>
										{pendingEmailId ? "Verify" : "Send code"}
									</button>
									<button
										type="button"
										onClick={() => {
											setIsAddingEmail(false);
											setPendingEmailId(null);
											setNewEmail("");
											setEmailCode("");
										}}
										disabled={isEmailActionLoading}
										className="px-3 py-1.5 bg-muted text-foreground text-sm font-medium rounded-md hover:bg-muted/80 transition-colors"
									>
										Cancel
									</button>
								</div>
							</form>
						) : (
							<button
								type="button"
								onClick={() => setIsAddingEmail(true)}
								className="flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
							>
								<Plus className="w-4 h-4 mr-1.5" />
								Add email address
							</button>
						)}
					</div>
				</div>
			</section>

			<section>
				<div className="mb-4">
					<h3 className="text-base font-semibold text-foreground">
						Connected accounts
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Connect your accounts for easier sign in.
					</p>
				</div>
				<div className="border border-border bg-card shadow-sm rounded-xl divide-y divide-border">
					{user.externalAccounts.map((account) => (
						<div
							key={account.id}
							className="p-6 flex items-center justify-between"
						>
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
									<Shield className="w-4 h-4 text-foreground/70" />
								</div>
								<div>
									<p className="text-sm font-medium text-foreground capitalize">
										{account.provider.replace("oauth_", "")}
									</p>
									<p className="text-xs text-muted-foreground">
										{account.emailAddress}
									</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => handleDisconnectOAuth(account.id)}
								className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors px-2 py-1"
							>
								Disconnect
							</button>
						</div>
					))}

					{!user.externalAccounts.some(
						(a) => (a.provider as string) === "oauth_google",
					) && (
						<div className="p-6 bg-muted/30 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
									<Mail className="w-4 h-4 text-foreground/70" />
								</div>
								<div>
									<p className="text-sm font-medium text-foreground">Google</p>
								</div>
							</div>
							<button
								type="button"
								onClick={() => handleConnectOAuth("oauth_google")}
								className="text-sm font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1"
							>
								Connect
							</button>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
