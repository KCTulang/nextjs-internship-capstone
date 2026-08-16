"use client";

import {
	useClerk,
	useReverification,
	useSession,
	useUser,
} from "@clerk/nextjs";
import {
	AlertTriangle,
	Globe,
	Loader2,
	Monitor,
	Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { updatePasswordSchema, validate } from "@/lib/validations";
import { useUIStore } from "@/stores/ui-store";
import { Modal } from "./../../../../components/ui/modal";
import {
	type ReverificationHandler,
	ReverificationModal,
} from "./../../../../components/ui/reverification-modal";

export function SecuritySettings() {
	const { user, isLoaded } = useUser();
	const { session } = useSession();
	const { signOut } = useClerk();
	const router = useRouter();
	const { addToast } = useUIStore();

	type SessionItem = {
		id: string;
		revoke?: () => Promise<void>;
		lastActiveAt?: string;
		latestActivity?: {
			isMobile?: boolean;
			browserName?: string;
			osName?: string;
			ipAddress?: string;
		};
	};
	const [sessions, setSessions] = useState<SessionItem[]>([]);
	const [isLoadingSessions, setIsLoadingSessions] = useState(false);

	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [signOutOfOtherSessions, setSignOutOfOtherSessions] = useState(false);
	const [isSavingPassword, setIsSavingPassword] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [deleteConfirmation, setDeleteConfirmation] = useState("");
	const [isDeletingAccount, setIsDeletingAccount] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const [reverificationHandler, setReverificationHandler] =
		useState<ReverificationHandler | null>(null);
	const executePasswordUpdate = useReverification(
		async () => {
			await user?.updatePassword({
				currentPassword,
				newPassword,
				signOutOfOtherSessions,
			});
		},
		{
			onNeedsReverification: (params) => setReverificationHandler(params),
		},
	);

	const executeDeleteAccount = useReverification(
		async () => {
			await user?.delete();
		},
		{
			onNeedsReverification: (params) => setReverificationHandler(params),
		},
	);

	const loadSessions = useCallback(async () => {
		setIsLoadingSessions(true);
		try {
			const activeSessions = await user?.getSessions();
			if (activeSessions) {
				setSessions(
					activeSessions.map((s) => ({
						id: s.id,
						revoke: async () => {
							await s.revoke();
						},
					})),
				);
			}
		} catch (err) {
			console.error("Failed to load sessions", err);
		} finally {
			setIsLoadingSessions(false);
		}
	}, [user]);

	useEffect(() => {
		if (isLoaded && user) {
			loadSessions();
		}
	}, [isLoaded, user, loadSessions]);

	if (!isLoaded || !user) {
		return (
			<div className="py-12 flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const handleOpenPasswordModal = () => {
		setCurrentPassword("");
		setNewPassword("");
		setConfirmPassword("");
		setPasswordError(null);
		setSignOutOfOtherSessions(false);
		setIsPasswordModalOpen(true);
	};

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordError(null);

		const validation = validate(updatePasswordSchema, {
			currentPassword,
			newPassword,
			confirmPassword,
		});

		if (!validation.success) {
			const firstError = Object.values(validation.errors)[0];
			setPasswordError(firstError);
			return;
		}

		setIsSavingPassword(true);
		try {
			await executePasswordUpdate();

			addToast({ type: "success", message: "Password updated successfully." });
			setIsPasswordModalOpen(false);

			if (signOutOfOtherSessions) {
				loadSessions();
			}
		} catch (err: unknown) {
			const error = err as
				| { errors?: Array<{ message: string }> & string }
				| { message?: string };
			if (
				error &&
				typeof error === "object" &&
				"errors" in error &&
				error.errors
			) {
				setPasswordError(
					(error.errors as Array<{ message: string }>)?.[0]?.message ||
						"Failed to update password.",
				);
			} else if (error && typeof error === "object" && "message" in error) {
				setPasswordError(error.message || "Failed to update password.");
			} else {
				setPasswordError("Failed to update password.");
			}
		} finally {
			setIsSavingPassword(false);
		}
	};

	const handleRevokeSession = async (sessionId: string) => {
		try {
			const sessionToRevoke = sessions.find((s) => s.id === sessionId);
			if (sessionToRevoke && typeof sessionToRevoke.revoke === "function") {
				await sessionToRevoke.revoke();
				addToast({ type: "success", message: "Session revoked successfully." });
				loadSessions();
			}
		} catch (err) {
			addToast({
				type: "error",
				message:
					(err && typeof err === "object" && "errors" in err
						? (err.errors as Array<{ message: string }>)?.[0]?.message
						: null) || "Failed to revoke session.",
			});
		}
	};

	const handleOpenDeleteModal = () => {
		setDeleteConfirmation("");
		setDeleteError(null);
		setIsDeleteModalOpen(true);
	};

	const handleDeleteAccount = async (e: React.FormEvent) => {
		e.preventDefault();
		if (deleteConfirmation !== "delete my account") return;

		setDeleteError(null);
		setIsDeletingAccount(true);

		try {
			await executeDeleteAccount();

			await signOut();
			router.push("/sign-in");
		} catch (err) {
			const error = err as
				| { errors?: Array<{ message: string }>; clerkError?: boolean }
				| { message?: string };
			if (
				error &&
				typeof error === "object" &&
				"clerkError" in error &&
				error.clerkError
			) {
				setDeleteError(
					(error as { errors?: Array<{ message: string }> }).errors?.[0]
						?.message ||
						"Failed to delete account. Please ensure 'Allow users to delete their own account' is enabled in the Clerk Dashboard.",
				);
			} else if (error && typeof error === "object" && "message" in error) {
				setDeleteError(error.message || "Failed to delete account.");
			} else {
				setDeleteError("Failed to delete account.");
			}
			setIsDeletingAccount(false);
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
					<h3 className="text-base font-semibold text-foreground">Password</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Manage your password and authentication settings.
					</p>
				</div>
				<div className="border border-border bg-card shadow-sm rounded-xl p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="space-y-1.5">
							<div className="flex items-center gap-2">
								<p className="text-sm font-medium text-foreground">
									Password Authentication
								</p>
								{user.passwordEnabled ? (
									<span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
										Enabled
									</span>
								) : (
									<span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-wider">
										Not Set
									</span>
								)}
							</div>
							{user.passwordEnabled ? (
								<p className="text-sm text-muted-foreground">
									Your password is securely managed and cannot be displayed.
								</p>
							) : (
								<p className="text-sm text-muted-foreground">
									You have not set a password for this account.
								</p>
							)}
						</div>
						<button
							type="button"
							onClick={handleOpenPasswordModal}
							className="text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 bg-primary/10 rounded-md whitespace-nowrap"
						>
							{user.passwordEnabled ? "Update password" : "Set password"}
						</button>
					</div>
				</div>
			</section>

			<section>
				<div className="mb-4">
					<h3 className="text-base font-semibold text-foreground">
						Active devices
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Manage devices that are currently logged in to your account.
					</p>
				</div>
				<div className="border border-border bg-card shadow-sm rounded-xl divide-y divide-border">
					{isLoadingSessions ? (
						<div className="p-6 flex justify-center">
							<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
						</div>
					) : sessions.length === 0 ? (
						<div className="p-6 flex flex-col items-center justify-center text-center">
							<Monitor className="w-10 h-10 text-muted-foreground/30 mb-3" />
							<p className="text-sm font-medium text-foreground">
								No active devices found
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								It looks like you don't have any active sessions right now.
							</p>
						</div>
					) : (
						sessions.map((s) => {
							const isCurrentSession = session?.id === s.id;
							const deviceType = s.latestActivity?.isMobile
								? "mobile"
								: "desktop";

							return (
								<div
									key={s.id}
									className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
								>
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
											{deviceType === "mobile" ? (
												<Smartphone className="w-5 h-5 text-muted-foreground" />
											) : (
												<Monitor className="w-5 h-5 text-muted-foreground" />
											)}
										</div>
										<div>
											<div className="flex items-center gap-2">
												<p className="text-sm font-medium text-foreground">
													{s.latestActivity?.browserName || "Unknown Browser"}{" "}
													on {s.latestActivity?.osName || "Unknown OS"}
												</p>
												{isCurrentSession && (
													<span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
														This device
													</span>
												)}
											</div>
											<div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
												<span className="flex items-center">
													<Globe className="w-3 h-3 mr-1" />
													{s.latestActivity?.ipAddress || "Unknown IP"}
												</span>
												<span>•</span>
												<span>
													Last active{" "}
													{s.lastActiveAt
														? new Date(s.lastActiveAt).toLocaleDateString()
														: "Unknown"}
												</span>
											</div>
										</div>
									</div>
									{!isCurrentSession && (
										<button
											type="button"
											onClick={() => handleRevokeSession(s.id)}
											className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors px-3 py-1.5"
										>
											Revoke
										</button>
									)}
								</div>
							);
						})
					)}
				</div>
			</section>

			<section>
				<div className="mb-4">
					<h3 className="text-base font-semibold text-foreground">
						Delete account
					</h3>
					<p className="text-sm text-muted-foreground mt-1">
						Permanently delete your account and all of its data.
					</p>
				</div>
				<div className="border border-destructive/20 bg-destructive/5 shadow-sm rounded-xl p-6">
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
						<div className="max-w-md">
							<p className="text-sm font-medium text-destructive">
								Danger Zone
							</p>
							<p className="text-sm text-destructive/80 mt-1">
								Once you delete your account, there is no going back. Please be
								certain.
							</p>
						</div>
						<button
							type="button"
							onClick={handleOpenDeleteModal}
							className="text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors px-4 py-2 bg-destructive rounded-md whitespace-nowrap"
						>
							Delete account
						</button>
					</div>
				</div>
			</section>

			{/* Password Modal */}
			<Modal
				isOpen={isPasswordModalOpen}
				onClose={() => !isSavingPassword && setIsPasswordModalOpen(false)}
				title="Update Password"
			>
				<h2 className="text-lg font-semibold text-foreground mb-4">
					Update Password
				</h2>
				<form onSubmit={handleUpdatePassword} className="space-y-4">
					<div className="space-y-1.5">
						<label
							htmlFor="dummy"
							className="text-sm font-medium text-foreground"
						>
							Current Password
						</label>
						<input
							type="password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
							required
						/>
					</div>
					<div className="space-y-1.5">
						<label
							htmlFor="dummy"
							className="text-sm font-medium text-foreground"
						>
							New Password
						</label>
						<input
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
							required
						/>
					</div>
					<div className="space-y-1.5">
						<label
							htmlFor="dummy"
							className="text-sm font-medium text-foreground"
						>
							Confirm New Password
						</label>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
							required
						/>
					</div>

					<div className="flex items-center gap-2 pt-2">
						<input
							type="checkbox"
							id="signOutOfOtherSessions"
							checked={signOutOfOtherSessions}
							onChange={(e) => setSignOutOfOtherSessions(e.target.checked)}
							className="rounded border-input text-primary focus:ring-primary"
						/>
						<label
							htmlFor="signOutOfOtherSessions"
							className="text-sm text-foreground"
						>
							Sign out of all other devices
						</label>
					</div>

					{passwordError && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
							{passwordError}
						</div>
					)}

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={() => setIsPasswordModalOpen(false)}
							disabled={isSavingPassword}
							className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted text-foreground transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSavingPassword}
							className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-opacity disabled:opacity-50"
						>
							{isSavingPassword ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Saving...
								</>
							) : (
								"Update Password"
							)}
						</button>
					</div>
				</form>
			</Modal>

			<Modal
				isOpen={isDeleteModalOpen}
				onClose={() => !isDeletingAccount && setIsDeleteModalOpen(false)}
				title="Delete Account"
			>
				<div className="flex items-start gap-4 mb-4">
					<div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
						<AlertTriangle size={20} />
					</div>
					<div>
						<h2 className="text-lg font-semibold text-foreground">
							Delete Account
						</h2>
						<p className="text-sm text-muted-foreground mt-1">
							This action cannot be undone. This will permanently delete your
							account and all associated data.
						</p>
					</div>
				</div>

				<form onSubmit={handleDeleteAccount} className="space-y-4">
					<div className="space-y-1.5 mt-2">
						<label
							htmlFor="dummy"
							className="text-sm font-medium text-foreground"
						>
							Type <span className="font-bold">delete my account</span> to
							confirm
						</label>
						<input
							type="text"
							value={deleteConfirmation}
							onChange={(e) => setDeleteConfirmation(e.target.value)}
							className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:border-ring transition-all"
							placeholder="delete my account"
							required
						/>
					</div>

					{deleteError && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
							{deleteError}
						</div>
					)}

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={() => setIsDeleteModalOpen(false)}
							disabled={isDeletingAccount}
							className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted text-foreground transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={
								isDeletingAccount || deleteConfirmation !== "delete my account"
							}
							className="inline-flex items-center px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:bg-destructive/90 transition-opacity disabled:opacity-50"
						>
							{isDeletingAccount ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Deleting...
								</>
							) : (
								"Permanently Delete"
							)}
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
}
