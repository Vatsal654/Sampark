/**
 * Purpose: Playwright coverage of the scanner portal's UI states and
 * flows. The API is intercepted at the network layer (page.route) rather
 * than run live, so this suite is fast, deterministic, and has no
 * database/service dependency — see docs/API.md for the contract each
 * mock mirrors.
 */
import { test, expect } from '@playwright/test';

const SLUG = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.SIG';

test.describe('Scanner portal — tag states', () => {
  test('shows the active tag menu with alert/callback/emergency actions', async ({ page }) => {
    await page.route('**/v1/public/tags/**', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        json: {
          opaqueId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          status: 'active',
          vehicleDisplayLabel: 'Blue Scooter',
          vehicleCategory: 'scooter',
          callbackEnabled: true,
          emergencyEnabled: true,
        },
      });
    });

    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('Blue Scooter')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send an alert' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Request a private callback' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'This is an emergency' })).toBeVisible();
  });

  test('shows an unactivated-tag message without leaking owner data', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) =>
      route.fulfill({
        json: {
          opaqueId: 'a',
          status: 'issued',
          vehicleDisplayLabel: null,
          vehicleCategory: null,
          callbackEnabled: false,
          emergencyEnabled: false,
        },
      }),
    );
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('This tag is not yet activated')).toBeVisible();
  });

  test('shows a paused-tag message', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) =>
      route.fulfill({
        json: { opaqueId: 'a', status: 'paused', vehicleDisplayLabel: null, vehicleCategory: null, callbackEnabled: false, emergencyEnabled: false },
      }),
    );
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('This tag is temporarily paused')).toBeVisible();
  });

  test('shows an unavailable message for a revoked tag', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) =>
      route.fulfill({
        json: { opaqueId: 'a', status: 'revoked', vehicleDisplayLabel: null, vehicleCategory: null, callbackEnabled: false, emergencyEnabled: false },
      }),
    );
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('This tag is unavailable')).toBeVisible();
  });

  test('shows a not-found message for an invalid link', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) => route.fulfill({ status: 404, json: { message: 'Tag not found' } }));
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('Tag not found')).toBeVisible();
  });

  test('never renders a phone number anywhere on the page for an active tag', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) =>
      route.fulfill({
        json: { opaqueId: 'a', status: 'active', vehicleDisplayLabel: 'Test Car', vehicleCategory: 'car', callbackEnabled: true, emergencyEnabled: true },
      }),
    );
    await page.goto(`/t/${SLUG}`);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/\+977\d{10}/);
  });
});

test.describe('Scanner portal — alert flow', () => {
  test('submits an alert and shows the confirmation screen', async ({ page }) => {
    await page.route('**/v1/public/tags/*', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          json: { opaqueId: 'a', status: 'active', vehicleDisplayLabel: 'Test Car', vehicleCategory: 'car', callbackEnabled: false, emergencyEnabled: false },
        });
      }
      return route.fallback();
    });
    await page.route('**/v1/public/tags/*/alerts*', (route) =>
      route.fulfill({ json: { alertId: '11111111-1111-1111-1111-111111111111', acknowledged: true } }),
    );

    await page.goto(`/t/${SLUG}`);
    await page.getByRole('button', { name: 'Send an alert' }).click();
    await page.getByRole('radio', { name: 'Lights left on' }).click();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText('Alert sent securely')).toBeVisible();
  });
});

test.describe('Scanner portal — language toggle', () => {
  test('switches visible copy to Nepali', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) =>
      route.fulfill({
        json: { opaqueId: 'a', status: 'active', vehicleDisplayLabel: 'Test Car', vehicleCategory: 'car', callbackEnabled: false, emergencyEnabled: false },
      }),
    );
    await page.goto(`/t/${SLUG}`);
    await page.getByRole('button', { name: 'नेपाली' }).click();
    await expect(page.getByText('सतर्कता पठाउनुहोस्')).toBeVisible();
  });
});
