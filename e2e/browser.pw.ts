import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function fillGrid(page: Page, cells: string[]): Promise<void> {
  for (let i = 0; i < cells.length; i++) await page.locator('#grid input').nth(i).fill(cells[i]);
}

test('finds a newly included size-80 word with a maximum-cell path', async ({ page }) => {
  await page.goto('');
  await fillGrid(page, ['z', 'a', 'x', 'x', 's', 'e', 'x', 'x', 'x']);
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  const zaxes = page.getByRole('button', { name: 'zaxes 5 cells / 5 letters', exact: true });
  await expect(zaxes).toBeVisible();
  await zaxes.click();
  await expect(page.locator('.visited')).toHaveCount(5);
  await expect(page.locator('#path')).toContainText('zaxes:');
});

test('solves bundled words, shows paths, edits, and clears without horizontal overflow', async ({ page }) => {
  await page.goto('');
  await fillGrid(page, ['qu', 'i', 't', 'x', 'x', 'e', 'x', 'x', 'x']);
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('words found');
  const quite = page.getByRole('button', { name: 'quite 4 cells / 5 letters', exact: true });
  await quite.click();
  await expect(quite).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.visited')).toHaveCount(4);
  await expect(page.locator('#path')).toContainText('row 1, column 1 then row 1, column 2');
  expect(await page.locator('.visited').evaluateAll(elements =>
    elements.map(element => element.getAttribute('data-step')))).toEqual(['1', '2', '3', '4']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#minimum').fill('6');
  await expect(page.locator('#results li')).toHaveCount(0);
  await expect(page.locator('.visited')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Grid cleared.');
  await expect(page.locator('#grid input').first()).toBeFocused();
  await expect(page.locator('#grid input').first()).toHaveValue('');
});

test('reports input errors, handles grid size, arrow navigation and Enter', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cell 1 must contain');
  await expect(page.locator('#grid input').first()).toHaveAttribute('aria-invalid', 'true');
  await page.locator('#size').selectOption('4');
  await expect(page.locator('#grid input')).toHaveCount(16);
  await fillGrid(page, ['r', 'o', 's', 'e', 'x', 'x', 'x', 's', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x']);
  await page.locator('#grid input').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#grid input').nth(1)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#grid input').nth(5)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'roses 5 cells / 5 letters', exact: true })).toBeVisible();
  await page.locator('#grid input').first().fill('-');
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cell 1 must contain');
});

test('surfaces dictionary failures rather than returning an empty success', async ({ page }) => {
  await page.route('**/words.txt', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('');
  await fillGrid(page, ['qu', 'i', 't', 'x', 'x', 'e', 'x', 'x', 'x']);
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('dictionary could not be loaded');
  await expect(page.getByRole('button', { name: 'Solve', exact: true })).toBeEnabled();
});

test('cancels in-flight solving on edit so stale results cannot reappear', async ({ page }) => {
  await page.route('**/words.txt', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({ status: 200, body: 'quite\n' });
  });
  await page.goto('');
  await fillGrid(page, ['qu', 'i', 't', 'x', 'x', 'e', 'x', 'x', 'x']);
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await page.locator('#grid input').first().fill('a');
  await page.waitForTimeout(500);
  await expect(page.getByRole('status')).toContainText('Grid changed');
  await expect(page.locator('#results li')).toHaveCount(0);
});

test('fits a narrow phone in both grid sizes and reports malformed dictionaries', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.route('**/words.txt', route => route.fulfill({ status: 200, body: '<html>Not a word list</html>' }));
  await page.goto('');
  for (const size of ['3', '4']) {
    await page.locator('#size').selectOption(size);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await fillGrid(page, Array<string>(16).fill('a'));
  await page.getByRole('button', { name: 'Solve', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('dictionary is empty or invalid');
});
