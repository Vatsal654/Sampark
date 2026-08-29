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

test.describe('Scanner portal — error classification (never collapse every failure into "Tag not found")', () => {
  test('a 401 response shows the unauthorized state, not "Tag not found"', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) => route.fulfill({ status: 401, json: { message: 'Unauthorized' } }));
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText("This link can't be used right now")).toBeVisible();
    await expect(page.getByText('Tag not found', { exact: true })).not.toBeVisible();
  });

  test('a 403 response shows the unauthorized state, not "Tag not found"', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) => route.fulfill({ status: 403, json: { message: 'Forbidden' } }));
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText("This link can't be used right now")).toBeVisible();
  });

  test('a 500 response shows "Sampark is temporarily unavailable", not "Tag not found"', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) => route.fulfill({ status: 500, json: { message: 'Internal error' } }));
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('Sampark is temporarily unavailable')).toBeVisible();
    await expect(page.getByText('Tag not found', { exact: true })).not.toBeVisible();
  });

  test('a 503 response also shows the server-unavailable state', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) => route.fulfill({ status: 503, json: { message: 'Service unavailable' } }));
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('Sampark is temporarily unavailable')).toBeVisible();
  });

  test('a network failure shows "Unable to connect to Sampark" with a retry button, not "Tag not found"', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) => route.abort('connectionrefused'));
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('Unable to connect to Sampark')).toBeVisible();
    await expect(page.getByText('Tag not found', { exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('clicking retry after a network failure re-attempts the lookup, and succeeds once the network recovers', async ({ page }) => {
    let attempts = 0;
    await page.route('**/v1/public/tags/**', (route) => {
      attempts += 1;
      if (attempts === 1) return route.abort('connectionrefused');
      return route.fulfill({
        json: { opaqueId: 'a', status: 'active', vehicleDisplayLabel: 'Recovered Car', vehicleCategory: 'car', callbackEnabled: false, emergencyEnabled: false },
      });
    });
    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('Unable to connect to Sampark')).toBeVisible();
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('Recovered Car')).toBeVisible();
    expect(attempts).toBe(2);
  });

  test('a malformed link (no opaqueId.signature shape) shows "Invalid link" without ever calling the API', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/v1/public/tags/**', (route) => {
      apiCalled = true;
      return route.fulfill({ json: { opaqueId: 'a', status: 'active', vehicleDisplayLabel: null, vehicleCategory: null, callbackEnabled: false, emergencyEnabled: false } });
    });
    await page.goto('/t/not-a-valid-slug-at-all');
    await expect(page.getByText('Invalid link')).toBeVisible();
    expect(apiCalled).toBe(false);
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
