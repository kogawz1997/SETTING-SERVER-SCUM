const { test, expect } = require('@playwright/test');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

test('settings command helper shows the wired reload command as ready', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="settings"]').click();

  await expect(page.locator('#settings-command-assist')).toBeVisible();
  await expect(page.locator('.command-assist-card')).toHaveCount(2);

  const reloadCard = page.locator('.command-assist-card').filter({ hasText: /Reload loot command|คำสั่งรีโหลดลูท/ }).first();
  await expect(reloadCard).toContainText(/Ready|พร้อม/i);

  await reloadCard.locator('summary').click();
  await reloadCard.locator('[data-check-command="reload"]').click();

  await expect(reloadCard).toContainText(/Ready|พร้อมรัน|configured file path/i);
  await expect(page.locator('#cfg-reload-cmd')).toHaveValue(/reload-scum-loot\.cmd/i);
});

test('settings setup wizard summarizes path and command readiness', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="settings"]').click();

  await expect(page.locator('#setup-wizard-panel')).toBeVisible();
  await expect(page.locator('#setup-wizard-panel')).toContainText(/Setup Wizard/);
  await expect(page.locator('#setup-wizard-panel .wizard-check')).toHaveCount(8);
  await page.locator('#wizard-check-now').click();
  await expect(page.locator('#setup-wizard-panel')).toContainText(/Nodes folder|Spawners folder/);
});
