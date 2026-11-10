// @ts-check
import { expect } from '@playwright/test';

/**
 * Gutenberg Block Editor E2E Helper Utilities for SeriesCraft.
 */

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
	if ( ( await iframeLocator.count() ) > 0 ) {
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
	await page.evaluate( () => {
		// @ts-ignore
		window.wp?.data?.dispatch?.( 'core/edit-post' )?.openGeneralSidebar?.( 'edit-post/document' );
	} );

	const panel = page.locator( '.seriescraft-document-settings-panel' );
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
 */
export async function openSeriesSettingsSidebar( page ) {
	await page.evaluate( () => {
		// @ts-ignore
		window.wp?.data?.dispatch?.( 'core/edit-post' )?.openGeneralSidebar?.( 'series-craft-settings/series-craft-settings' );
		// @ts-ignore
		window.wp?.data?.dispatch?.( 'core/edit-post' )?.openGeneralSidebar?.( 'series-craft-settings' );
	} );

	// Fallback: click the pinned sidebar button if not already open
	const sidebarContent = page.locator( '.seriescraft-settings-sidebar' );
	if ( ! ( await sidebarContent.isVisible() ) ) {
		const pinnedButton = page.locator( 'button[aria-label="Series Settings"]' );
		if ( ( await pinnedButton.count() ) > 0 ) {
			await pinnedButton.first().click();
		}
	}

	await expect( sidebarContent ).toBeVisible();
	return sidebarContent;
}

