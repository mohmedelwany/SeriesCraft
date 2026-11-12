// @ts-check
/**
 * E2E Test Suite: Gutenberg Series Appearance Sidebar (Phase 5)
 *
 * Verifies the dedicated "Series Settings" plugin sidebar (`series-craft-settings`) in the
 * Gutenberg Block Editor, including empty/assigned states, per-series layout variant switching
 * (`link-list`, `link-grid`, `media-list`, `media-grid`), custom styling and presets in `StyleTab`,
 * live editor canvas preview updates, and REST API persistence across editor reloads.
 *
 * @covers
 * - Backend (PHP): src/src/Api/Controllers/SeriesRestController.php, src/src/Services/StyleSanitizer.php, src/src/Frontend/FrontendRenderer.php, src/src/Views/Variants/LinkListView.php, src/src/Views/Variants/LinkGridView.php, src/src/Views/Variants/MediaListView.php, src/src/Views/Variants/MediaGridView.php
 * - Frontend (JS/React): resources/js/editor/settings-sidebar/index.js, resources/js/editor/settings-sidebar/SeriesSettingsSidebar.js, resources/js/editor/settings-sidebar/LayoutTab.js, resources/js/editor/settings-sidebar/LayoutVariantSelector.js, resources/js/editor/settings-sidebar/StyleTab.js, resources/js/editor/settings-sidebar/constants.js, resources/js/hooks/useSeriesSettings.js, resources/js/blocks/series-list/edit.js
 * - Page Object: tests/E2E/pages/EditorAppearanceSidebarPage.js
 * - Helpers: tests/E2E/helpers/editor.js, tests/E2E/helpers/api-fixtures.js
 *
 * Test Scenarios:
 * 1. Open Series Settings Drawer: Verify `.seriescraft-no-series-notice` when unassigned, and verify the series title, "Layout" tab, and "Style" tab render properly when assigned to a series.
 * 2. Per-Series Layout Variant Switching: Switch between Link Grid, Media List, Media Grid, and Link List in `LayoutTab`, verify the REST save to `/series-craft/v1/series/<id>/settings`, and confirm the live DOM structure update in the editor canvas block preview.
 * 3. Per-Series Custom Styling & Presets: Modify colors and border styles in `StyleTab`, verify inline `--sc-*` CSS custom properties update on the preview wrapper in the editor canvas, confirm persistence after reloading the editor, and verify resetting to default styles.
 */

import { test, expect } from '@playwright/test';
import { EditorAppearanceSidebarPage } from '../../pages/EditorAppearanceSidebarPage.js';
import {
	FixtureTracker,
	createSeries,
	createPost,
	setSeriesOrder,
} from '../../helpers/api-fixtures.js';

test.describe( 'SeriesCraft Gutenberg Appearance Sidebar', () => {
	/** @type {FixtureTracker} */
	let tracker;

	test.beforeEach( () => {
		tracker = new FixtureTracker();
	} );

	test.afterEach( async ( { page } ) => {
		await tracker.cleanup( page );
	} );

	test( 'Scenario 1: opens the Series Settings drawer and renders Layout and Style tabs', async ( { page } ) => {
		const appearanceSidebar = new EditorAppearanceSidebarPage( page );

		// 1. Verify empty state when no series is assigned to the post
		await appearanceSidebar.openNewPostAndAppearanceSidebar();
		await expect( appearanceSidebar.noSeriesNotice ).toBeVisible();
		await expect( appearanceSidebar.noSeriesNotice ).toContainText(
			'No series selected. Please assign this post to a series to customize its settings.'
		);

		// 2. Seed a series and an assigned post, then open the Series Settings sidebar
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Appearance Drawer Series ${ uniqueSuffix }`,
			},
			tracker
		);
		const post = await createPost(
			page,
			{
				title: `Appearance Drawer Post ${ uniqueSuffix }`,
				content: '<!-- wp:seriescraft/series-list /-->\n<!-- wp:paragraph --><p>Drawer test content.</p><!-- /wp:paragraph -->',
				seriesIds: [ series.id ],
			},
			tracker
		);

		await appearanceSidebar.openPostAndAppearanceSidebar( post.id );

		// Verify series header and Layout/Style tabs render properly
		await expect( appearanceSidebar.settingsContainer ).toBeVisible();
		await expect( appearanceSidebar.seriesTitle ).toContainText( `series: ${ series.name }` );
		await expect( appearanceSidebar.layoutTabBtn ).toBeVisible();
		await expect( appearanceSidebar.styleTabBtn ).toBeVisible();

		// Layout tab is active by default and displays all 4 variant cards
		await expect( appearanceSidebar.layoutTabBtn ).toHaveClass( /is-active/ );
		await expect( appearanceSidebar.layoutTabContent ).toBeVisible();
		for ( const variant of /** @type {const} */ ( [ 'media-grid', 'link-grid', 'media-list', 'link-list' ] ) ) {
			await expect( appearanceSidebar.getLayoutCard( variant ) ).toBeVisible();
		}

		// Switch to Style tab and verify its controls render
		await appearanceSidebar.openStyleTab();
		await expect( appearanceSidebar.resetStylesBtn ).toBeVisible();

		// Switch back to Layout tab
		await appearanceSidebar.openLayoutTab();
	} );

	test( 'Scenario 2: switches per-series layout variants in LayoutTab and live-updates the editor block preview', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Layout Variants Series ${ uniqueSuffix }`,
				layout: 'link-list',
			},
			tracker
		);

		const post1 = await createPost(
			page,
			{
				title: `Variant Part Alpha ${ uniqueSuffix }`,
				content: '<!-- wp:seriescraft/series-list /-->\n<!-- wp:paragraph --><p>Alpha content.</p><!-- /wp:paragraph -->',
				seriesIds: [ series.id ],
			},
			tracker
		);
		const post2 = await createPost(
			page,
			{
				title: `Variant Part Beta ${ uniqueSuffix }`,
				content: '<!-- wp:seriescraft/series-list /-->\n<!-- wp:paragraph --><p>Beta content.</p><!-- /wp:paragraph -->',
				seriesIds: [ series.id ],
			},
			tracker
		);
		await setSeriesOrder( page, series.id, [ post1.id, post2.id ] );

		const appearanceSidebar = new EditorAppearanceSidebarPage( page );
		await appearanceSidebar.openPostAndAppearanceSidebar( post1.id );

		// Wait for initial block preview (link-list) to render in the editor canvas
		const initialVariant = await appearanceSidebar.getCanvasVariantContainer( series.id, 'link-list' );
		await expect( initialVariant ).toBeVisible( { timeout: 15000 } );

		/** @type {Array<'link-grid' | 'media-list' | 'media-grid' | 'link-list'>} */
		const variantsToTest = [ 'link-grid', 'media-list', 'media-grid', 'link-list' ];

		for ( const variant of variantsToTest ) {
			const response = await appearanceSidebar.selectLayoutVariant( variant, series.id );
			expect( response.status() ).toBe( 200 );

			const responseBody = await response.json();
			expect( responseBody?.settings?.layout ?? responseBody?.layout ).toBe( variant );

			// Verify the live ServerSideRender block preview inside the editor canvas updates to the selected variant
			const variantContainer = await appearanceSidebar.getCanvasVariantContainer( series.id, variant );
			await expect( variantContainer ).toBeVisible( { timeout: 15000 } );
		}
	} );

	test( 'Scenario 3: customizes per-series styles in StyleTab, updates live --sc-* CSS variables, and persists across reloads', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Custom Style Series ${ uniqueSuffix }`,
				layout: 'link-list',
			},
			tracker
		);

		const post = await createPost(
			page,
			{
				title: `Styled Series Post ${ uniqueSuffix }`,
				content: '<!-- wp:seriescraft/series-list /-->\n<!-- wp:paragraph --><p>Styled content.</p><!-- /wp:paragraph -->',
				seriesIds: [ series.id ],
			},
			tracker
		);

		const appearanceSidebar = new EditorAppearanceSidebarPage( page );
		await appearanceSidebar.openPostAndAppearanceSidebar( post.id );

		// Wait for the series preview box to be visible in the canvas
		const canvasWrapper = await appearanceSidebar.getCanvasSeriesWrapper( series.id );
		await expect( canvasWrapper ).toBeVisible( { timeout: 15000 } );

		// Switch to the Style tab
		await appearanceSidebar.openStyleTab();

		// 1. Customize Title Color, Header Background Color, Button Color, and Border Width
		const titleResp = await appearanceSidebar.setCustomColor( 'Title', '#d63638', series.id );
		expect( titleResp.status() ).toBe( 200 );

		const headerBgResp = await appearanceSidebar.setCustomColor( 'Header Background', '#fef2f2', series.id );
		expect( headerBgResp.status() ).toBe( 200 );

		const buttonColorResp = await appearanceSidebar.setCustomColor( 'Button', '#991b1b', series.id );
		expect( buttonColorResp.status() ).toBe( 200 );

		const borderResp = await appearanceSidebar.setBorderWidth( 4, series.id );
		expect( borderResp.status() ).toBe( 200 );

		// 2. Verify inline --sc-* CSS custom properties updated immediately on the preview wrapper in the editor canvas
		await expect.poll( async () => {
			return ( await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-title-color' ) ).toLowerCase();
		} ).toBe( '#d63638' );

		await expect.poll( async () => {
			return ( await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-header-bg' ) ).toLowerCase();
		} ).toBe( '#fef2f2' );

		await expect.poll( async () => {
			return ( await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-button-color' ) ).toLowerCase();
		} ).toBe( '#991b1b' );

		await expect.poll( async () => {
			return await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-border-width' );
		} ).toBe( '4px' );

		// 3. Reload the editor and confirm the custom --sc-* styles persist
		await appearanceSidebar.openPostAndAppearanceSidebar( post.id );
		const reloadedWrapper = await appearanceSidebar.getCanvasSeriesWrapper( series.id );
		await expect( reloadedWrapper ).toBeVisible( { timeout: 15000 } );

		await expect.poll( async () => {
			return ( await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-title-color' ) ).toLowerCase();
		} ).toBe( '#d63638' );

		await expect.poll( async () => {
			return ( await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-header-bg' ) ).toLowerCase();
		} ).toBe( '#fef2f2' );

		await expect.poll( async () => {
			return ( await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-button-color' ) ).toLowerCase();
		} ).toBe( '#991b1b' );

		await expect.poll( async () => {
			return await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-border-width' );
		} ).toBe( '4px' );

		// 4. Reset to default styles and verify the canvas variables revert to DEFAULT_STYLE
		await appearanceSidebar.openStyleTab();
		const resetResp = await appearanceSidebar.resetStylesToDefault( series.id );
		expect( resetResp.status() ).toBe( 200 );

		await expect.poll( async () => {
			return ( await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-header-bg' ) ).toLowerCase();
		} ).toBe( '#e8f0fe' );

		await expect.poll( async () => {
			return ( await appearanceSidebar.getCanvasCssVariable( series.id, '--sc-button-color' ) ).toLowerCase();
		} ).toBe( '#0062a2' );
	} );
} );

