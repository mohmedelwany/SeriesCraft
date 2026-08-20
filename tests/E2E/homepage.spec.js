// @ts-check
/**
 * Hello-World E2E test — Playwright tier.
 *
 * Requires a running WordPress instance served by `npx wp-env start`.
 * The base URL is configured in playwright.config.js (default: http://localhost:8888).
 *
 * Run locally:
 *   npx wp-env start
 *   npm run test:e2e
 *   npx wp-env stop
 */

import { test, expect } from '@playwright/test';

test.describe( 'SeriesCraft — WordPress site smoke tests', () => {
	test( 'homepage loads and returns HTTP 200', async ( { page } ) => {
		const response = await page.goto( '/' );
		expect( response?.status() ).toBe( 200 );
	} );

	test( 'page title contains a non-empty string', async ( { page } ) => {
		await page.goto( '/' );
		const title = await page.title();
		expect( title.length ).toBeGreaterThan( 0 );
	} );

	test( 'WordPress login page is reachable', async ( { page } ) => {
		const response = await page.goto( '/wp-login.php' );
		expect( response?.status() ).toBe( 200 );
		await expect( page.locator( '#user_login' ) ).toBeVisible();
	} );
} );
