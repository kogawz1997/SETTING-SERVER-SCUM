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

  await expect(page.locator('#onboarding-wizard')).toBeVisible();
  await expect(page.locator('#onboarding-wizard')).toContainText(/First-run onboarding|ตัวช่วยตั้งค่าครั้งแรก|à¸•à¸±à¸§à¸Šà¹ˆà¸§à¸¢/);
  await expect(page.locator('.onboarding-step')).toHaveCount(7);
  await expect(page.locator('#onboarding-sample')).toBeVisible();
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
  await expect(booleanField.locator('option').first()).toContainText('เปิดใช้งาน');
  await expect(booleanField.locator('option').nth(1)).toContainText('ปิดใช้งาน');
});

test('server settings route uses Thai UI labels even from an old English session', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('scum_lang', 'en'));
  await page.goto(`${baseUrl}/server-settings`, { waitUntil: 'networkidle' });

  await expect(page.locator('#page-title')).toHaveText('ตั้งค่าเซิร์ฟเวอร์');
  await expect(page.locator('#server-title')).toHaveText('ตั้งค่าเซิร์ฟเวอร์แบบแยกช่อง');
  await expect(page.locator('#server-hint')).toContainText('กรอง');
  await expect(page.locator('#server-field-filter')).toHaveAttribute('placeholder', 'กรองคีย์...');
  await expect(page.locator('#reload-server-parsed')).toHaveText('รีโหลด');
  await expect(page.locator('#save-server-parsed')).toHaveText('บันทึก');
  await expect(page.locator('#save-server-parsed-reload')).toHaveText('บันทึก + รีโหลด');

  await expect(page.locator('.server-guide-panel')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.server-guide-panel')).toContainText('เริ่มจากหมวดเดียวก่อน');
  await expect(page.locator('.server-guide-panel')).toContainText('ฟิลด์ที่เห็น');
  await expect(page.locator('.server-section-card summary h4').filter({ hasText: 'ทั่วไป' })).toBeVisible();
  await page.locator('#server-section-filter').selectOption('General');
  await expect(page.locator('.field-card').filter({ hasText: 'ชื่อเซิร์ฟเวอร์' }).first()).toBeVisible();
  await expect(page.locator('.field-card').filter({ hasText: 'จำนวนผู้เล่นสูงสุด' }).first()).toBeVisible();

  const firstBooleanSection = await page.locator('[data-field-kind="boolean"]').first().getAttribute('data-server-section');
  await page.locator('#server-section-filter').selectOption(firstBooleanSection);
  const booleanField = page.locator(`[data-field-kind="boolean"][data-server-section="${firstBooleanSection}"]`).first();
  await expect(booleanField.locator('option').first()).toHaveText('เปิดใช้งาน');
  await expect(booleanField.locator('option').nth(1)).toHaveText('ปิดใช้งาน');

  await expect(page.locator('#view-server')).not.toContainText(/Parsed Server Settings|Filter keys|Start with one section first|Enabled \(True\)|Disabled \(False\)|All sections|All groups/);
});
