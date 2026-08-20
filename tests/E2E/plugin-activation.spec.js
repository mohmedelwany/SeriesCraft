// @ts-check
import { test, expect } from '@playwright/test';
import {
	loginToWordPress,
	goToPluginsPage,
	getPluginRow,
	isPluginActive,
	activatePluginViaBrowser,
	deactivatePluginViaBrowser,
} from './helpers/wordpress.js';

test.describe( 'SeriesCraft — Browser-based Plugin Activation E2E', () => {
	const PLUGIN_NAME = 'Series Craft';

	test.beforeEach( async ( { page } ) => {
		// Log in to WordPress Admin panel before each test
		await loginToWordPress( page );
	} );

	test( 'can navigate to the Plugins page', async ( { page } ) => {
		await goToPluginsPage( page );
		await expect( page.locator( '#the-list' ) ).toBeVisible();
		const pluginRow = getPluginRow( page, PLUGIN_NAME );
		await expect( pluginRow ).toBeVisible();
	} );

	test( 'can activate Series Craft plugin via the browser UI', async ( { page } ) => {
		await activatePluginViaBrowser( page, PLUGIN_NAME );

		const row = getPluginRow( page, PLUGIN_NAME );
		const deactivateLink = row.locator( '.deactivate a' );
		await expect( deactivateLink ).toBeVisible();

		// Verify notice or active class on plugin row
		await expect( row ).toHaveClass( /active/ );
	} );

	test( 'can handle plugin deactivation and reactivation lifecycle via browser', async ( { page } ) => {
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
