const { test, expect } = require('@playwright/test');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

test('backups support tags, notes, compare, and activity filtering', async ({ page }) => {
  const stamp = Date.now();
  const tag = `codex-${stamp}`;
  const first = await page.request.post(`${baseUrl}/api/backup`, { data: { tag, note: `first ${stamp}` } });
  const second = await page.request.post(`${baseUrl}/api/backup`, { data: { tag, note: `second ${stamp}` } });
  expect(first.ok()).toBeTruthy();
  expect(second.ok()).toBeTruthy();
  const firstBackup = await first.json();
  const secondBackup = await second.json();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="backups"]').click();
  await expect(page.locator('#backup-control-panel')).toBeVisible();
  await page.locator('#backup-tag-filter').selectOption(tag);
  await expect(page.locator('#backups-list')).toContainText(tag);

  await page.locator(`[data-backup="${secondBackup.backupPath}"]`).click();
  await expect(page.locator('#backup-compare-panel')).toBeVisible();
  await page.locator('#backup-compare-target').selectOption(firstBackup.backupPath);
  await page.locator('#compare-backup-summary').click();
  await expect(page.locator('#backup-file-preview')).toContainText(/Backup compare|added=|changed=/);

  await page.locator('.nav[data-view="activity"]').click();
  await expect(page.locator('#activity-filter-panel')).toBeVisible();
  await page.locator('#activity-term-filter').fill(tag);
  await page.locator('#activity-apply-filter').click();
  await expect(page.locator('#activity-log')).toContainText(tag);
});

test('backup cleanup previews and deletes old unprotected backups', async ({ page }) => {
  const stamp = Date.now();
  const tag = `cleanup-${stamp}`;
  const protectedTag = 'keep';
  const created = [];
  for (let index = 0; index < 4; index += 1) {
    const response = await page.request.post(`${baseUrl}/api/backup`, {
      data: { tag: index === 0 ? protectedTag : tag, note: `cleanup ${stamp} ${index}` }
    });
    expect(response.ok()).toBeTruthy();
    created.push(await response.json());
    await page.waitForTimeout(1100);
  }

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="backups"]').click();
  await expect(page.locator('#backup-control-panel')).toBeVisible();
  await page.locator('#backup-cleanup-keep').fill('1');
  await page.locator('#backup-cleanup-tag').selectOption(tag);
  await page.locator('#preview-backup-cleanup').click();
  await expect(page.locator('#backup-cleanup-result')).toContainText(/Will delete|จะลบ/);
  await expect(page.locator('#backup-cleanup-result')).toContainText('2');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#apply-backup-cleanup').click();
  await expect(page.locator('#backup-cleanup-result')).toContainText(/Deleted|ลบแล้ว/);

  const list = await page.request.get(`${baseUrl}/api/backups`);
  const data = await list.json();
  const names = new Set((data.backups || []).map((backup) => backup.name));
  expect(names.has(created[0].backupPath)).toBeTruthy();
  expect(names.has(created[3].backupPath)).toBeTruthy();

  await page.locator('.nav[data-view="activity"]').click();
  await page.locator('#activity-term-filter').fill('backup_cleanup');
  await page.locator('#activity-apply-filter').click();
  await expect(page.locator('#activity-log')).toContainText('backup_cleanup');
});
