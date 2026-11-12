// @ts-check
/**
 * E2E Test Suite: Admin Settings Screen (Custom Post Types & Layouts Tabs)
 *
 * Verifies the top-level SeriesCraft Admin Settings screen, including menu navigation,
 * admin stylesheet enqueuing, Custom Post Types selection persistence, and Default Layout
 * variant selection persistence using the `AdminSettingsPage` Page Object Model.
 *
 * @covers
 * - Backend (PHP): src/src/Admin/AdminPage.php, src/src/Admin/SeriesSettingsPage.php, src/src/Admin/SettingsSanitizer.php, src/src/Admin/Views/settings-page.php, src/src/Admin/Views/tab-custom-post-types.php, src/src/Admin/Views/tab-layouts.php, src/src/Database/Repositories/SettingsRepository.php
 * - Frontend (JS/React): resources/scss/admin.scss
 * - Page Object: tests/E2E/pages/AdminSettingsPage.js
 *
 * Test Scenarios:
 * 1. Verify top-level "Series Craft" admin menu visibility, page heading, tab navigation, and admin CSS asset loading.
 * 2. Toggle eligible Custom Post Types (`post`, `page`), submit form, verify success notice, and confirm persistence across reloads.
 * 3. Navigate to the Layouts tab, verify all four layout variant cards (`media-grid`, `link-grid`, `media-list`, `link-list`), switch default layout variants, and verify saved state persists across reloads.
 */

import { test, expect } from '@playwright/test';
import { AdminSettingsPage } from '../../pages/AdminSettingsPage.js';

test.describe( 'SeriesCraft — Admin Settings E2E Suite', () => {
	test( 'Scenario 1: Top-level admin menu item is visible and loads SeriesCraft Settings with admin styles', async ( { page } ) => {
		const settingsPage = new AdminSettingsPage( page );

		await settingsPage.gotoViaAdminMenu();

		await expect( settingsPage.settingsWrap ).toBeVisible();
		await expect( settingsPage.heading ).toHaveText( 'SeriesCraft Settings' );
		await expect( settingsPage.cptTabLink ).toBeVisible();
		await expect( settingsPage.cptTabLink ).toHaveClass( /nav-tab-active/ );
		await expect( settingsPage.layoutsTabLink ).toBeVisible();

		await expect( settingsPage.adminStylesheet ).toBeAttached();
		const href = await settingsPage.adminStylesheet.getAttribute( 'href' );
		expect( href ).toContain( 'assets/css/admin.css' );
	} );

	test( 'Scenario 2: Custom Post Types tab toggles eligible post types and persists saved selection', async ( { page } ) => {
		const settingsPage = new AdminSettingsPage( page );

		await settingsPage.openCptTab();

		// Enable both 'post' and 'page' and save
		await settingsPage.setPostTypeEnabled( 'post', true );
		await settingsPage.setPostTypeEnabled( 'page', true );
		await settingsPage.saveCptSettings();

		// Reload cleanly and confirm both remain checked
		await settingsPage.openCptTab();
		await expect( settingsPage.getPostTypeCheckbox( 'post' ) ).toBeChecked();
		await expect( settingsPage.getPostTypeCheckbox( 'page' ) ).toBeChecked();

		// Restore default state ('post' checked, 'page' unchecked)
		await settingsPage.setPostTypeEnabled( 'page', false );
		await settingsPage.saveCptSettings();
		await expect( settingsPage.getPostTypeCheckbox( 'post' ) ).toBeChecked();
		await expect( settingsPage.getPostTypeCheckbox( 'page' ) ).not.toBeChecked();
	} );

	test( 'Scenario 3: Layouts tab displays all 4 layout cards, switches default layout, and persists selection', async ( { page } ) => {
		const settingsPage = new AdminSettingsPage( page );

		await settingsPage.gotoSettings();
		await settingsPage.openLayoutsTab( true );
		await expect( settingsPage.layoutsTabLink ).toHaveClass( /nav-tab-active/ );

		// Verify all 4 layout variant radio inputs are rendered
		await expect( settingsPage.getLayoutRadio( 'media-grid' ) ).toBeAttached();
		await expect( settingsPage.getLayoutRadio( 'link-grid' ) ).toBeAttached();
		await expect( settingsPage.getLayoutRadio( 'media-list' ) ).toBeAttached();
		await expect( settingsPage.getLayoutRadio( 'link-list' ) ).toBeAttached();

		// Select 'media-grid' layout, save, and verify persistence across reload
		await settingsPage.selectAndSaveLayout( 'media-grid' );
		await settingsPage.openLayoutsTab( false );
		await expect( settingsPage.getLayoutRadio( 'media-grid' ) ).toBeChecked();

		// Restore default 'link-list' layout and verify
		await settingsPage.selectAndSaveLayout( 'link-list' );
		await expect( settingsPage.getLayoutRadio( 'link-list' ) ).toBeChecked();
	} );
} );

