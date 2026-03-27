import { test, expect } from "@playwright/test";

test("Expo web shell responds", async ({ request }) => {
  const res = await request.get("/");
  expect(res.ok()).toBeTruthy();
});

test("root page has body", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
