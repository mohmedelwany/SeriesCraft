// @ts-check
/**
 * E2E Test Suite: Browser-Based Plugin Activation & Deactivation Lifecycle
 *
 * Verifies that the Series Craft plugin is listed on `/wp-admin/plugins.php` and can be
 * activated, deactivated, and reactivated cleanly through the WordPress Admin UI.
 *
 * @covers
 * - Backend (PHP): src/series-craft.php, src/src/Database/SchemaManager.php, src/src/Database/LegacyDataMigrator.php
 * - Frontend (JS/React): N/A (WP Admin Plugins screen)
 * - Helpers: tests/E2E/helpers/wordpress.js
 *
 * Test Scenarios:
 * 1. Navigate to `/wp-admin/plugins.php` and verify the "Series Craft" plugin row is visible.
 * 2. Activate the "Series Craft" plugin via the browser UI and verify the active state.
 * 3. Deactivate and reactivate the "Series Craft" plugin via the browser UI to verify lifecycle stability.
 */

import { test, expect } from '@playwright/test';
import {
	goToPluginsPage,
	getPluginRow,
	isPluginActive,
	activatePluginViaBrowser,
	deactivatePluginViaBrowser,
} from '../../helpers/wordpress.js';

test.describe( 'SeriesCraft — Browser-based Plugin Activation E2E', () => {
	const PLUGIN_NAME = 'Series Craft';

	test( 'Scenario 1: can navigate to the Plugins page', async ( { page } ) => {
		await goToPluginsPage( page );
		await expect( page.locator( '#the-list' ) ).toBeVisible();
		const pluginRow = getPluginRow( page, PLUGIN_NAME );
		await expect( pluginRow ).toBeVisible();
	} );

	test( 'Scenario 2: can activate Series Craft plugin via the browser UI', async ( { page } ) => {
		await activatePluginViaBrowser( page, PLUGIN_NAME );

		const row = getPluginRow( page, PLUGIN_NAME );
		const deactivateLink = row.locator( '.deactivate a' );
		await expect( deactivateLink ).toBeVisible();

		// Verify notice or active class on plugin row
		await expect( row ).toHaveClass( /active/ );
	} );

	test( 'Scenario 3: can handle plugin deactivation and reactivation lifecycle via browser', async ( { page } ) => {
		// Step 1: Ensure plugin is deactivated first
		await deactivatePluginViaBrowser( page, PLUGIN_NAME );
		const activeStateAfterDeactivate = await isPluginActive( page, PLUGIN_NAME );
		expect( activeStateAfterDeactivate ).toBe( false );

		// Step 2: Activate plugin via browser
		await activatePluginViaBrowser( page, PLUGIN_NAME );
		const activeStateAfterActivate = await isPluginActive( page, PLUGIN_NAME );
		expect( activeStateAfterActivate ).toBe( true );
	} );
} );

