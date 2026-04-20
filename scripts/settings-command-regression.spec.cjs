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

test('server settings explain fields and boolean choices in human labels', async ({ page }) => {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="server"]').click();

  await expect(page.locator('.server-guide-panel')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.server-guide-panel')).toContainText(/Start with one section|เริ่มจากหมวดเดียว/);
  await expect(page.locator('.server-field-help').first()).toBeVisible();

  const firstBooleanSection = await page.locator('[data-field-kind="boolean"]').first().getAttribute('data-server-section');
  await page.locator('#server-section-filter').selectOption(firstBooleanSection);

  const booleanField = page.locator(`[data-field-kind="boolean"][data-server-section="${firstBooleanSection}"]`).first();
  await expect(booleanField).toBeVisible();
  await expect(booleanField.locator('option').first()).toContainText(/Enabled \(True\)|เปิด \(True\)/);
  await expect(booleanField.locator('option').nth(1)).toContainText(/Disabled \(False\)|ปิด \(False\)/);
});
