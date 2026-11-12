// @ts-check
/**
 * E2E Page Object Model: TaxonomyTermPage
 *
 * Encapsulates all CSS selectors, locators, and UI actions for the classic WordPress
 * Series taxonomy management screen (`/wp-admin/edit-tags.php?taxonomy=series`) and
 * the Edit Series term screen (`/wp-admin/term.php?taxonomy=series&tag_ID=<id>`).
 *
 * @covers
 * - Backend (PHP): src/src/Taxonomy/SeriesTaxonomy.php, src/src/Taxonomy/SeriesTaxonomyAdmin.php, src/src/Api/Controllers/SeriesRestController.php
 * - Frontend (JS/React): resources/scss/admin/_taxonomy-order.scss
 *
 * Test Scenarios:
 * 1. Navigate to the Series taxonomy list screen and create a new series term via the classic form.
 * 2. Open the Edit Series screen for a specific term ID and inspect empty/populated post order lists.
 * 3. Retrieve ordered post IDs and titles from `#series-order-sortable` and `#series_post_order`.
 * 4. Reorder posts via jQuery UI Sortable and submit the Edit Series form.
 */

import { expect } from '@playwright/test';

export class TaxonomyTermPage {
	static TAXONOMY_LIST_URL = '/wp-admin/edit-tags.php?taxonomy=series';

	/**
	 * @param {import('@playwright/test').Page} page
	 */
	constructor( page ) {
		this.page = page;
		this.tagNameInput = page.locator( '#tag-name' );
		this.tagDescriptionInput = page.locator( '#tag-description' );
		this.addTermSubmitButton = page.locator( '#submit' );
		this.termsTableList = page.locator( '#the-list' );

		// Edit Series screen locators
		this.taxonomyStylesheet = page.locator( 'link#seriescraft-admin-taxonomy-css' );
		this.orderWrap = page.locator( 'tr.series-order-wrap' );
		this.orderFieldLabel = this.orderWrap.locator( 'th label' );
		this.sortableList = page.locator( '#series-order-sortable' );
		this.emptySortableNotice = this.sortableList.locator( 'li.sc-sortable-empty' );
		this.sortableItems = this.sortableList.locator( 'li.sc-sortable-post-item' );
		this.hiddenOrderInput = page.locator( 'input#series_post_order' );
		this.orderStatusSuccess = page.locator( '#sc-order-status .sc-status-success' );
		this.updateTermButton = page.locator( '#edittag input[type="submit"], .edit-tag-actions input[type="submit"]' ).first();
	}

	/**
	 * Navigate to `/wp-admin/edit-tags.php?taxonomy=series`.
	 */
	async gotoSeriesTaxonomy() {
		await this.page.goto( TaxonomyTermPage.TAXONOMY_LIST_URL );
		await expect( this.tagNameInput ).toBeVisible();
	}

	/**
	 * Create a new Series term using the classic Add New Series form and return its row locator and extracted term ID.
	 *
	 * @param {string} name
	 * @param {string} [description='']
	 * @returns {Promise<{ row: import('@playwright/test').Locator, termId: number }>}
	 */
	async createSeriesTerm( name, description = '' ) {
		await this.tagNameInput.fill( name );
		await this.tagDescriptionInput.fill( description );
		await this.addTermSubmitButton.click();

		const row = this.termsTableList.locator( 'tr', { hasText: name } );
		await expect( row ).toBeVisible();
		await expect( row.locator( 'a.row-title' ) ).toHaveText( name );

		let termId = 0;
		const rowIdAttr = await row.getAttribute( 'id' );
		if ( rowIdAttr && rowIdAttr.startsWith( 'tag-' ) ) {
			termId = parseInt( rowIdAttr.replace( 'tag-', '' ), 10 );
		}

		return { row, termId };
	}

	/**
	 * Navigate to the Edit Series screen (`term.php`) for a given series term ID.
	 *
	 * @param {number} seriesId
	 */
	async openEditSeries( seriesId ) {
		await this.page.goto( `/wp-admin/term.php?taxonomy=series&tag_ID=${ seriesId }&post_type=post` );
		await expect( this.orderWrap ).toBeVisible();
	}

	/**
	 * Return the array of post titles currently rendered inside `#series-order-sortable`.
	 *
	 * @returns {Promise<string[]>}
	 */
	async getOrderedPostTitles() {
		return await this.sortableItems.locator( '.sc-sortable-title' ).allInnerTexts();
	}

	/**
	 * Return the comma-separated post IDs string from `#series_post_order`.
	 *
	 * @returns {Promise<string>}
	 */
	async getOrderedPostIdsValue() {
		return await this.hiddenOrderInput.inputValue();
	}

	/**
	 * Move the last post item in `#series-order-sortable` to the first position
	 * and trigger jQuery UI Sortable's `update` event to fire the live REST save.
	 */
	async moveLastPostToFirstAndTriggerSortable() {
		await this.page.evaluate( () => {
			// @ts-ignore
			const $ = window.jQuery;
			const $sortable = $( '#series-order-sortable' );
			const $lastItem = $sortable.find( 'li.sc-sortable-post-item' ).last();
			$sortable.prepend( $lastItem );
			const instance = $sortable.sortable( 'instance' );
			if ( instance && typeof instance._trigger === 'function' ) {
				instance._trigger( 'update', null, {} );
			}
		} );
	}

	/**
	 * Submit the classic Edit Series term form (`Update` button).
	 */
	async submitEditTermForm() {
		await this.updateTermButton.click();
	}
}

