import fs from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";

const clerkClient = createClerkClient({
	secretKey: process.env.CLERK_SECRET_KEY,
});

setup("authenticate User A", async ({ page }) => {
	await clerkSetup();

	const emailA = "e2e_user_a+clerk_test@example.com";
	const pwd = "E2e_Test_Password_987654321!";

	const existingA = await clerkClient.users.getUserList({
		emailAddress: [emailA],
	});
	if (existingA.data.length === 0) {
		await clerkClient.users.createUser({
			emailAddress: [emailA],
			password: pwd,
			firstName: "Test",
			lastName: "UserA",
			skipPasswordChecks: true,
		});
	} else {
		await clerkClient.users.updateUser(existingA.data[0].id, {
			password: pwd,
			skipPasswordChecks: true,
		});
	}

	await page.goto("/");

	// Clerk will redirect to /sign-in automatically if we try to access a protected route, or we can go directly
	await page.goto("/sign-in");

	const emailInput = page.locator(
		'input[type="email"], input[name="identifier"]',
	);
	await expect(emailInput.first()).toBeVisible({ timeout: 15000 });

	const pwdInput = page.locator(
		'input[type="password"], input[name="password"]',
	);
	await expect(pwdInput.first()).toBeVisible({ timeout: 15000 });

	await emailInput.first().fill(emailA);
	await pwdInput.first().fill(pwd);

	const signInBtn = page.getByRole("button", {
		name: "Sign in",
		exact: true,
	});
	await expect(signInBtn).toBeEnabled();
	await signInBtn.click();

	// Handle optional device verification
	const otpInput = page.getByRole("textbox", { name: /verification code/i });
	await Promise.race([
		page.waitForURL(/\/dashboard/, { timeout: 30000 }),
		otpInput.waitFor({ state: "visible", timeout: 30000 }).then(async () => {
			await otpInput.fill("424242");
			await page.keyboard.press("Enter");
			await page.waitForURL(/\/dashboard/, { timeout: 30000 });
		}),
	]);

	if (!fs.existsSync("playwright/.auth")) {
		fs.mkdirSync("playwright/.auth", { recursive: true });
	}
	await page.context().storageState({ path: "playwright/.auth/userA.json" });

	const browser = page.context().browser();
	if (browser) {
		const freshContext = await browser.newContext({
			storageState: "playwright/.auth/userA.json",
		});
		const freshPage = await freshContext.newPage();
		await freshPage.goto("/dashboard");
		await expect(freshPage).toHaveURL(/\/dashboard/);
		await freshContext.close();
	}
});

setup("authenticate User B", async ({ page }) => {
	await clerkSetup();

	const emailB = "e2e_user_b+clerk_test@example.com";
	const pwd = "E2e_Test_Password_987654321!";

	const existingB = await clerkClient.users.getUserList({
		emailAddress: [emailB],
	});
	if (existingB.data.length === 0) {
		await clerkClient.users.createUser({
			emailAddress: [emailB],
			password: pwd,
			firstName: "Test",
			lastName: "UserB",
			skipPasswordChecks: true,
		});
	} else {
		await clerkClient.users.updateUser(existingB.data[0].id, {
			password: pwd,
			skipPasswordChecks: true,
		});
	}

	await page.goto("/sign-in");

	const emailInput = page.locator(
		'input[type="email"], input[name="identifier"]',
	);
	await expect(emailInput.first()).toBeVisible({ timeout: 15000 });

	const pwdInput = page.locator(
		'input[type="password"], input[name="password"]',
	);
	await expect(pwdInput.first()).toBeVisible({ timeout: 15000 });

	await emailInput.first().fill(emailB);
	await pwdInput.first().fill(pwd);

	const signInBtn = page.getByRole("button", {
		name: "Sign in",
		exact: true,
	});
	await expect(signInBtn).toBeEnabled();
	await signInBtn.click();

	// Handle optional device verification
	const otpInput = page.getByRole("textbox", { name: /verification code/i });
	await Promise.race([
		page.waitForURL(/\/dashboard/, { timeout: 30000 }),
		otpInput.waitFor({ state: "visible", timeout: 30000 }).then(async () => {
			await otpInput.fill("424242");
			await page.keyboard.press("Enter");
			await page.waitForURL(/\/dashboard/, { timeout: 30000 });
		}),
	]);
	await page.context().storageState({ path: "playwright/.auth/userB.json" });

	// Verify the storage state is reusable
	const browser = page.context().browser();
	if (browser) {
		const freshContext = await browser.newContext({
			storageState: "playwright/.auth/userB.json",
		});
		const freshPage = await freshContext.newPage();
		await freshPage.goto("/dashboard");
		await expect(freshPage).toHaveURL(/\/dashboard/);
		await freshContext.close();
	}
});
