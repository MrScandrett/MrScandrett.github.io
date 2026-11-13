export async function openControls(page, panel = 'geometry') {
  await page.waitForSelector('.bb-studio');
  if (!(await page.locator('#bb-studio-panel').isVisible())) await page.locator('#bb-controls-toggle').click();
  await page.locator(`.bb-panel-tabs button[data-panel="${panel}"]`).click();
}
export async function chooseShape(page, mode, panel = 'geometry') {
  await page.waitForSelector('.bb-studio');
  const button = page.locator('#btn-mode-' + mode);
  if (!(await button.isVisible())) await page.locator('#bb-shapes-toggle').click();
  await button.click();
  if (panel) await openControls(page, panel);
}
