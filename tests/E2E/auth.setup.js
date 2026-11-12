// @ts-check
/**
 * E2E Setup: WordPress Admin Authentication & Plugin Activation
 *
 * Logs into the WordPress Admin dashboard, ensures the "Series Craft" plugin is active,
 * and saves the authenticated browser storage state to `playwright/.auth/user.json`.
 *
 * @covers
 * - Backend (PHP): src/series-craft.php
 * - Frontend (JS/React): N/A (Playwright global auth setup)
 * - Helpers: tests/E2E/helpers/wordpress.js
 *
 * Test Scenarios:
 * 1. Authenticate as administrator via `/wp-login.php`, activate "Series Craft", and persist storageState.
 */

import { test as setup } from '@playwright/test';
import { loginToWordPress, activatePluginViaBrowser } from './helpers/wordpress.js';

const authFile = 'playwright/.auth/user.json';

setup( 'authenticate', async ( { page } ) => {
	await loginToWordPress( page );
	await activatePluginViaBrowser( page, 'Series Craft' );
	await page.context().storageState( { path: authFile } );
} );
