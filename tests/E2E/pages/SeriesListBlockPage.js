// @ts-check
/**
 * E2E Page Object Model: SeriesListBlockPage
 *
 * Encapsulates all CSS selectors, Gutenberg Block Inspector interactions, editor canvas
 * preview locators, and published frontend archive card grid assertions for the standalone
 * `seriescraft/series-list` Gutenberg block (`Edit`, `ModeSelector`, `UserSelector`,
 * `SeriesPreviewCard`, and `FrontendRenderer::render_series_listing`).
 *
 * @covers
 * - Backend (PHP): src/src/Core/Main.php, src/src/Frontend/FrontendRenderer.php
 * - Frontend (JS/React): resources/js/blocks/series-list/index.js, resources/js/blocks/series-list/edit.js, resources/js/blocks/series-list/save.js, resources/js/blocks/series-list/block.json, resources/js/blocks/series-list/components/ModeSelector.js, resources/js/blocks/series-list/components/UserSelector.js, resources/js/blocks/series-list/components/SeriesPreviewCard.js
 * - Helpers: tests/E2E/helpers/editor.js
 *
 * Test Scenarios:
 * 1. Insert the standalone `seriescraft/series-list` block on an unassigned post/page and inspect the editor canvas empty preview (`.sc-series-empty-preview`) and Block Inspector `SeriesPreviewCard` states.
 * 2. Configure Block Inspector controls (`ModeSelector` for `all`, `top`, and `user` modes, `Limit` range control, and `UserSelector`), save the post, and inspect the published `.sc-series-card-grid` archive output (cards, part count badges, ordering, and archive links) on the frontend.
 */

import { expect } from '@playwright/test';
import {
	openNewPostInEditor,
	openPostInEditor,
	dismissWelcomeGuide,
	getEditorCanvas,
} from '../helpers/editor.js';

export class SeriesListBlockPage {
	/**
	 * @param {import('@playwright/test').Page} page
	 */
	constructor( page ) {
		this.page = page;

		// Block Inspector sidebar locators
		this.inspectorSidebar = page.locator( '.interface-complementary-area' );
		this.displayModePanel = this.inspectorSidebar
			.locator( '.components-panel__body' )
			.filter( { has: page.locator( '.components-panel__body-toggle', { hasText: 'Series Display Mode' } ) } )
			.first();

		this.modeSelect = this.displayModePanel.getByLabel( 'MODE', { exact: true } );
		this.limitNumberInput = this.displayModePanel
			.locator( 'input[type="number"]' )
			.first();
		this.userSelect = this.displayModePanel.getByLabel( 'SELECT USER', { exact: true } );

		// Inspector SeriesPreviewCard locators
		this.inspectorPreviewCard = this.displayModePanel.locator( '[data-testid="series-preview-card"]' );
		this.inspectorCountBadge = this.inspectorPreviewCard.locator( '[data-testid="series-count-badge"]' );
		this.inspectorEmptyState = this.inspectorPreviewCard.locator( '[data-testid="series-preview-empty"]' );
		this.inspectorPreviewItems = this.inspectorPreviewCard.locator(
			'[data-testid="series-preview-card-list"] li.sc-series-preview-card__item'
		);

		// Frontend archive listing locators
		this.frontendCardGrid = page.locator( '.sc-series-card-grid.wp-block-seriescraft-series-list' );
		this.frontendEmptyListing = page.locator( '.sc-series-listing-empty' );
		this.frontendSeriesCards = this.frontendCardGrid.locator( 'article.sc-series-card' );
	}

	/**
	 * Open a new post in the Gutenberg Block Editor.
	 *
	 * @param {string} [postType='post']
	 */
	async openNewUnassignedPost( postType = 'post' ) {
		await openNewPostInEditor( this.page, postType );
	}

	/**
	 * Open an existing post by ID in the Gutenberg Block Editor.
	 *
	 * @param {number} postId
	 */
	async openExistingPost( postId ) {
		await openPostInEditor( this.page, postId );
	}

	/**
	 * Insert a `seriescraft/series-list` block into the editor (if not already present),
	 * select it, and open the Block Inspector sidebar.
	 * Waits for Gutenberg hydration (`__unstableIsEditorReady`) first so `usePostSavingSync`'s
	 * initial mount effect has settled before inserting a standalone block on an unassigned post.
	 *
	 * @param {Record<string, any>} [initialAttributes={}]
	 */
	async insertAndSelectSeriesListBlock( initialAttributes = {} ) {
		await dismissWelcomeGuide( this.page );

		// Wait until Gutenberg finishes initial post hydration
		await expect.poll( async () => {
			return await this.page.evaluate( () => {
				// @ts-ignore
				const editor = window.wp?.data?.select?.( 'core/editor' );
				if ( ! editor ) {
					return false;
				}
				const isReady = typeof editor.__unstableIsEditorReady === 'function'
					? editor.__unstableIsEditorReady()
					: true;
				return Boolean( isReady && editor.getCurrentPostId?.() > 0 );
			} );
		} ).toBe( true );

		await this.page.evaluate( ( attrs ) => {
			// @ts-ignore
			const blockEditorSelect = window.wp?.data?.select?.( 'core/block-editor' );
			// @ts-ignore
			const blockEditorDispatch = window.wp?.data?.dispatch?.( 'core/block-editor' );
			// @ts-ignore
			const blocksApi = window.wp?.blocks;

			if ( ! blockEditorSelect || ! blockEditorDispatch || ! blocksApi ) {
				return;
			}

			const existingBlocks = blockEditorSelect.getBlocks?.() || [];
			let targetBlock = existingBlocks.find(
				( /** @type {any} */ b ) => b.name === 'seriescraft/series-list'
			);

			if ( ! targetBlock ) {
				targetBlock = blocksApi.createBlock( 'seriescraft/series-list', attrs );
				blockEditorDispatch.insertBlocks( targetBlock );
			} else if ( Object.keys( attrs ).length > 0 ) {
				blockEditorDispatch.updateBlockAttributes( targetBlock.clientId, attrs );
			}

			if ( targetBlock?.clientId ) {
				blockEditorDispatch.selectBlock( targetBlock.clientId );
			}
		}, initialAttributes );

		await this.openBlockInspectorSidebar();
	}

	/**
	 * Select the existing `seriescraft/series-list` block in the editor and ensure
	 * the "Block" Inspector sidebar tab (`edit-post/block`) and "Series Display Mode" panel are open.
	 */
	async openBlockInspectorSidebar() {
		await dismissWelcomeGuide( this.page );

		// Wait until Gutenberg finishes parsing post blocks and the 'seriescraft/series-list' block is present
		await expect.poll( async () => {
			return await this.page.evaluate( () => {
				// @ts-ignore
				const blockEditorSelect = window.wp?.data?.select?.( 'core/block-editor' );
				const existingBlocks = blockEditorSelect?.getBlocks?.() || [];
				return existingBlocks.some( ( /** @type {any} */ b ) => b.name === 'seriescraft/series-list' );
			} );
		} ).toBe( true );

		await this.page.evaluate( () => {
			// @ts-ignore
			const blockEditorSelect = window.wp?.data?.select?.( 'core/block-editor' );
			// @ts-ignore
			const blockEditorDispatch = window.wp?.data?.dispatch?.( 'core/block-editor' );
			const existingBlocks = blockEditorSelect?.getBlocks?.() || [];
			const targetBlock = existingBlocks.find(
				( /** @type {any} */ b ) => b.name === 'seriescraft/series-list'
			);
			if ( targetBlock?.clientId ) {
				blockEditorDispatch?.selectBlock?.( targetBlock.clientId );
			}

			// @ts-ignore
			window.wp?.data?.dispatch?.( 'core/edit-post' )?.openGeneralSidebar?.( 'edit-post/block' );
			// @ts-ignore
			window.wp?.data?.dispatch?.( 'core/interface' )?.enableComplementaryArea?.(
				'core/edit-post',
				'edit-post/block'
			);
		} );

		if ( ! ( await this.displayModePanel.isVisible() ) ) {
			const blockTab = this.page.locator(
				'button[data-tab-id="edit-post/block"], .interface-complementary-area-header button[role="tab"]:has-text("Block")'
			);
			if ( ( await blockTab.count() ) > 0 && ( await blockTab.first().isVisible() ) ) {
				await blockTab.first().click();
			} else {
				const settingsToggle = this.page.locator( 'button[aria-label="Settings"]' );
				if ( ( await settingsToggle.count() ) > 0 && ( await settingsToggle.first().isVisible() ) ) {
					await settingsToggle.first().click();
					if ( ( await blockTab.count() ) > 0 && ( await blockTab.first().isVisible() ) ) {
						await blockTab.first().click();
					}
				}
			}
		}

		await expect( this.displayModePanel ).toBeVisible();

		// Expand the "Series Display Mode" PanelBody if collapsed
		const toggleBtn = this.displayModePanel.locator( '.components-panel__body-toggle' ).first();
		if ( ( await toggleBtn.count() ) > 0 ) {
			const isExpanded = await toggleBtn.getAttribute( 'aria-expanded' );
			if ( isExpanded === 'false' ) {
				await toggleBtn.click();
			}
		}
	}

	/**
	 * Return the locator for the `.sc-series-empty-preview` placeholder inside the editor canvas.
	 *
	 * @returns {Promise<import('@playwright/test').Locator>}
	 */
	async getCanvasEmptyPreview() {
		const canvas = await getEditorCanvas( this.page );
		return canvas.locator( '.sc-series-empty-preview' );
	}

	/**
	 * Select a display mode (`all`, `top`, or `user`) in the Block Inspector `ModeSelector`.
	 *
	 * @param {'all' | 'top' | 'user'} mode
	 */
	async selectDisplayMode( mode ) {
		await expect( this.modeSelect ).toBeVisible();
		await this.modeSelect.selectOption( mode );
		await expect( this.modeSelect ).toHaveValue( mode );
	}

	/**
	 * Set the series limit in the Block Inspector `RangeControl` (only visible when `mode === 'top'`).
	 *
	 * @param {number} limit
	 */
	async setTopSeriesLimit( limit ) {
		await expect( this.limitNumberInput ).toBeVisible();
		await this.limitNumberInput.fill( String( limit ) );
	}

	/**
	 * Select a user by ID in the Block Inspector `UserSelector` (only visible when `mode === 'user'`).
	 *
	 * @param {number} userId
	 */
	async selectUserFilter( userId ) {
		await expect( this.userSelect ).toBeVisible();
		await expect(
			this.userSelect.locator( `option[value="${ userId }"]` )
		).toBeAttached();
		await this.userSelect.selectOption( String( userId ) );
		await expect( this.userSelect ).toHaveValue( String( userId ) );
	}

	/**
	 * Return the list of series names currently displayed inside the Block Inspector `SeriesPreviewCard`.
	 *
	 * @returns {Promise<string[]>}
	 */
	async getInspectorPreviewTitles() {
		await expect( this.inspectorPreviewCard ).toBeVisible();
		return await this.inspectorPreviewItems
			.locator( '.sc-series-preview-card__item-title' )
			.allInnerTexts();
	}

	/**
	 * Save the current post in the Gutenberg editor via `@wordpress/data` and wait for save completion.
	 */
	async savePostInEditor() {
		await this.page.evaluate( async () => {
			// @ts-ignore
			await window.wp?.data?.dispatch?.( 'core/editor' )?.savePost?.();
		} );

		await expect.poll( async () => {
			return await this.page.evaluate( () => {
				// @ts-ignore
				const editorSelect = window.wp?.data?.select?.( 'core/editor' );
				return Boolean( editorSelect?.isSavingPost?.() || editorSelect?.isAutosavingPost?.() );
			} );
		} ).toBe( false );
	}

	/**
	 * Navigate to a published post/page URL on the frontend.
	 *
	 * @param {string} postUrl
	 */
	async gotoFrontendPost( postUrl ) {
		await this.page.goto( postUrl );
	}

	/**
	 * Locate a specific `.sc-series-card` on the frontend by its series title.
	 *
	 * @param {string} seriesName
	 * @returns {import('@playwright/test').Locator}
	 */
	getFrontendCardByTitle( seriesName ) {
		return this.frontendSeriesCards.filter( {
			has: this.page.locator( '.sc-series-card__title', { hasText: seriesName } ),
		} );
	}

	/**
	 * Return the ordered array of series card titles rendered inside `.sc-series-card-grid` on the frontend.
	 *
	 * @returns {Promise<string[]>}
	 */
	async getFrontendCardTitles() {
		await expect( this.frontendCardGrid ).toBeVisible();
		return await this.frontendSeriesCards
			.locator( '.sc-series-card__title' )
			.allInnerTexts();
	}

	/**
	 * Return the part count badge text (`.sc-series-card__badge`) for a specific series card on the frontend.
	 *
	 * @param {string} seriesName
	 * @returns {Promise<string>}
	 */
	async getFrontendCardBadgeText( seriesName ) {
		const card = this.getFrontendCardByTitle( seriesName );
		await expect( card ).toBeVisible();
		return ( await card.locator( '.sc-series-card__badge' ).innerText() ).trim();
	}

	/**
	 * Return the archive link `href` for a specific series card on the frontend.
	 *
	 * @param {string} seriesName
	 * @returns {Promise<string>}
	 */
	async getFrontendCardLinkHref( seriesName ) {
		const card = this.getFrontendCardByTitle( seriesName );
		await expect( card ).toBeVisible();
		return ( await card.locator( '.sc-series-card__title a' ).getAttribute( 'href' ) ) || '';
	}
}

