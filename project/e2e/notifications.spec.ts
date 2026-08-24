import { expect, test } from "@playwright/test";

test.describe("Notification Preferences", () => {
	test.use({ storageState: "playwright/.auth/userA.json" });

	test("change preference -> refresh -> verify preference persisted", async ({
		page,
	}) => {
		await page.goto("/settings");
		await expect(
			page.getByRole("heading", { name: /settings/i }).first(),
		).toBeVisible();

		const toggle = page.getByRole("switch").first();
		if (await toggle.isVisible()) {
			const initialState = await toggle.getAttribute("aria-checked");

			await toggle.click();
			await page.waitForTimeout(500); // Wait for API response/persistence

			await page.reload();

			const newState = await page
				.getByRole("switch")
				.first()
				.getAttribute("aria-checked");
			expect(newState).not.toBe(initialState);
		}
	});
});
