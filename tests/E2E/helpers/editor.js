// @ts-check
/**
 * E2E Helper Module: Gutenberg Block Editor Utilities
 *
 * Provides reusable Playwright helpers for opening posts in the Gutenberg Block Editor,
 * dismissing the welcome guide modal, resolving the editor canvas (iframe vs direct DOM),
 * and opening the SeriesCraft Document Settings Panel and Appearance Sidebar.
 *
 * @covers
 * - Backend (PHP): src/src/Assets/EnqueueManager.php, src/src/Core/Main.php
 * - Frontend (JS/React): resources/js/editor/sidebar/index.js, resources/js/editor/settings-sidebar/index.js, resources/js/editor/settings-sidebar/SeriesSettingsSidebar.js
 *
 * @usedBy
 * - tests/E2E/pages/EditorSeriesPanelPage.js
 * - tests/E2E/pages/EditorAppearanceSidebarPage.js
 * - tests/E2E/pages/SeriesListBlockPage.js
 *
 * Exported Utilities:
 * 1. `dismissWelcomeGuide(page)` — Dismisses the Gutenberg welcome guide modal and disables `welcomeGuide` and `fullscreenMode` preferences.
 * 2. `getEditorCanvas(page)` — Resolves the block editor canvas across iframed (`iframe[name="editor-canvas"]`) and non-iframed editors.
 * 3. `openNewPostInEditor(page, postType)` & `openPostInEditor(page, postId)` — Opens new or existing posts in the Block Editor.
 * 4. `openSeriesDocumentPanel(page)` — Opens and expands the SeriesCraft Document Settings Panel (`.seriescraft-document-settings-panel`).
 * 5. `openSeriesSettingsSidebar(page)` — Opens and expands the dedicated SeriesCraft Appearance Sidebar (`series-craft-settings`).
 */

import { expect } from '@playwright/test';

/**
 * Dismiss the Gutenberg "Welcome to the block editor" modal if visible,
 * and disable it via `@wordpress/data` preferences so it does not reappear.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function dismissWelcomeGuide( page ) {
	// Disable welcome guide and fullscreen mode programmatically via wp.data if loaded
	await page.evaluate( () => {
		// @ts-ignore
		const preferencesDispatch = window.wp?.data?.dispatch?.( 'core/preferences' );
		if ( preferencesDispatch?.set ) {
			preferencesDispatch.set( 'core/edit-post', 'welcomeGuide', false );
			preferencesDispatch.set( 'core/edit-post', 'fullscreenMode', false );
		}
		// @ts-ignore
		const editPostDispatch = window.wp?.data?.dispatch?.( 'core/edit-post' );
		if ( editPostDispatch?.toggleFeature ) {
			// @ts-ignore
			const isWelcome = window.wp?.data?.select?.( 'core/edit-post' )?.isFeatureActive?.( 'welcomeGuide' );
			if ( isWelcome ) {
				editPostDispatch.toggleFeature( 'welcomeGuide' );
			}
		}
	} ).catch( () => {} );

	// Also click the close button if the welcome guide dialog is already rendered in DOM
	const welcomeModalClose = page.locator(
		'.edit-post-welcome-guide button[aria-label="Close"], .components-modal__frame .edit-post-welcome-guide .components-modal__header button'
	);
	if ( ( await welcomeModalClose.count() ) > 0 && ( await welcomeModalClose.first().isVisible() ) ) {
		await welcomeModalClose.first().click();
	}
}

/**
 * Resolve the Gutenberg editor canvas (handles both iframe `name="editor-canvas"` in WP 6.3+
 * and direct DOM fallback).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').FrameLocator | import('@playwright/test').Page>}
 */
export async function getEditorCanvas( page ) {
	const iframeLocator = page.locator( 'iframe[name="editor-canvas"]' );
	if ( ( await iframeLocator.count() ) > 0 && ( await iframeLocator.first().isVisible() ) ) {
		return page.frameLocator( 'iframe[name="editor-canvas"]' );
	}
	return page;
}

/**
 * Open a new post in the Gutenberg Block Editor (`/wp-admin/post-new.php`) and wait until ready.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [postType='post']
 */
export async function openNewPostInEditor( page, postType = 'post' ) {
	const url = postType === 'post'
		? '/wp-admin/post-new.php'
		: `/wp-admin/post-new.php?post_type=${ encodeURIComponent( postType ) }`;

	await page.goto( url );
	await page.locator( '.edit-post-layout, .block-editor-page' ).first().waitFor( { state: 'visible' } );
	await dismissWelcomeGuide( page );
}

/**
 * Open an existing post in the Gutenberg Block Editor (`/wp-admin/post.php?post=<id>&action=edit`).
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} postId
 */
export async function openPostInEditor( page, postId ) {
	await page.goto( `/wp-admin/post.php?post=${ postId }&action=edit` );
	await page.locator( '.edit-post-layout, .block-editor-page' ).first().waitFor( { state: 'visible' } );
	await dismissWelcomeGuide( page );
}

/**
 * Ensure the Document Settings sidebar (`edit-post/document`) and the SeriesCraft "Series"
 * panel (`.seriescraft-document-settings-panel`) are open and expanded.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>} Locator for `.seriescraft-document-settings-panel`.
 */
export async function openSeriesDocumentPanel( page ) {
	await dismissWelcomeGuide( page );

	await page.evaluate( () => {
		// @ts-ignore
		window.wp?.data?.dispatch?.( 'core/edit-post' )?.openGeneralSidebar?.( 'edit-post/document' );
		// @ts-ignore
		window.wp?.data?.dispatch?.( 'core/interface' )?.enableComplementaryArea?.( 'core/edit-post', 'edit-post/document' );
	} );

	const panel = page.locator( '.seriescraft-document-settings-panel' );

	// Fallback if sidebar is closed or on the "Block" tab instead of "Post" tab
	if ( ! ( await panel.isVisible() ) ) {
		const postTab = page.locator(
			'button[data-tab-id="edit-post/document"], .interface-complementary-area-header button[role="tab"]:has-text("Post")'
		);
		if ( ( await postTab.count() ) > 0 && ( await postTab.first().isVisible() ) ) {
			await postTab.first().click();
		} else {
			const settingsToggle = page.locator( 'button[aria-label="Settings"]' );
			if ( ( await settingsToggle.count() ) > 0 && ( await settingsToggle.first().isVisible() ) ) {
				await settingsToggle.first().click();
				if ( ( await postTab.count() ) > 0 && ( await postTab.first().isVisible() ) ) {
					await postTab.first().click();
				}
			}
		}
	}

	await expect( panel ).toBeVisible();

	// Expand the panel if it is collapsed
	const toggleButton = panel.locator( '.components-panel__body-toggle' );
	if ( ( await toggleButton.count() ) > 0 ) {
		const isExpanded = await toggleButton.getAttribute( 'aria-expanded' );
		if ( isExpanded === 'false' ) {
			await toggleButton.click();
		}
	}

	return panel;
}

/**
 * Open the dedicated SeriesCraft Appearance Sidebar (`series-craft-settings`).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>} Locator for `.seriescraft-settings-sidebar`.
 */
export async function openSeriesSettingsSidebar( page ) {
	await dismissWelcomeGuide( page );

	await page.evaluate( () => {
		// @ts-ignore
		window.wp?.data?.dispatch?.( 'core/edit-post' )?.openGeneralSidebar?.( 'series-craft-settings/series-craft-settings' );
		// @ts-ignore
		window.wp?.data?.dispatch?.( 'core/interface' )?.enableComplementaryArea?.(
			'core/edit-post',
			'series-craft-settings/series-craft-settings'
		);
	} );

	const sidebarContent = page.locator( '.seriescraft-settings-sidebar:not(.is-in-modal)' );
	if ( ! ( await sidebarContent.isVisible() ) ) {
		const pinnedButton = page.locator( '.interface-pinned-items button[aria-label="Series Settings"]' );
		if ( ( await pinnedButton.count() ) > 0 && ( await pinnedButton.first().isVisible() ) ) {
			await pinnedButton.first().click();
		}
	}

	await expect( sidebarContent ).toBeVisible();

	// Ensure the top-level "Series Settings" PanelBody is expanded
	const toggleButton = sidebarContent.locator( '.components-panel__body-toggle' ).first();
	if ( ( await toggleButton.count() ) > 0 ) {
		const isExpanded = await toggleButton.getAttribute( 'aria-expanded' );
		if ( isExpanded === 'false' ) {
			await toggleButton.click();
		}
	}

	return sidebarContent;
}

