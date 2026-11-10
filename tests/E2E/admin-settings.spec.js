// @ts-check
/**
 * E2E Test Suite: Admin Settings Screen (Custom Post Types & Layouts Tabs)
 *
 * Verifies the top-level SeriesCraft Admin Settings screen, including menu navigation,
 * admin stylesheet enqueuing, Custom Post Types selection persistence, and Default Layout
 * variant selection persistence.
 *
 * @covers
 * - Backend (PHP): src/src/Admin/AdminPage.php, src/src/Admin/SeriesSettingsPage.php, src/src/Admin/SettingsSanitizer.php, src/src/Admin/Views/settings-page.php, src/src/Admin/Views/tab-custom-post-types.php, src/src/Admin/Views/tab-layouts.php, src/src/Database/Repositories/SettingsRepository.php
 * - Frontend (JS/React): resources/scss/admin.scss
 *
 * Test Scenarios:
 * 1. Verify top-level "Series Craft" admin menu visibility, page heading, tab navigation, and admin CSS asset loading.
 * 2. Toggle eligible Custom Post Types (`post`, `page`), submit form, verify success notice, and confirm persistence across reloads.
 * 3. Navigate to the Layouts tab, verify all four layout variant cards (`media-grid`, `link-grid`, `media-list`, `link-list`), switch default layout variants, and verify saved state persists across reloads.
 */

import { test, expect } from '@playwright/test';

const SETTINGS_URL = '/wp-admin/admin.php?page=series-craft';
const CPT_TAB_URL = '/wp-admin/admin.php?page=series-craft&tab=custom-post-types';
const LAYOUTS_TAB_URL = '/wp-admin/admin.php?page=series-craft&tab=layouts';

test.describe( 'SeriesCraft — Admin Settings E2E Suite', () => {
	test( 'Scenario 1: Top-level admin menu item is visible and loads SeriesCraft Settings with admin styles', async ( { page } ) => {
		await page.goto( '/wp-admin/' );

		// Verify top-level menu item exists in WP Admin sidebar
		const menuLink = page.locator( '#toplevel_page_series-craft > a' );
		await expect( menuLink ).toBeVisible();
		await expect( menuLink ).toContainText( 'Series Craft' );

		// Navigate via the menu item
		await menuLink.click();
		await expect( page ).toHaveURL( /page=series-craft/ );

		// Verify page wrapper, heading, and navigation tabs
		const settingsWrap = page.locator( '.seriescraft-admin-settings-wrap' );
		await expect( settingsWrap ).toBeVisible();
		await expect( settingsWrap.locator( 'h1.wp-heading-inline' ) ).toHaveText( 'SeriesCraft Settings' );

		const cptTab = settingsWrap.locator( '.nav-tab-wrapper a.nav-tab', { hasText: 'Custom Post Types' } );
		const layoutsTab = settingsWrap.locator( '.nav-tab-wrapper a.nav-tab', { hasText: 'Layouts' } );
		await expect( cptTab ).toBeVisible();
		await expect( cptTab ).toHaveClass( /nav-tab-active/ );
		await expect( layoutsTab ).toBeVisible();

		// Verify admin stylesheet <link> is enqueued on the settings screen
		const adminStylesheet = page.locator( 'link#seriescraft-admin-settings-css' );
		await expect( adminStylesheet ).toBeAttached();
		const href = await adminStylesheet.getAttribute( 'href' );
		expect( href ).toContain( 'assets/css/admin.css' );
	} );

	test( 'Scenario 2: Custom Post Types tab toggles eligible post types and persists saved selection', async ( { page } ) => {
		await page.goto( CPT_TAB_URL );

		const cptForm = page.locator( 'form.sm-cpt-form' );
		await expect( cptForm ).toBeVisible();

		const postCheckbox = cptForm.locator( 'input.sm-cpt-checkbox[name="supported_post_types[]"][value="post"]' );
		const pageCheckbox = cptForm.locator( 'input.sm-cpt-checkbox[name="supported_post_types[]"][value="page"]' );

		await expect( postCheckbox ).toBeVisible();
		await expect( pageCheckbox ).toBeVisible();

		// Enable both 'post' and 'page'
		await postCheckbox.check();
		await pageCheckbox.check();

		await cptForm.locator( 'button[type="submit"]' ).click();

		// Note: WordPress Core's wp_admin_canonical_url() strips `settings-updated=1` from
		// window.location via history.replaceState on load, so we assert on the rendered notice.
		const successNotice = page.locator( '.seriescraft-admin-settings-wrap .notice-success' );
		await expect( successNotice ).toBeVisible();
		await expect( successNotice ).toContainText( 'Settings updated successfully.' );

		// Reload cleanly and confirm both remain checked
		await page.goto( CPT_TAB_URL );
		await expect( postCheckbox ).toBeChecked();
		await expect( pageCheckbox ).toBeChecked();

		// Restore default state ('post' checked, 'page' unchecked)
		await pageCheckbox.uncheck();
		await cptForm.locator( 'button[type="submit"]' ).click();
		await expect( successNotice ).toBeVisible();
		await expect( postCheckbox ).toBeChecked();
		await expect( pageCheckbox ).not.toBeChecked();
	} );

	test( 'Scenario 3: Layouts tab displays all 4 layout cards, switches default layout, and persists selection', async ( { page } ) => {
		await page.goto( SETTINGS_URL );

		// Click the "Layouts" tab in the navigation bar
		const layoutsTabLink = page.locator( '.nav-tab-wrapper a.nav-tab', { hasText: 'Layouts' } );
		await layoutsTabLink.click();
		await expect( page ).toHaveURL( /tab=layouts/ );
		await expect( layoutsTabLink ).toHaveClass( /nav-tab-active/ );

		const layoutsForm = page.locator( 'form.sm-layouts-form' );
		await expect( layoutsForm ).toBeVisible();

		// Verify all 4 layout variant radio inputs are rendered
		const mediaGridRadio = layoutsForm.locator( 'input.sm-layout-input[name="content_variant"][value="media-grid"]' );
		const linkGridRadio = layoutsForm.locator( 'input.sm-layout-input[name="content_variant"][value="link-grid"]' );
		const mediaListRadio = layoutsForm.locator( 'input.sm-layout-input[name="content_variant"][value="media-list"]' );
		const linkListRadio = layoutsForm.locator( 'input.sm-layout-input[name="content_variant"][value="link-list"]' );

		await expect( mediaGridRadio ).toBeAttached();
		await expect( linkGridRadio ).toBeAttached();
		await expect( mediaListRadio ).toBeAttached();
		await expect( linkListRadio ).toBeAttached();

		// Select 'media-grid' layout and save
		await mediaGridRadio.check( { force: true } );
		await layoutsForm.locator( 'button[type="submit"]' ).click();

		// Verify success notice and persisted selection
		await expect( page ).toHaveURL( /tab=layouts/ );
		const successNotice = page.locator( '.seriescraft-admin-settings-wrap .notice-success' );
		await expect( successNotice ).toBeVisible();
		await expect( successNotice ).toContainText( 'Settings updated successfully.' );

		await page.goto( LAYOUTS_TAB_URL );
		await expect( mediaGridRadio ).toBeChecked();

		// Restore default 'link-list' layout and verify
		await linkListRadio.check( { force: true } );
		await layoutsForm.locator( 'button[type="submit"]' ).click();
		await expect( successNotice ).toBeVisible();
		await expect( linkListRadio ).toBeChecked();
	} );
} );

