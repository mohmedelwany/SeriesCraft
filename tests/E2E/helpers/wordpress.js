import { expect } from '@playwright/test';

/**
 * WordPress Playwright E2E Helper Utilities.
 */

/**
 * Log in to WordPress Admin dashboard via browser.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [username]
 * @param {string} [password]
 */
export async function loginToWordPress( page, username = process.env.WP_ADMIN_USER ?? 'admin', password = process.env.WP_ADMIN_PASSWORD ?? 'password' ) {
	// Go to login page
	await page.goto( '/wp-login.php' );

	// Check if already logged in (redirected to admin dashboard)
	if ( page.url().includes( '/wp-admin/' ) ) {
		return;
	}

	// Fill credentials
	await page.fill( '#user_login', username );
	await page.fill( '#user_pass', password );

	// Click login submit & wait for admin dashboard
	await page.click( '#wp-submit' );
	await page.waitForURL( /\/wp-admin\// );
	await page.locator( '#wpadminbar' ).waitFor( { state: 'visible' } );
}

/**
 * Navigate to Plugins page (/wp-admin/plugins.php).
 *
 * @param {import('@playwright/test').Page} page
 */
export async function goToPluginsPage( page ) {
	await page.goto( '/wp-admin/plugins.php' );
	await page.locator( '#the-list' ).waitFor( { state: 'visible' } );
}

/**
 * Locate the table row element for a given plugin name.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} pluginName
 */
export function getPluginRow( page, pluginName = 'Series Craft' ) {
	return page.locator( '#the-list tr' ).filter( { hasText: pluginName } );
}

/**
 * Check whether a plugin is active in the plugins table.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} pluginName
 * @returns {Promise<boolean>}
 */
export async function isPluginActive( page, pluginName = 'Series Craft' ) {
	await goToPluginsPage( page );
	const row = getPluginRow( page, pluginName );
	const deactivateLink = row.locator( '.deactivate a' );
	return ( await deactivateLink.count() ) > 0;
}

/**
 * Activate a plugin via browser UI interaction.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} pluginName
 */
export async function activatePluginViaBrowser( page, pluginName = 'Series Craft' ) {
	await goToPluginsPage( page );
	const row = getPluginRow( page, pluginName );
	await row.waitFor( { state: 'visible' } );

	const activateLink = row.locator( '.activate a' );
	if ( ( await activateLink.count() ) > 0 ) {
		await Promise.all( [
			page.waitForNavigation( { waitUntil: 'domcontentloaded' } ).catch( () => {} ),
			activateLink.click( { force: true } ),
		] );
	}

	// Verify activation confirmation: row should now contain Deactivate link
	const deactivateLink = row.locator( '.deactivate a' );
	await expect( deactivateLink ).toBeAttached();
}

/**
 * Deactivate a plugin via browser UI interaction.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} pluginName
 */
export async function deactivatePluginViaBrowser( page, pluginName = 'Series Craft' ) {
	await goToPluginsPage( page );
	const row = getPluginRow( page, pluginName );
	await row.waitFor( { state: 'visible' } );

	const deactivateLink = row.locator( '.deactivate a' );
	if ( ( await deactivateLink.count() ) > 0 ) {
		await Promise.all( [
			page.waitForNavigation( { waitUntil: 'domcontentloaded' } ).catch( () => {} ),
			deactivateLink.click( { force: true } ),
		] );
	}

	// Verify deactivation confirmation: row should now contain Activate link
	const activateLink = row.locator( '.activate a' );
	await expect( activateLink ).toBeAttached();
}
