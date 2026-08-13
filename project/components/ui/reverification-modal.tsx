"use client";

import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "./modal";

export interface ReverificationHandler {
	level?: string;
	complete: () => void;
	cancel: () => void;
}

interface ReverificationModalProps {
	handler: ReverificationHandler | null;
	onClose: () => void;
}

export function ReverificationModal({
	handler,
	onClose,
}: ReverificationModalProps) {
	const { user } = useUser();
	const [password, setPassword] = useState("");
	const [isVerifying, setIsVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || !handler) return;

		setIsVerifying(true);
		setError(null);

		try {
			const isValid = await (
				user as unknown as {
					verifyPassword: (args: { password: string }) => Promise<boolean>;
				}
			).verifyPassword({ password });

			if (isValid) {
				handler.complete();
				onClose();
			} else {
				setError("Incorrect password");
			}
		} catch (err) {
			const errorMessage =
				(err as Error & { errors?: Array<{ message: string }> })?.errors?.[0]
					?.message || "Verification failed";
			setError(errorMessage);
		} finally {
			setIsVerifying(false);
		}
	};

	const handleClose = () => {
		if (handler) handler.cancel();
		onClose();
	};

	return (
		<Modal
			isOpen={!!handler}
			onClose={handleClose}
			title="Verify your identity"
		>
			<h2 className="text-lg font-semibold text-foreground mb-1">
				Verify your identity
			</h2>
			<p className="text-sm text-muted-foreground mb-6">
				For your security, please enter your password to continue.
			</p>

			<form onSubmit={handleVerify} className="space-y-4">
				<div className="space-y-2">
					<label
						htmlFor="reverification-password"
						className="text-sm font-medium text-foreground"
					>
						Password
					</label>
					<input
						id="reverification-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full bg-background border border-input text-foreground rounded-md px-3 py-2 focus:ring-2 focus:ring-ring focus:border-ring transition-all"
						placeholder="Enter your current password"
						required
					/>
				</div>

				{error && (
					<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
						{error}
					</div>
				)}

				<div className="flex justify-end gap-3 pt-2">
					<button
						type="button"
						onClick={handleClose}
						disabled={isVerifying}
						className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted text-foreground transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isVerifying || !password}
						className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-opacity disabled:opacity-50"
					>
						{isVerifying ? (
							<>
								<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								Verifying...
							</>
						) : (
							"Continue"
						)}
					</button>
				</div>
			</form>
		</Modal>
	);
}
