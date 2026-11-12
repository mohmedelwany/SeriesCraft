// @ts-check
/**
 * E2E Test Suite: Standalone `seriescraft/series-list` Gutenberg Block (Phase 6)
 *
 * Verifies the standalone `seriescraft/series-list` Gutenberg block in both the Block Editor
 * and published frontend views, including the unassigned post editor preview placeholder
 * (`.sc-series-empty-preview`), Block Inspector `SeriesPreviewCard`, display mode switching
 * (`all`, `top`, `user`), `Limit` control, `UserSelector`, and frontend `.sc-series-card-grid`
 * archive rendering (cards, descriptions, part count badges, sorting, and archive links).
 *
 * @covers
 * - Backend (PHP): src/src/Core/Main.php, src/src/Frontend/FrontendRenderer.php
 * - Frontend (JS/React): resources/js/blocks/series-list/index.js, resources/js/blocks/series-list/edit.js, resources/js/blocks/series-list/save.js, resources/js/blocks/series-list/block.json, resources/js/blocks/series-list/components/ModeSelector.js, resources/js/blocks/series-list/components/UserSelector.js, resources/js/blocks/series-list/components/SeriesPreviewCard.js
 * - Page Object: tests/E2E/pages/SeriesListBlockPage.js
 * - Helpers: tests/E2E/helpers/editor.js, tests/E2E/helpers/api-fixtures.js
 *
 * Test Scenarios:
 * 1. Empty / Unassigned State & Default Archive Preview: Insert the `seriescraft/series-list` block on an unassigned post and verify `.sc-series-empty-preview` in the editor canvas, `SeriesPreviewCard` in the Block Inspector, and `.sc-series-card-grid` archive rendering on the frontend.
 * 2. Archive Listing Modes (All, Top, User) & Frontend Rendering: Seed multiple series with varying post counts, configure Block Inspector controls (`ModeSelector`, `Limit`, `UserSelector`), save the post, and verify `.sc-series-card` items, `.sc-series-card__badge` part counts, ordering/filtering, and series archive links on the frontend.
 */

import { test, expect } from '@playwright/test';
import { SeriesListBlockPage } from '../../pages/SeriesListBlockPage.js';
import {
	FixtureTracker,
	createSeries,
	createPost,
} from '../../helpers/api-fixtures.js';

test.describe( 'SeriesCraft Standalone Series List Block', () => {
	/** @type {FixtureTracker} */
	let tracker;

	test.beforeEach( () => {
		tracker = new FixtureTracker();
	} );

	test.afterEach( async ( { page } ) => {
		await tracker.cleanup( page );
	} );

	test( 'Scenario 1: renders empty preview prompt in editor on an unassigned post and renders archive card grid on frontend', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Archive Preview Series ${ uniqueSuffix }`,
				description: 'Series description for standalone block preview test.',
			},
			tracker
		);

		const standalonePost = await createPost(
			page,
			{
				title: `Standalone Block Host ${ uniqueSuffix }`,
				content: '<!-- wp:paragraph --><p>Host post without series assignment.</p><!-- /wp:paragraph -->',
				seriesIds: [],
			},
			tracker
		);

		const blockPage = new SeriesListBlockPage( page );
		await blockPage.openExistingPost( standalonePost.id );

		// Insert the standalone 'seriescraft/series-list' block on the unassigned post
		await blockPage.insertAndSelectSeriesListBlock();

		// 1. Verify the editor canvas shows the unassigned post empty preview prompt (.sc-series-empty-preview)
		const emptyPreview = await blockPage.getCanvasEmptyPreview();
		await expect( emptyPreview ).toBeVisible( { timeout: 15000 } );
		await expect( emptyPreview ).toContainText(
			'Series block: add a series in the sidebar to see it rendered here.'
		);

		// 2. Verify the Block Inspector "Series Display Mode" panel and SeriesPreviewCard render the seeded series
		await expect( blockPage.modeSelect ).toHaveValue( 'all' );
		await expect( blockPage.inspectorPreviewCard ).toBeVisible();
		await expect( blockPage.inspectorCountBadge ).toContainText( 'series' );

		await expect.poll( async () => {
			return await blockPage.getInspectorPreviewTitles();
		} ).toContain( series.name );

		// 3. Save the post and verify the frontend renders the .sc-series-card-grid archive view
		await blockPage.savePostInEditor();
		await blockPage.gotoFrontendPost( standalonePost.link );

		await expect( blockPage.frontendCardGrid ).toBeVisible();
		const card = blockPage.getFrontendCardByTitle( series.name );
		await expect( card ).toBeVisible();
		await expect( card.locator( '.sc-series-card__description' ) ).toHaveText(
			'Series description for standalone block preview test.'
		);
		expect( await blockPage.getFrontendCardBadgeText( series.name ) ).toBe( '0 Parts' );
	} );

	test( 'Scenario 2: configures All, Top (with Limit), and User archive modes in Block Inspector and verifies frontend rendering', async ( { page } ) => {
		const uniqueSuffix = Date.now();

		// Seed 3 series with different post counts (0 parts, 2 parts, 1 part)
		const seriesZero = await createSeries(
			page,
			{
				name: `A-Zero-Parts Series ${ uniqueSuffix }`,
				description: 'Series with zero assigned posts.',
			},
			tracker
		);
		const seriesTwo = await createSeries(
			page,
			{
				name: `B-Two-Parts Series ${ uniqueSuffix }`,
				description: 'Series with two assigned posts.',
			},
			tracker
		);
		const seriesOne = await createSeries(
			page,
			{
				name: `C-One-Part Series ${ uniqueSuffix }`,
				description: 'Series with one assigned post.',
			},
			tracker
		);

		// Assign 2 published posts to seriesTwo and 1 published post to seriesOne
		await createPost(
			page,
			{
				title: `Two-Parts Post 1 ${ uniqueSuffix }`,
				seriesIds: [ seriesTwo.id ],
			},
			tracker
		);
		await createPost(
			page,
			{
				title: `Two-Parts Post 2 ${ uniqueSuffix }`,
				seriesIds: [ seriesTwo.id ],
			},
			tracker
		);
		await createPost(
			page,
			{
				title: `One-Part Post 1 ${ uniqueSuffix }`,
				seriesIds: [ seriesOne.id ],
			},
			tracker
		);

		// Create an unassigned host post for the standalone series-list block
		const archiveHostPost = await createPost(
			page,
			{
				title: `Series Directory Page ${ uniqueSuffix }`,
				content: '<!-- wp:paragraph --><p>Browse all series below.</p><!-- /wp:paragraph -->',
				seriesIds: [],
			},
			tracker
		);

		const blockPage = new SeriesListBlockPage( page );

		// --- Mode 1: "All Series" (mode = 'all') ---
		await blockPage.openExistingPost( archiveHostPost.id );
		await blockPage.insertAndSelectSeriesListBlock();
		await blockPage.selectDisplayMode( 'all' );
		await blockPage.savePostInEditor();

		await blockPage.gotoFrontendPost( archiveHostPost.link );
		await expect( blockPage.frontendCardGrid ).toBeVisible();

		const allModeTitles = await blockPage.getFrontendCardTitles();
		expect( allModeTitles ).toContain( seriesZero.name );
		expect( allModeTitles ).toContain( seriesTwo.name );
		expect( allModeTitles ).toContain( seriesOne.name );

		// In 'all' mode, series are ordered alphabetically by name ASC
		expect( allModeTitles.indexOf( seriesZero.name ) ).toBeLessThan(
			allModeTitles.indexOf( seriesTwo.name )
		);
		expect( allModeTitles.indexOf( seriesTwo.name ) ).toBeLessThan(
			allModeTitles.indexOf( seriesOne.name )
		);

		// Verify singular/plural part count badges and archive links
		expect( await blockPage.getFrontendCardBadgeText( seriesZero.name ) ).toBe( '0 Parts' );
		expect( await blockPage.getFrontendCardBadgeText( seriesTwo.name ) ).toBe( '2 Parts' );
		expect( await blockPage.getFrontendCardBadgeText( seriesOne.name ) ).toBe( '1 Part' );

		const seriesTwoLink = await blockPage.getFrontendCardLinkHref( seriesTwo.name );
		expect( seriesTwoLink ).toContain( seriesTwo.slug );

		// --- Mode 2: "Top Series" (mode = 'top', limit = 1) ---
		await blockPage.openExistingPost( archiveHostPost.id );
		await blockPage.insertAndSelectSeriesListBlock();
		await blockPage.selectDisplayMode( 'top' );
		await blockPage.setTopSeriesLimit( 1 );
		await blockPage.savePostInEditor();

		await blockPage.gotoFrontendPost( archiveHostPost.link );
		await expect( blockPage.frontendCardGrid ).toBeVisible();

		// With limit = 1 and orderby = count DESC (hide_empty = true), only the 2-part series should render
		const topLimitOneTitles = await blockPage.getFrontendCardTitles();
		expect( topLimitOneTitles ).toHaveLength( 1 );
		expect( topLimitOneTitles[ 0 ] ).toBe( seriesTwo.name );
		expect( topLimitOneTitles ).not.toContain( seriesZero.name );

		// --- Mode 3: "User Series" (mode = 'user', selectedUser = 1) ---
		await blockPage.openExistingPost( archiveHostPost.id );
		await blockPage.insertAndSelectSeriesListBlock();
		await blockPage.selectDisplayMode( 'user' );
		await blockPage.selectUserFilter( 1 );
		await blockPage.savePostInEditor();

		await blockPage.gotoFrontendPost( archiveHostPost.link );
		await expect( blockPage.frontendCardGrid ).toBeVisible();

		const userModeTitles = await blockPage.getFrontendCardTitles();
		expect( userModeTitles ).toContain( seriesTwo.name );
		expect( userModeTitles ).toContain( seriesOne.name );
		expect( await blockPage.getFrontendCardBadgeText( seriesTwo.name ) ).toBe( '2 Parts' );
	} );
} );

