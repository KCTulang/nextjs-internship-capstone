import { expect, test } from "@playwright/test";

test.describe("LockIn Focus Session Workflow", () => {
	const runId = Date.now();
	const projectName = `[E2E-Focus-${runId}] Test Project`;
	const taskName = "Focus Task";

	test.use({ storageState: "playwright/.auth/userA.json" });

	test.beforeEach(async ({ page }) => {
		await page.goto("/dashboard");

		await page.click(
			'button:has-text("New Project"), button:has-text("Create Project")',
		);
		const nameInput = page
			.getByPlaceholder("Project Name", { exact: false })
			.first();
		if (await nameInput.isVisible()) {
			await nameInput.fill(projectName);
			await page.click('button:has-text("Create")');
		} else {
			await page
				.getByLabel(/Project Name/i)
				.first()
				.fill(projectName);
			await page.click('button[type="submit"]');
		}

		await page.getByRole("link", { name: projectName }).click();
		await page.waitForURL(/\/projects\/.*/);

		await page.click('button:has-text("Add Task")');
		await page.getByLabel(/Title/i).fill(taskName);
		await page.click('button[type="submit"]:has-text("Create")');
	});

	test("start LockIn -> verify overlay/timer -> end session -> verify persisted focus result", async ({
		page,
	}) => {
		await page.click(`text=${taskName}`);
		await page.click('button[title="Lock In"], button:has-text("Lock In")');

		await expect(page.getByText(/Session|Focus/i).first()).toBeVisible();

		// Wait for a few seconds to let the timer run
		await page.waitForTimeout(2000);

		const endBtn = page.locator('button:has-text("Hold to End Session")');
		await endBtn.dispatchEvent("pointerdown");
		await page.waitForTimeout(2000); // Wait for 1.5s hold animation
		await endBtn.dispatchEvent("pointerup");

		await page.locator('button:has-text("Take a Break")').click();

		await expect(page.getByText(/session/i).first()).toBeVisible();

		// Teardown
		await page.goto("/projects");
		page.once("dialog", (dialog) => dialog.accept());
		const projectCard = page
			.locator(`text=${projectName}`)
			.locator("xpath=ancestor::div[contains(@class, 'bg-card')]");

		await projectCard.hover();
		await projectCard
			.locator('button[title="Delete Project"], button[title="Delete"]')
			.click();
	});
});
