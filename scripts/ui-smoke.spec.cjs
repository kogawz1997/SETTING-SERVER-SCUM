const { test, expect } = require('@playwright/test');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const views = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'settings', label: 'App Settings' },
  { id: 'server', label: 'Server Settings' },
  { id: 'corefiles', label: 'Core Files' },
  { id: 'loot', label: 'Loot Studio' },
  { id: 'analyzer', label: 'Analyzer' },
  { id: 'graph', label: 'Graph' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'backups', label: 'Backups' },
  { id: 'activity', label: 'Activity' },
  { id: 'help', label: 'Help' },
  { id: 'diff', label: 'Diff Preview' }
];

async function collectOverflowIssues(page, viewId) {
  return page.evaluate((targetViewId) => {
    const active = document.getElementById(`view-${targetViewId}`);
    if (!active || !active.classList.contains('active')) return ['View is not active'];
    const issues = [];
    const width = document.documentElement.clientWidth;
    const nodes = Array.from(active.querySelectorAll('*'));
    for (const node of nodes) {
      if (node.closest('.graph-viewport')) continue;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rects = node.getClientRects();
      if (!rects.length) continue;
      const rect = rects[0];
      if (rect.right > width + 2) {
        const label = node.id
          ? `#${node.id}`
          : `${node.tagName.toLowerCase()}${node.classList.length ? `.${Array.from(node.classList).slice(0, 2).join('.')}` : ''}`;
        issues.push(`${label} overflows by ${Math.round(rect.right - width)}px`);
        if (issues.length >= 10) break;
      }
    }
    return issues;
  }, viewId);
}

async function runViewportSweep(page, viewport, suffix) {
  await page.setViewportSize(viewport);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  for (const view of views) {
    await page.locator(`.nav[data-view="${view.id}"]`).click();
    await page.waitForTimeout(200);
    await expect(page.locator(`#view-${view.id}`)).toBeVisible();
    const issues = await collectOverflowIssues(page, view.id);
    expect(issues, `${view.label} has layout overflow issues: ${issues.join('; ')}`).toEqual([]);
    await page.screenshot({ path: `artifacts/ui-smoke/${suffix}-${view.id}.png`, fullPage: true });
  }
}

test('desktop views render without horizontal overflow', async ({ page }) => {
  await runViewportSweep(page, { width: 1440, height: 1200 }, 'desktop');
});

test('dashboard readiness preflight renders actionable checks', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await expect(page.locator('#view-dashboard .hero')).not.toContainText(/landfill|betrayed|explodes/);
  await expect(page.locator('#view-dashboard .hero')).toContainText(/applying changes|apply/);
  await expect(page.locator('#readiness-panel')).toBeVisible();
  await expect(page.locator('#readiness-panel details.assist-collapse')).toBeVisible({ timeout: 60000 });
  await page.locator('#readiness-panel details.assist-collapse > summary').click();
  await expect(page.locator('.readiness-score')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#quick-start-panel')).toBeVisible();
  await page.locator('#quick-start-panel details.assist-collapse > summary').click();
  await expect(page.locator('.quick-start-step')).toHaveCount(7);
  await page.locator('[data-quick-view="settings"]').first().click();
  await expect(page.locator('#view-settings')).toBeVisible();
  await page.locator('.nav[data-view="dashboard"]').click();
  await expect(page.locator('#diagnostics-panel')).toBeVisible();
  await page.locator('#diagnostics-panel details.assist-collapse > summary').click();
  await page.locator('#diagnostics-include-paths').uncheck();
  await page.locator('#generate-diagnostics').click();
  await expect(page.locator('#diagnostics-output')).toContainText(/"readiness"|"loot"/);
  await page.locator('#readiness-refresh').click();
  await expect(page.locator('.readiness-check').first()).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#readiness-panel')).toContainText(/Preflight|พร้อมใช้|PRODUCTION READY/);
});

test('top-level routes open the matching page and support browser history', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/loot`, { waitUntil: 'networkidle' });

  await expect(page.locator('#view-loot')).toBeVisible();
  await expect(page).toHaveURL(/\/loot-studio$/);
  await expect(page.locator('.nav[data-view="loot"]')).toHaveClass(/active/);

  await page.locator('.nav[data-view="settings"]').click();
  await expect(page.locator('#view-settings')).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);

  await page.goBack();
  await expect(page.locator('#view-loot')).toBeVisible();
  await expect(page).toHaveURL(/\/loot-studio$/);

  await page.goForward();
  await expect(page.locator('#view-settings')).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);

  await page.goto(`${baseUrl}/corefiles`, { waitUntil: 'networkidle' });
  await expect(page.locator('#view-corefiles')).toBeVisible();
  await expect(page).toHaveURL(/\/core-files$/);
});

test('thai mode renders readable app copy without mojibake artifacts', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('scum_lang', 'th'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await expect(page.locator('#page-title')).toContainText('แดชบอร์ด');
  await expect(page.locator('#view-dashboard .hero')).toContainText('ตรวจความพร้อม');
  await expect(page.locator('body')).not.toContainText(/à¸|à¹|â€¦|â†|Â·/);

  await page.locator('.nav[data-view="loot"]').click();
  await expect(page.locator('#view-loot')).toBeVisible();
  await expect(page.locator('#loot-workspace-title')).toContainText('พื้นที่ทำงานลูท');
  await expect(page.locator('#view-loot')).not.toContainText(/à¸|à¹|â€¦|â†|Â·/);
});

test('help route explains setup and loot editing in plain Thai', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('scum_lang', 'th'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${baseUrl}/help`, { waitUntil: 'networkidle' });

  await expect(page.locator('#view-help')).toBeVisible();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.locator('.nav[data-view="help"]')).toHaveClass(/active/);
  await expect(page.locator('#help-quick-path')).toContainText('เริ่มใช้งานจริง');
  await expect(page.locator('#help-loot-guide')).toContainText('Nodes');
  await expect(page.locator('#help-loot-guide')).toContainText('Spawners');
  await expect(page.locator('#help-save-guide')).toContainText('Preview Diff');
  await expect(page.locator('#help-flow-map')).toBeVisible();
  await expect(page.locator('#help-flow-map .help-flow-step')).toHaveCount(5);
});

test('mobile views render without horizontal overflow', async ({ page }) => {
  await runViewportSweep(page, { width: 430, height: 932 }, 'mobile');
});

test('graph view has interactive focus and zoom controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="graph"]').click();
  await page.locator('#refresh-graph').click();

  await expect(page.locator('.graph-toolbar')).toBeVisible();
  await expect(page.locator('.graph-help-strip')).toBeVisible();
  await expect(page.locator('.graph-viewport')).toBeVisible();
  await expect(page.locator('#graph-connect-mode')).toBeVisible();
  await page.locator('#graph-connect-mode').click();
  await expect(page.locator('.graph-viewport')).toHaveClass(/connect-mode/);
  const firstNode = page.locator('.graph-map-node').first();
  await expect(firstNode).toBeVisible({ timeout: 60000 });
  await firstNode.click();
  await expect(firstNode).toHaveClass(/active/);
  await expect(page.locator('#graph-focus-summary')).toContainText(/Focus|โฟกัส/);

  await page.locator('#graph-zoom-in').click();
  await expect(page.locator('.graph-toolbar .tag').filter({ hasText: /%/ })).toContainText(/1(0|1|2)/);
});

test('analyzer shows deeper balance and coverage metrics', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="analyzer"]').click();
  await page.waitForTimeout(1400);
  await page.locator('#refresh-analyzer').click();

  await expect(page.locator('#analyzer-advice')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#analyzer-advice')).toContainText(/Next actions|ควรทำต่อ/);
  await expect(page.locator('.analyzer-deep-grid')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('#analyzer-stats')).toContainText(/Balance score|คะแนนสมดุล/);
  await expect(page.locator('#analyzer-categories')).toContainText(/Ammo \/ Weapon|Medical share|Node coverage/);
  await expect(page.locator('#analyzer-top-items')).toContainText(/Node power score|Spawner coverage/);
});

test('analyzer advice opens the affected loot file when a concrete target exists', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="analyzer"]').click();
  await page.locator('#refresh-analyzer').click();

  const coverageAdvice = page.locator('.analyzer-advice-card').filter({ hasText: /Spawner coverage|coverage/ }).first();
  await expect(coverageAdvice).toBeVisible({ timeout: 60000 });
  const button = coverageAdvice.locator('[data-analyzer-advice-view]').first();
  const targetPath = await button.getAttribute('data-analyzer-target-path');
  expect(targetPath).toMatch(/^Spawners\/.+\.json$/);

  await button.click();
  await expect(page.locator('#view-loot')).toBeVisible();
  await expect(page.locator('#loot-editor-title')).toContainText(targetPath);
});

test('loot studio deep links open the requested file from the route query', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const targetPath = 'Spawners/Character-Animal_Corpses-Examine_Dead_Boar_Corpse.json';

  await page.goto(`${baseUrl}/loot-studio?file=${encodeURIComponent(targetPath)}`, { waitUntil: 'networkidle' });

  await expect(page.locator('#view-loot')).toBeVisible();
  await expect(page.locator('#loot-editor-title')).toContainText(targetPath, { timeout: 60000 });
  await expect(page).toHaveURL(/\/loot-studio\?file=/);
});

test('analyzer result cards can open their exact loot files', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('.nav[data-view="analyzer"]').click();
  await page.locator('#refresh-analyzer').click();

  const openButton = page.locator('[data-analyzer-open-file]').first();
  await expect(openButton).toBeVisible({ timeout: 60000 });
  const targetPath = await openButton.getAttribute('data-analyzer-open-file');
  expect(targetPath).toMatch(/^(Nodes|Spawners)\/.+\.json$/);

  await openButton.click();

  await expect(page.locator('#view-loot')).toBeVisible();
  await expect(page.locator('#loot-editor-title')).toContainText(targetPath);
  await expect(page).toHaveURL(/\/loot-studio\?file=/);
});

test('opening a loot search result updates the route to a shareable file link', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await page.locator('#global-search-scope').selectOption('spawners');
  await page.locator('#global-search-term').fill('Boar_Back_Leg');
  await page.locator('#global-search-btn').click();
  const openButton = page.locator('[data-search-open^="Spawners/"]').first();
  await expect(openButton).toBeVisible({ timeout: 60000 });
  const targetPath = await openButton.getAttribute('data-search-open');

  await openButton.click();

  await expect(page.locator('#view-loot')).toBeVisible();
  await expect(page.locator('#loot-editor-title')).toContainText(targetPath);
  await expect(page).toHaveURL(/\/loot-studio\?file=/);
});

test('global search supports scope and issue filters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });

  await expect(page.locator('#global-search-filters')).toBeVisible();
  await page.locator('#global-search-scope').selectOption('spawners');
  await page.locator('#global-search-match').selectOption('exact');
  await page.locator('#global-search-term').fill('Boar_Back_Leg');
  await page.locator('#global-search-btn').click();
  await expect(page.locator('.search-result-card').first()).toBeVisible();
  await expect(page.locator('#global-search-results')).toContainText(/Spawners\//);

  await page.locator('#global-search-issue').selectOption('unused_nodes');
  await page.locator('#global-search-term').fill('');
  await page.locator('#global-search-btn').click();
  await expect(page.locator('#global-search-results')).toContainText(/results|No results|ผลลัพธ์|ไม่พบ/);
});
