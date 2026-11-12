// @ts-check
/**
 * E2E Page Object Model: FrontendSeriesViewPage
 *
 * Encapsulates all CSS selectors, DOM locators, navigation actions, accordion toggles,
 * and CSS custom property inspectors for published single posts rendered on the WordPress
 * frontend (`FrontendRenderer`, `HeaderView`, `NavigationView`, `AccordionLayout`,
 * `StyleSanitizer`, and the 4 layout variant views).
 *
 * @covers
 * - Backend (PHP): src/src/Frontend/FrontendRenderer.php, src/src/Views/HeaderView.php, src/src/Views/NavigationView.php, src/src/Views/AccordionLayout.php, src/src/Views/Variants/LinkListView.php, src/src/Views/Variants/LinkGridView.php, src/src/Views/Variants/MediaListView.php, src/src/Views/Variants/MediaGridView.php, src/src/Services/NavigationService.php, src/src/Services/StyleSanitizer.php, src/src/Database/LifecycleSubscriber.php
 * - Frontend (JS/React): resources/scss/frontend.scss, resources/js/frontend/
 *
 * @usedBy
 * - tests/E2E/specs/04-frontend/frontend-rendering.spec.js
 *
 * UI Elements & Actions Provided:
 * 1. Series box wrapper, header title, and `"Part X of Y"` position badge locators (`getSeriesBox`, `seriesTitle`, `positionBadge`).
 * 2. Layout variant container, item/card list, thumbnail image, and active `"Reading Now"` indicator locators (`getVariantContainer`, `getVariantItems`, `getCurrentItem`, `getReadingNowBadge`).
 * 3. Sequential Previous/Next navigation locators and click actions (`prevLink`, `nextLink`, `emptyNavPlaceholders`, `clickNextPost`, `clickPreviousPost`).
 * 4. Multi-series collapsible `<details class="seriescraft-accordion-item">` locators and toggle actions (`accordion`, `accordionItems`, `getAccordionItemByTitle`, `toggleAccordionItem`, `isAccordionItemOpen`).
 * 5. Scoped `--sc-*` CSS custom property and `<style>` tag inspection helpers (`getComputedCssVariable`).
 */

import { expect } from '@playwright/test';

export class FrontendSeriesViewPage {
	/**
	 * @param {import('@playwright/test').Page} page
	 */
	constructor( page ) {
		this.page = page;

		// Single series box & header locators
		this.seriesBox = page.locator( 'section.seriescraft-wrapper' ).first();
		this.header = this.seriesBox.locator( 'header.seriescraft-header' );
		this.seriesTitle = this.header.locator( 'h3.seriescraft-series-title' );
		this.positionBadge = this.header.locator( 'span.seriescraft-position-badge' );

		// Sequential navigation locators
		this.navigation = this.seriesBox.locator( 'nav.seriescraft-navigation' );
		this.prevLink = this.navigation.locator( 'a.seriescraft-nav-prev[rel="prev"]' );
		this.nextLink = this.navigation.locator( 'a.seriescraft-nav-next[rel="next"]' );
		this.emptyNavPlaceholders = this.navigation.locator( '.seriescraft-nav-empty' );

		// Multi-series Accordion locators
		this.accordion = page.locator( '.seriescraft-accordion' );
		this.accordionItems = this.accordion.locator( 'details.seriescraft-accordion-item' );
	}

	/**
	 * Navigate to a published post URL on the frontend.
	 *
	 * @param {string} postUrl
	 */
	async gotoPost( postUrl ) {
		await this.page.goto( postUrl );
	}

	/**
	 * Locate a specific `.seriescraft-wrapper` box by its numeric series term ID.
	 *
	 * @param {number} seriesId
	 * @returns {import('@playwright/test').Locator}
	 */
	getSeriesBoxById( seriesId ) {
		return this.page.locator( `section.seriescraft-wrapper[data-sm-series-term-id="${ seriesId }"]` );
	}

	/**
	 * Return the locator for a specific layout variant container inside the series box
	 * (`link-list`, `link-grid`, `media-list`, or `media-grid`).
	 *
	 * @param {'link-list' | 'link-grid' | 'media-list' | 'media-grid'} variantSlug
	 * @param {number} [seriesId]
	 * @returns {import('@playwright/test').Locator}
	 */
	getVariantContainer( variantSlug, seriesId = 0 ) {
		const box = seriesId > 0 ? this.getSeriesBoxById( seriesId ) : this.seriesBox;
		return box.locator( `.seriescraft-layout-${ variantSlug }` );
	}

	/**
	 * Return the locator for all post items/cards inside the active layout variant container.
	 *
	 * @param {'link-list' | 'link-grid' | 'media-list' | 'media-grid'} variantSlug
	 * @param {number} [seriesId]
	 * @returns {import('@playwright/test').Locator}
	 */
	getVariantItems( variantSlug, seriesId = 0 ) {
		const container = this.getVariantContainer( variantSlug, seriesId );
		switch ( variantSlug ) {
			case 'link-grid':
				return container.locator( 'a.sc-link-grid__card' );
			case 'media-list':
				return container.locator( 'a.sc-media-list__item' );
			case 'media-grid':
				return container.locator( 'a.sc-media-grid__card' );
			case 'link-list':
			default:
				return container.locator( 'a.sc-link-list__item' );
		}
	}

	/**
	 * Return the locator for the active/current post item (`.is-current`) inside the layout variant.
	 *
	 * @param {'link-list' | 'link-grid' | 'media-list' | 'media-grid'} variantSlug
	 * @param {number} [seriesId]
	 * @returns {import('@playwright/test').Locator}
	 */
	getCurrentItem( variantSlug, seriesId = 0 ) {
		const container = this.getVariantContainer( variantSlug, seriesId );
		return container.locator( 'a.is-current' );
	}

	/**
	 * Return the locator for the `"Reading Now"` badge inside the current post item.
	 *
	 * @param {'link-list' | 'link-grid' | 'media-list' | 'media-grid'} variantSlug
	 * @param {number} [seriesId]
	 * @returns {import('@playwright/test').Locator}
	 */
	getReadingNowBadge( variantSlug, seriesId = 0 ) {
		return this.getCurrentItem( variantSlug, seriesId ).locator( '.seriescraft-badge' );
	}

	/**
	 * Return the ordered array of post titles rendered inside the series box.
	 *
	 * @param {number} [seriesId]
	 * @returns {Promise<string[]>}
	 */
	async getRenderedPostTitles( seriesId = 0 ) {
		const box = seriesId > 0 ? this.getSeriesBoxById( seriesId ) : this.seriesBox;
		await expect( box ).toBeVisible();
		const rawTitles = await box.locator( '.seriescraft-title' ).allInnerTexts();
		return rawTitles.map( ( t ) => t.replace( /\s*Reading Now\s*$/i, '' ).trim() );
	}

	/**
	 * Click the "Next Post" navigation link (`a.seriescraft-nav-next`) and wait for navigation.
	 */
	async clickNextPost() {
		await expect( this.nextLink ).toBeVisible();
		await Promise.all( [
			this.page.waitForNavigation(),
			this.nextLink.click(),
		] );
	}

	/**
	 * Click the "Previous Post" navigation link (`a.seriescraft-nav-prev`) and wait for navigation.
	 */
	async clickPreviousPost() {
		await expect( this.prevLink ).toBeVisible();
		await Promise.all( [
			this.page.waitForNavigation(),
			this.prevLink.click(),
		] );
	}

	/**
	 * Locate a `<details class="seriescraft-accordion-item">` panel by its summary title text.
	 *
	 * @param {string} seriesName
	 * @returns {import('@playwright/test').Locator}
	 */
	getAccordionItemByTitle( seriesName ) {
		return this.accordionItems.filter( {
			has: this.page.locator( 'summary.seriescraft-accordion-summary', { hasText: seriesName } ),
		} );
	}

	/**
	 * Click the `<summary class="seriescraft-accordion-summary">` header for a specific series
	 * to expand or collapse its accordion panel.
	 *
	 * @param {string} seriesName
	 */
	async toggleAccordionItem( seriesName ) {
		const item = this.getAccordionItemByTitle( seriesName );
		const summary = item.locator( 'summary.seriescraft-accordion-summary' );
		await expect( summary ).toBeVisible();
		await summary.click();
	}

	/**
	 * Check whether a specific accordion `<details>` panel is currently open (`details.open === true`).
	 *
	 * @param {string} seriesName
	 * @returns {Promise<boolean>}
	 */
	async isAccordionItemOpen( seriesName ) {
		const item = this.getAccordionItemByTitle( seriesName );
		await expect( item ).toBeVisible();
		return await item.evaluate( ( el ) => /** @type {HTMLDetailsElement} */ ( el ).open );
	}

	/**
	 * Read the computed value of a `--sc-*` CSS custom property on `.seriescraft-series-<id>`
	 * (`[data-sm-series-term-id="<id>"]`).
	 *
	 * @param {number} seriesId
	 * @param {string} cssVarName e.g. `'--sc-title-color'`, `'--sc-header-bg'`, `'--sc-button-color'`, `'--sc-border-width'`.
	 * @returns {Promise<string>}
	 */
	async getComputedCssVariable( seriesId, cssVarName ) {
		const box = this.getSeriesBoxById( seriesId );
		await expect( box ).toBeVisible();
		return await box.evaluate( ( el, varName ) => {
			return window.getComputedStyle( el ).getPropertyValue( varName ).trim();
		}, cssVarName );
	}
}

