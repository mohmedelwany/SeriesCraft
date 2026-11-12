// @ts-check
/**
 * E2E Page Object Model: EditorAppearanceSidebarPage
 *
 * Encapsulates all CSS selectors, DOM locators, color/border/spacing control interactions,
 * REST API persistence waits, and live editor canvas preview assertions for the Gutenberg
 * "Series Settings" Appearance Sidebar (`SeriesSettingsSidebar`, `LayoutTab`, `StyleTab`).
 *
 * @covers
 * - Backend (PHP): src/src/Api/Controllers/SeriesRestController.php, src/src/Services/StyleSanitizer.php, src/src/Frontend/FrontendRenderer.php, src/src/Views/Variants/LinkListView.php, src/src/Views/Variants/LinkGridView.php, src/src/Views/Variants/MediaListView.php, src/src/Views/Variants/MediaGridView.php
 * - Frontend (JS/React): resources/js/editor/settings-sidebar/index.js, resources/js/editor/settings-sidebar/SeriesSettingsSidebar.js, resources/js/editor/settings-sidebar/LayoutTab.js, resources/js/editor/settings-sidebar/LayoutVariantSelector.js, resources/js/editor/settings-sidebar/StyleTab.js, resources/js/editor/settings-sidebar/constants.js, resources/js/hooks/useSeriesSettings.js, resources/js/blocks/series-list/edit.js
 * - Helpers: tests/E2E/helpers/editor.js
 *
 * Test Scenarios:
 * 1. Open the "Series Settings" plugin sidebar (`series-craft-settings`) and verify empty state and "Layout"/"Style" tabs.
 * 2. Switch per-series layout variants (`link-list`, `link-grid`, `media-list`, `media-grid`) in `LayoutTab`, verify REST persistence, and confirm live DOM structure updates in the editor canvas preview.
 * 3. Customize per-series colors, borders, and reset presets in `StyleTab`, verify inline `--sc-*` CSS custom properties update on the canvas preview wrapper, and confirm persistence across editor reloads.
 */

import { expect } from '@playwright/test';
import {
	openNewPostInEditor,
	openPostInEditor,
	openSeriesSettingsSidebar,
	getEditorCanvas,
} from '../helpers/editor.js';

export class EditorAppearanceSidebarPage {
	/**
	 * @param {import('@playwright/test').Page} page
	 */
	constructor( page ) {
		this.page = page;
		this.sidebar = page.locator( '.seriescraft-settings-sidebar:not(.is-in-modal)' );
		this.noSeriesNotice = this.sidebar.locator( '.seriescraft-no-series-notice' );
		this.settingsContainer = this.sidebar.locator( '[data-testid="sm-series-layout-setting"]' );
		this.seriesTitle = this.sidebar.locator( '.sc-series-title.sm-series-title' );
		this.seriesSwitcher = this.sidebar.locator( '.seriescraft-series-switcher select' );
		this.layoutTabBtn = this.sidebar.locator( '.sm-series-tabs button.sm-tab-layout' );
		this.styleTabBtn = this.sidebar.locator( '.sm-series-tabs button.sm-tab-style' );
		this.layoutTabContent = this.sidebar.locator( '[data-testid="sm-tab-content-layout"]' );
		this.styleTabContent = this.sidebar.locator( '[data-testid="sm-tab-content-style"]' );
		this.layoutSelector = this.layoutTabContent.locator( '[data-testid="sm-layout-selector"]' );
		this.resetStylesBtn = this.styleTabContent.locator( 'button.sm-style-reset-button' );
	}

	/**
	 * Open a new post in the Gutenberg Block Editor and open the "Series Settings" plugin sidebar.
	 */
	async openNewPostAndAppearanceSidebar() {
		await openNewPostInEditor( this.page );
		await openSeriesSettingsSidebar( this.page );
	}

	/**
	 * Open an existing post by ID in the Gutenberg Block Editor and open the "Series Settings" plugin sidebar.
	 *
	 * @param {number} postId
	 */
	async openPostAndAppearanceSidebar( postId ) {
		await openPostInEditor( this.page, postId );
		await openSeriesSettingsSidebar( this.page );
	}

	/**
	 * Switch to the "Layout" tab inside the Series Settings sidebar and verify its content is visible.
	 */
	async openLayoutTab() {
		await expect( this.layoutTabBtn ).toBeVisible();
		await this.layoutTabBtn.click();
		await expect( this.layoutTabBtn ).toHaveClass( /is-active/ );
		await expect( this.layoutTabContent ).toBeVisible();
	}

	/**
	 * Switch to the "Style" tab inside the Series Settings sidebar and verify its content is visible.
	 */
	async openStyleTab() {
		await expect( this.styleTabBtn ).toBeVisible();
		await this.styleTabBtn.click();
		await expect( this.styleTabBtn ).toHaveClass( /is-active/ );
		await expect( this.styleTabContent ).toBeVisible();
	}

	/**
	 * Get the button locator for a specific layout variant card (`link-list`, `link-grid`, `media-list`, `media-grid`).
	 *
	 * @param {'link-list' | 'link-grid' | 'media-list' | 'media-grid'} variantSlug
	 * @returns {import('@playwright/test').Locator}
	 */
	getLayoutCard( variantSlug ) {
		return this.layoutTabContent.locator( `button[data-testid="layout-card-${ variantSlug }"]` );
	}

	/**
	 * Wait for a `POST` request to `/series-craft/v1/series/<id>/settings` to complete.
	 *
	 * @param {number} seriesId
	 * @param {() => Promise<void>} triggerAction
	 * @returns {Promise<import('@playwright/test').Response>}
	 */
	async waitForSettingsSave( seriesId, triggerAction ) {
		const savePromise = this.page.waitForResponse(
			( response ) => {
				const decodedUrl = decodeURIComponent( response.url() );
				return (
					decodedUrl.includes( `/series-craft/v1/series/${ seriesId }/settings` ) &&
					response.request().method() === 'POST'
				);
			},
			{ timeout: 15000 }
		);

		await triggerAction();
		return await savePromise;
	}

	/**
	 * Click a layout variant card in `LayoutTab`, wait for the REST settings save to complete,
	 * and verify the card is marked as selected (`is-selected` and `aria-pressed="true"`).
	 *
	 * @param {'link-list' | 'link-grid' | 'media-list' | 'media-grid'} variantSlug
	 * @param {number} seriesId
	 * @returns {Promise<import('@playwright/test').Response>}
	 */
	async selectLayoutVariant( variantSlug, seriesId ) {
		const card = this.getLayoutCard( variantSlug );
		await expect( card ).toBeVisible();

		const response = await this.waitForSettingsSave( seriesId, async () => {
			await card.click();
		} );

		await expect( card ).toHaveClass( /is-selected/ );
		await expect( card ).toHaveAttribute( 'aria-pressed', 'true' );
		return response;
	}

	/**
	 * Open a color setting dropdown in `StyleTab` ("Title", "Header Background", or "Button"),
	 * enter a custom hex color in the Gutenberg color picker, and wait for the debounced REST save.
	 *
	 * @param {'Title' | 'Header Background' | 'Button'} colorLabel
	 * @param {string} hexColor Hex color string (e.g., `#d63638` or `#1e293b`).
	 * @param {number} seriesId
	 * @returns {Promise<import('@playwright/test').Response>}
	 */
	async setCustomColor( colorLabel, hexColor, seriesId ) {
		await expect( this.styleTabContent ).toBeVisible();

		const dropdownBtn = this.styleTabContent
			.locator( '.block-editor-panel-color-gradient-settings__dropdown button, button.block-editor-panel-color-gradient-settings__dropdown' )
			.filter( { hasText: colorLabel } )
			.first();

		await expect( dropdownBtn ).toBeVisible();
		await dropdownBtn.click();

		const popover = this.page.locator( '.components-popover' ).last();
		await expect( popover ).toBeVisible();

		// Open the custom color picker inside the popover if it is not already visible
		const colorPicker = popover.locator( '.components-color-picker' );
		if ( ! ( await colorPicker.isVisible() ) ) {
			const customColorBtn = popover.locator(
				'.components-color-palette__custom-color-button, .components-color-palette__custom-color, button[aria-label*="Custom color"]'
			).first();
			await expect( customColorBtn ).toBeVisible();
			await customColorBtn.click();
		}

		await expect( colorPicker ).toBeVisible();
		const hexInput = colorPicker.locator( 'input[type="text"], input.components-input-control__input' ).first();
		await expect( hexInput ).toBeVisible();

		// WordPress 6.4+ HexInput renders a '#' prefix addon and expects the 6-char hex without '#'
		const hasHashPrefix = ( await colorPicker.locator( '.components-input-control__prefix', { hasText: '#' } ).count() ) > 0;
		const cleanHex = hexColor.replace( /^#/, '' );
		const valueToFill = hasHashPrefix ? cleanHex : `#${ cleanHex }`;

		const response = await this.waitForSettingsSave( seriesId, async () => {
			await hexInput.fill( valueToFill );
		} );

		// Close the color picker popover
		await this.page.keyboard.press( 'Escape' );
		if ( await popover.isVisible() ) {
			await this.page.keyboard.press( 'Escape' );
		}

		return response;
	}

	/**
	 * Expand the collapsible "Border" or "Dimensions" panel inside `StyleTab`.
	 *
	 * @param {'Border' | 'Dimensions'} panelTitle
	 */
	async expandStylePanel( panelTitle ) {
		const toggleBtn = this.styleTabContent
			.locator( 'button.components-panel__body-toggle' )
			.filter( { hasText: panelTitle } )
			.first();

		await expect( toggleBtn ).toBeVisible();
		const isExpanded = await toggleBtn.getAttribute( 'aria-expanded' );
		if ( isExpanded === 'false' ) {
			await toggleBtn.click();
		}
		await expect( toggleBtn ).toHaveAttribute( 'aria-expanded', 'true' );
	}

	/**
	 * Expand the "Border" panel in `StyleTab`, set a custom border width, and wait for the debounced REST save.
	 *
	 * @param {number|string} widthValue Numeric width in px (e.g., `4`).
	 * @param {number} seriesId
	 * @returns {Promise<import('@playwright/test').Response>}
	 */
	async setBorderWidth( widthValue, seriesId ) {
		await this.expandStylePanel( 'Border' );

		const borderPanel = this.styleTabContent
			.locator( '.components-panel__body' )
			.filter( { has: this.page.locator( 'button.components-panel__body-toggle', { hasText: 'Border' } ) } )
			.first();

		const widthInput = borderPanel.locator( 'input[type="number"], input.components-input-control__input' ).first();
		await expect( widthInput ).toBeVisible();

		return await this.waitForSettingsSave( seriesId, async () => {
			await widthInput.fill( String( widthValue ) );
		} );
	}

	/**
	 * Click the "Reset to default styles" button in `StyleTab` and wait for the REST save to complete.
	 *
	 * @param {number} seriesId
	 * @returns {Promise<import('@playwright/test').Response>}
	 */
	async resetStylesToDefault( seriesId ) {
		await expect( this.resetStylesBtn ).toBeVisible();
		return await this.waitForSettingsSave( seriesId, async () => {
			await this.resetStylesBtn.click();
		} );
	}

	/**
	 * Resolve the `.sc-series-box[data-sm-series-term-id="<id>"]` preview wrapper inside the editor canvas
	 * (works seamlessly whether Gutenberg uses `iframe[name="editor-canvas"]` or direct DOM).
	 *
	 * @param {number} seriesId
	 * @returns {Promise<import('@playwright/test').Locator>}
	 */
	async getCanvasSeriesWrapper( seriesId ) {
		const canvas = await getEditorCanvas( this.page );
		return canvas.locator( `[data-sm-series-term-id="${ seriesId }"]` ).first();
	}

	/**
	 * Return the locator for the active layout variant container inside the editor canvas block preview
	 * (`.seriescraft-layout-link-list`, `.seriescraft-layout-link-grid`, `.seriescraft-layout-media-list`, or `.seriescraft-layout-media-grid`).
	 *
	 * @param {number} seriesId
	 * @param {'link-list' | 'link-grid' | 'media-list' | 'media-grid'} variantSlug
	 * @returns {Promise<import('@playwright/test').Locator>}
	 */
	async getCanvasVariantContainer( seriesId, variantSlug ) {
		const wrapper = await this.getCanvasSeriesWrapper( seriesId );
		return wrapper.locator( `.seriescraft-layout-${ variantSlug }` );
	}

	/**
	 * Read the value of a `--sc-*` CSS custom property on `[data-sm-series-term-id="<id>"]`
	 * inside the editor canvas (checking inline style first, then computed style).
	 *
	 * @param {number} seriesId
	 * @param {string} cssVarName e.g. `'--sc-title-color'`, `'--sc-header-bg'`, `'--sc-button-color'`, `'--sc-border-width'`.
	 * @returns {Promise<string>}
	 */
	async getCanvasCssVariable( seriesId, cssVarName ) {
		const wrapper = await this.getCanvasSeriesWrapper( seriesId );
		await expect( wrapper ).toBeVisible();

		return await wrapper.evaluate( ( el, varName ) => {
			const htmlEl = /** @type {HTMLElement} */ ( el );
			const inlineVal = htmlEl.style.getPropertyValue( varName )?.trim();
			if ( inlineVal ) {
				return inlineVal;
			}
			const win = htmlEl.ownerDocument?.defaultView || window;
			return win.getComputedStyle( htmlEl ).getPropertyValue( varName )?.trim() || '';
		}, cssVarName );
	}
}

