// @ts-check
/**
 * E2E Page Object Model: AdminSettingsPage
 *
 * Encapsulates all CSS selectors, locators, and multi-step UI interactions for the
 * SeriesCraft Admin Settings screen (`/wp-admin/admin.php?page=series-craft`), including
 * top-level menu navigation, the Custom Post Types tab, and the Layouts tab.
 *
 * @covers
 * - Backend (PHP): src/src/Admin/AdminPage.php, src/src/Admin/SeriesSettingsPage.php, src/src/Admin/SettingsSanitizer.php, src/src/Admin/Views/settings-page.php, src/src/Admin/Views/tab-custom-post-types.php, src/src/Admin/Views/tab-layouts.php
 * - Frontend (JS/React): resources/scss/admin.scss
 *
 * Test Scenarios:
 * 1. Navigate to the SeriesCraft Settings page via the top-level WP Admin menu or direct URL.
 * 2. Inspect and toggle eligible Custom Post Type checkboxes and submit the CPT form.
 * 3. Switch to the Layouts tab, inspect layout variant radio cards, and submit layout selections.
 */

import { expect } from '@playwright/test';

export class AdminSettingsPage {
	static SETTINGS_URL = '/wp-admin/admin.php?page=series-craft';
	static CPT_TAB_URL = '/wp-admin/admin.php?page=series-craft&tab=custom-post-types';
	static LAYOUTS_TAB_URL = '/wp-admin/admin.php?page=series-craft&tab=layouts';

	/**
	 * @param {import('@playwright/test').Page} page
	 */
	constructor( page ) {
		this.page = page;
		this.menuLink = page.locator( '#toplevel_page_series-craft > a' );
		this.settingsWrap = page.locator( '.seriescraft-admin-settings-wrap' );
		this.heading = this.settingsWrap.locator( 'h1.wp-heading-inline' );
		this.cptTabLink = this.settingsWrap.locator( '.nav-tab-wrapper a.nav-tab', { hasText: 'Custom Post Types' } );
		this.layoutsTabLink = this.settingsWrap.locator( '.nav-tab-wrapper a.nav-tab', { hasText: 'Layouts' } );
		this.adminStylesheet = page.locator( 'link#seriescraft-admin-settings-css' );
		this.successNotice = this.settingsWrap.locator( '.notice-success' );
		this.cptForm = page.locator( 'form.sm-cpt-form' );
		this.layoutsForm = page.locator( 'form.sm-layouts-form' );
	}

	/**
	 * Navigate to `/wp-admin/` and click the top-level "Series Craft" admin menu link.
	 */
	async gotoViaAdminMenu() {
		await this.page.goto( '/wp-admin/' );
		await expect( this.menuLink ).toBeVisible();
		await this.menuLink.click();
		await expect( this.page ).toHaveURL( /page=series-craft/ );
	}

	/**
	 * Navigate directly to the main SeriesCraft settings screen.
	 */
	async gotoSettings() {
		await this.page.goto( AdminSettingsPage.SETTINGS_URL );
		await expect( this.settingsWrap ).toBeVisible();
	}

	/**
	 * Navigate directly to the Custom Post Types tab.
	 */
	async openCptTab() {
		await this.page.goto( AdminSettingsPage.CPT_TAB_URL );
		await expect( this.cptForm ).toBeVisible();
	}

	/**
	 * Navigate to the Layouts tab by clicking its navigation tab link (if on settings page)
	 * or via direct URL.
	 *
	 * @param {boolean} [viaClick=false]
	 */
	async openLayoutsTab( viaClick = false ) {
		if ( viaClick ) {
			await this.layoutsTabLink.click();
			await expect( this.page ).toHaveURL( /tab=layouts/ );
		} else {
			await this.page.goto( AdminSettingsPage.LAYOUTS_TAB_URL );
		}
		await expect( this.layoutsForm ).toBeVisible();
	}

	/**
	 * Return the checkbox locator for a specific post type slug on the CPT tab.
	 *
	 * @param {string} postTypeSlug
	 * @returns {import('@playwright/test').Locator}
	 */
	getPostTypeCheckbox( postTypeSlug ) {
		return this.cptForm.locator(
			`input.sm-cpt-checkbox[name="supported_post_types[]"][value="${ postTypeSlug }"]`
		);
	}

	/**
	 * Check or uncheck a specific post type checkbox.
	 *
	 * @param {string}  postTypeSlug
	 * @param {boolean} enabled
	 */
	async setPostTypeEnabled( postTypeSlug, enabled ) {
		const checkbox = this.getPostTypeCheckbox( postTypeSlug );
		await expect( checkbox ).toBeVisible();
		if ( enabled ) {
			await checkbox.check();
		} else {
			await checkbox.uncheck();
		}
	}

	/**
	 * Submit the Custom Post Types form and verify the success notice appears.
	 */
	async saveCptSettings() {
		await this.cptForm.locator( 'button[type="submit"]' ).click();
		await expect( this.successNotice ).toBeVisible();
		await expect( this.successNotice ).toContainText( 'Settings updated successfully.' );
	}

	/**
	 * Return the radio input locator for a specific layout variant slug on the Layouts tab.
	 *
	 * @param {'media-grid'|'link-grid'|'media-list'|'link-list'} layoutSlug
	 * @returns {import('@playwright/test').Locator}
	 */
	getLayoutRadio( layoutSlug ) {
		return this.layoutsForm.locator(
			`input.sm-layout-input[name="content_variant"][value="${ layoutSlug }"]`
		);
	}

	/**
	 * Select a layout variant radio card, submit the Layouts form, and verify the success notice.
	 *
	 * @param {'media-grid'|'link-grid'|'media-list'|'link-list'} layoutSlug
	 */
	async selectAndSaveLayout( layoutSlug ) {
		const radio = this.getLayoutRadio( layoutSlug );
		await radio.check( { force: true } );
		await this.layoutsForm.locator( 'button[type="submit"]' ).click();
		await expect( this.page ).toHaveURL( /tab=layouts/ );
		await expect( this.successNotice ).toBeVisible();
		await expect( this.successNotice ).toContainText( 'Settings updated successfully.' );
	}
}

