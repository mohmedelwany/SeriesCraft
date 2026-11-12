// @ts-check
/**
 * E2E Page Object Model: EditorSeriesPanelPage
 *
 * Encapsulates all CSS selectors, DOM locators, HTML5 drag-and-drop interactions,
 * and editor canvas assertions for the Gutenberg Document Settings "Series" panel
 * (`SeriesDocumentSettingsPanel`, `SeriesSelector`, `PartOrderList`, `DraggableItem`)
 * and automatic `seriescraft/series-list` block synchronization.
 *
 * @covers
 * - Backend (PHP): src/src/Taxonomy/SeriesTaxonomy.php, src/src/Api/Controllers/SeriesRestController.php, src/src/Frontend/FrontendRenderer.php, src/src/Hooks/SavePostSubscriber.php
 * - Frontend (JS/React): resources/js/editor/sidebar/index.js, resources/js/editor/sidebar/SeriesSelector.js, resources/js/editor/sidebar/PartOrderList.js, resources/js/editor/sidebar/DraggableItem.js, resources/js/hooks/usePostSavingSync.js, resources/js/hooks/useSeries.js, resources/js/hooks/useSeriesOrder.js, resources/js/blocks/series-list/edit.js
 * - Helpers: tests/E2E/helpers/editor.js
 *
 * Test Scenarios:
 * 1. Open posts in the Block Editor, open the Document Settings "Series" panel, and verify removal of the core taxonomy panel.
 * 2. Assign an existing series via the `SeriesSelector` dropdown and inspect `.seriescraft-series-card`.
 * 3. Create a new series inline via the `+ Add New Series` form and retrieve its assigned term ID.
 * 4. Reorder parts in `PartOrderList` via HTML5 drag-and-drop and inspect both sidebar order and live canvas block preview.
 * 5. Remove a post from a series via `.seriescraft-remove-series-btn` and verify canvas block auto-removal.
 */

import { expect } from '@playwright/test';
import {
	openNewPostInEditor,
	openPostInEditor,
	openSeriesDocumentPanel,
	getEditorCanvas,
} from '../helpers/editor.js';

export class EditorSeriesPanelPage {
	/**
	 * @param {import('@playwright/test').Page} page
	 */
	constructor( page ) {
		this.page = page;
		this.panel = page.locator( '.seriescraft-document-settings-panel' );
		this.seriesSelector = this.panel.locator( '[data-testid="seriescraft-series-selector"]' );
		this.assignDropdown = this.seriesSelector.locator( 'select' );
		this.addSeriesToggleBtn = this.seriesSelector.locator( 'button.seriescraft-add-series-toggle' );
		this.inlineCreateForm = this.seriesSelector.locator( '[data-testid="seriescraft-inline-create-form"]' );
		this.inlineNameInput = this.inlineCreateForm.locator( '.seriescraft-inline-input input' );
		this.inlineSubmitBtn = this.inlineCreateForm.locator( 'button.seriescraft-inline-submit-btn' );
		this.inlineCancelBtn = this.inlineCreateForm.locator( 'button.seriescraft-cancel-create-btn' );
		this.seriesCards = this.panel.locator( '.seriescraft-series-card' );
		this.orderNotice = this.panel.locator( '.seriescraft-order-notice' );
	}

	/**
	 * Open a new post in the Gutenberg Block Editor and expand the "Series" Document Settings panel.
	 */
	async openNewPostAndSeriesPanel() {
		await openNewPostInEditor( this.page );
		await openSeriesDocumentPanel( this.page );
	}

	/**
	 * Open an existing post by ID in the Gutenberg Block Editor and expand the "Series" Document Settings panel.
	 *
	 * @param {number} postId
	 */
	async openPostAndSeriesPanel( postId ) {
		await openPostInEditor( this.page, postId );
		await openSeriesDocumentPanel( this.page );
	}

	/**
	 * Check whether the default core taxonomy panel (`taxonomy-panel-series`) has been removed
	 * from the Gutenberg editor store and DOM.
	 *
	 * @returns {Promise<boolean>}
	 */
	async isCoreTaxonomyPanelRemoved() {
		const isEnabledInStore = await this.page.evaluate( () => {
			// @ts-ignore
			const editPostSelect = window.wp?.data?.select?.( 'core/edit-post' );
			if ( typeof editPostSelect?.isEditorPanelEnabled === 'function' ) {
				return editPostSelect.isEditorPanelEnabled( 'taxonomy-panel-series' );
			}
			// @ts-ignore
			const editorSelect = window.wp?.data?.select?.( 'core/editor' );
			if ( typeof editorSelect?.isEditorPanelEnabled === 'function' ) {
				return editorSelect.isEditorPanelEnabled( 'taxonomy-panel-series' );
			}
			return false;
		} );

		if ( isEnabledInStore ) {
			return false;
		}

		// Ensure only 1 "Series" panel exists in the Document sidebar (our custom panel)
		const seriesPanelToggles = this.page.locator(
			'.interface-complementary-area .components-panel__body-toggle',
			{ hasText: /^Series$/ }
		);
		return ( await seriesPanelToggles.count() ) === 1;
	}

	/**
	 * Select an existing series from the "Assign Series" dropdown by its numeric term ID.
	 * Because auto-inserting `seriescraft/series-list` causes Gutenberg to focus the new block
	 * and switch the sidebar to the "Block" tab, this method switches back to the "Post" tab.
	 *
	 * @param {number} seriesId
	 */
	async assignSeriesById( seriesId ) {
		await expect( this.assignDropdown ).toBeVisible();
		await expect(
			this.assignDropdown.locator( `option[value="${ seriesId }"]` )
		).toBeAttached();
		await this.assignDropdown.selectOption( String( seriesId ) );

		// Wait for block auto-insertion to settle, then ensure the "Post" document sidebar tab is active
		await expect.poll( async () => {
			const names = await this.getEditorBlockNames();
			return names.includes( 'seriescraft/series-list' );
		} ).toBe( true );

		await openSeriesDocumentPanel( this.page );
	}

	/**
	 * Create a new series inline via the "+ Add New Series" toggle form and return the created series ID.
	 * Switches back to the "Post" document sidebar tab after Gutenberg auto-inserts and focuses the block.
	 *
	 * @param {string} seriesName
	 * @returns {Promise<number>} Created series term ID.
	 */
	async createSeriesInline( seriesName ) {
		await expect( this.addSeriesToggleBtn ).toBeVisible();
		await this.addSeriesToggleBtn.click();

		await expect( this.inlineCreateForm ).toBeVisible();
		await this.inlineNameInput.fill( seriesName );
		await this.inlineSubmitBtn.click();

		// Wait for the created series to be assigned in core/editor and the block to be auto-inserted
		await expect.poll( async () => {
			return await this.page.evaluate( () => {
				// @ts-ignore
				const rawSeries = window.wp?.data?.select?.( 'core/editor' )?.getEditedPostAttribute?.( 'series' );
				return Array.isArray( rawSeries ) && rawSeries.length > 0 ? Number( rawSeries[ rawSeries.length - 1 ] ) : 0;
			} );
		} ).toBeGreaterThan( 0 );

		await openSeriesDocumentPanel( this.page );

		const card = this.getSeriesCardByName( seriesName );
		await expect( card ).toBeVisible();

		// Retrieve the assigned series ID from core/editor store so tests can track & clean it up
		const createdId = await this.page.evaluate( () => {
			// @ts-ignore
			const rawSeries = window.wp?.data?.select?.( 'core/editor' )?.getEditedPostAttribute?.( 'series' );
			if ( Array.isArray( rawSeries ) && rawSeries.length > 0 ) {
				return Number( rawSeries[ rawSeries.length - 1 ] );
			}
			return 0;
		} );

		return createdId;
	}

	/**
	 * Locate a `.seriescraft-series-card` in the sidebar by series name (or first card if omitted).
	 *
	 * @param {string} [seriesName]
	 * @returns {import('@playwright/test').Locator}
	 */
	getSeriesCardByName( seriesName ) {
		if ( seriesName ) {
			return this.seriesCards.filter( {
				has: this.page.locator( '.seriescraft-series-card-title', { hasText: seriesName } ),
			} );
		}
		return this.seriesCards.first();
	}

	/**
	 * Get all draggable part items inside a series card's `PartOrderList`.
	 *
	 * @param {string} [seriesName]
	 * @returns {import('@playwright/test').Locator}
	 */
	getDraggableItems( seriesName ) {
		return this.getSeriesCardByName( seriesName ).locator( 'li.seriescraft-draggable-item' );
	}

	/**
	 * Return the ordered list of post titles currently displayed inside `PartOrderList`.
	 *
	 * @param {string} [seriesName]
	 * @returns {Promise<string[]>}
	 */
	async getSidebarOrderedTitles( seriesName ) {
		const items = this.getDraggableItems( seriesName );
		return await items.locator( '.seriescraft-item-title' ).allInnerTexts();
	}

	/**
	 * Reorder a post item inside `PartOrderList` from `sourceIndex` to `targetIndex`
	 * using HTML5 Drag and Drop events (`dragstart` -> `dragenter` -> `dragover` -> `drop` -> `dragend`).
	 *
	 * @param {number} sourceIndex 0-based index of item to drag.
	 * @param {number} targetIndex 0-based index of drop target.
	 * @param {string} [seriesName]
	 */
	async reorderPartInSidebar( sourceIndex, targetIndex, seriesName ) {
		const items = this.getDraggableItems( seriesName );
		const sourceItem = items.nth( sourceIndex );
		const targetItem = items.nth( targetIndex );

		await expect( sourceItem ).toBeVisible();
		await expect( targetItem ).toBeVisible();

		const dataTransfer = await this.page.evaluateHandle( () => new DataTransfer() );

		await sourceItem.dispatchEvent( 'dragstart', { dataTransfer } );
		await targetItem.dispatchEvent( 'dragenter', { dataTransfer } );
		await targetItem.dispatchEvent( 'dragover', { dataTransfer } );
		await targetItem.dispatchEvent( 'drop', { dataTransfer } );
		await sourceItem.dispatchEvent( 'dragend', { dataTransfer } );
	}

	/**
	 * Click the remove series button (`.seriescraft-remove-series-btn`) on the specified series card.
	 *
	 * @param {string} [seriesName]
	 */
	async removeSeriesFromPost( seriesName ) {
		const card = this.getSeriesCardByName( seriesName );
		const removeBtn = card.locator( 'button.seriescraft-remove-series-btn' );
		await expect( removeBtn ).toBeVisible();
		await removeBtn.click();
	}

	/**
	 * Return the ordered array of block names currently present in the Gutenberg editor store.
	 *
	 * @returns {Promise<string[]>}
	 */
	async getEditorBlockNames() {
		return await this.page.evaluate( () => {
			// @ts-ignore
			const blocks = window.wp?.data?.select?.( 'core/block-editor' )?.getBlocks?.() || [];
			return blocks.map( ( /** @type {any} */ b ) => b.name );
		} );
	}

	/**
	 * Resolve the `seriescraft/series-list` block root locator inside the Gutenberg editor canvas
	 * (works seamlessly whether Gutenberg uses `iframe[name="editor-canvas"]` or direct DOM).
	 *
	 * @returns {Promise<import('@playwright/test').Locator>}
	 */
	async getCanvasSeriesBlock() {
		const canvas = await getEditorCanvas( this.page );
		return canvas.locator(
			'[data-type="seriescraft/series-list"], .wp-block-seriescraft-series-list.sc-series-editor-root'
		);
	}

	/**
	 * Return the locator for the rendered `.seriescraft-position-badge` ("Part X of Y") inside the editor canvas block preview.
	 *
	 * @returns {Promise<import('@playwright/test').Locator>}
	 */
	async getCanvasPositionBadge() {
		const block = await this.getCanvasSeriesBlock();
		return block.locator( '.seriescraft-position-badge' );
	}

	/**
	 * Return the locator for the rendered post title elements (`.seriescraft-item .seriescraft-title`)
	 * inside the editor canvas `seriescraft/series-list` block preview.
	 *
	 * @returns {Promise<import('@playwright/test').Locator>}
	 */
	async getCanvasPreviewItemTitlesLocator() {
		const block = await this.getCanvasSeriesBlock();
		return block.locator( '.seriescraft-item .seriescraft-title' );
	}
}

