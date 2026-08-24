import { expect, test } from "@playwright/test";

test.describe
	.serial("Team & Invitation Workflow", () => {
		const runId = Date.now();
		const projectName = `[E2E-Team-${runId}] Test Project`;
		const emailB = "e2e_user_b+clerk_test@example.com";

		test.describe("User A invites User B", () => {
			test.use({ storageState: "playwright/.auth/userA.json" });

			test("User A creates project and invites User B", async ({ page }) => {
				await page.goto("/dashboard");
				await expect(page.locator(".animate-pulse")).toHaveCount(0, {
					timeout: 15000,
				});

				await page.click('button:has-text("New Project")');
				await page
					.getByLabel(/Project Name/i)
					.first()
					.fill(projectName);
				await page.click('button[type="submit"]');

				await page.getByRole("link", { name: projectName }).click();
				await page.waitForURL(/\/projects\/.*/);

				await page.click('button[title="Team Members"]');

				const inviteInput = page.getByLabel(/Email Address/i).first();
				await expect(inviteInput).toBeVisible();
				await page
					.getByLabel(/Select Project/i)
					.selectOption({ label: projectName });
				await inviteInput.fill(emailB);
				await page.click('button:has-text("Send Invite")');
				await expect(
					page.getByText(/Member invited successfully/i),
				).toBeVisible();
			});
		});

		test.describe("User B accepts invitation", () => {
			test.use({ storageState: "playwright/.auth/userB.json" });

			test("User B sees invitation and accepts", async ({ page }) => {
				await page.goto("/dashboard");

				const invitationsLink = page.getByRole("link", {
					name: /invitations/i,
				});
				if (await invitationsLink.isVisible()) {
					await invitationsLink.click();
				} else {
					await page.goto("/team?tab=my-invitations"); // Fallback
				}

				await expect(page.getByText(projectName).first()).toBeVisible();

				const inviteCard = page
					.locator(".bg-card")
					.filter({ hasText: projectName })
					.first();
				await inviteCard.locator('button:has-text("Accept")').click();
				await expect(page.getByText(/Invitation accepted/i)).toBeVisible();

				await page.goto("/projects");
				try {
					await page
						.getByRole("link", { name: projectName })
						.click({ timeout: 15000 });
				} catch (e) {
					console.error("Failed to find project link. Page content:");
					console.error(await page.content());
					throw e;
				}
				await page.waitForURL(/\/projects\/.*/);
			});
		});
	});
