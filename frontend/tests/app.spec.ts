import { expect, test } from "@playwright/test";

test("renders login screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "برنامج إدارة KULTUR" })).toBeVisible();
  await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
});
