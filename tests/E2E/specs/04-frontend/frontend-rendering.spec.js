// @ts-check
/**
 * E2E Test Suite: Frontend Series Rendering & Reader Experience (Phase 7)
 *
 * Verifies the unauthenticated guest reader experience on published single posts,
 * including the `.seriescraft-wrapper` series box and `"Part X of Y"` position badge,
 * all 4 layout variants (`link-list`, `link-grid`, `media-list`, `media-grid`) with
 * `"Reading Now"` active state indicators, sequential Previous/Next post navigation,
 * multi-series collapsible accordion panels (`AccordionLayout`), scoped `--sc-*`
 * inline CSS custom properties (`StyleSanitizer`), and automatic part re-indexing
 * when a post in a series is deleted (`LifecycleSubscriber`).
 *
 * @covers
 * - Backend (PHP): src/src/Frontend/FrontendRenderer.php, src/src/Views/HeaderView.php, src/src/Views/NavigationView.php, src/src/Views/AccordionLayout.php, src/src/Views/Variants/LinkListView.php, src/src/Views/Variants/LinkGridView.php, src/src/Views/Variants/MediaListView.php, src/src/Views/Variants/MediaGridView.php, src/src/Services/NavigationService.php, src/src/Services/StyleSanitizer.php, src/src/Database/LifecycleSubscriber.php
 * - Frontend (JS/React): resources/scss/frontend.scss, resources/js/frontend/
 * - Page Object: tests/E2E/pages/FrontendSeriesViewPage.js
 * - Helpers: tests/E2E/helpers/wordpress.js, tests/E2E/helpers/api-fixtures.js
 *
 * Test Scenarios:
 * 1. Single Series Box & Header Badge: View Part 2 of a 3-part series as an unauthenticated guest and verify `.seriescraft-wrapper`, series title header, `"Part 2 of 3"` badge, and ordered post titles.
 * 2. Layout Variants Rendering: Verify the DOM structure and `"Reading Now"` active post indicator across all 4 variants (`link-list`, `link-grid`, `media-list`, `media-grid`).
 * 3. Sequential Previous / Next Navigation: Navigate across Part 1, Part 2, and Part 3 using `.seriescraft-nav-next` and `.seriescraft-nav-prev` and verify boundary placeholders (`"No Previous"` / `"No Next"`).
 * 4. Multi-Series Accordion Layout: Assign a post to 2 series, verify `.seriescraft-accordion` renders collapsible `<details>` panels on the frontend, and confirm clicking summary headers expands/collapses panels.
 * 5. Custom Inline CSS Variables: Verify sanitized `--sc-*` CSS custom properties from `StyleSanitizer` are applied to `.seriescraft-series-{id}` on the frontend.
 * 6. Post Deletion Lifecycle & Re-Indexing: Delete Part 2 of a 3-part series and verify the remaining 2 posts automatically re-index to `"Part 1 of 2"` and `"Part 2 of 2"` with updated navigation links.
 */

import { test, expect } from '@playwright/test';
import { FrontendSeriesViewPage } from '../../pages/FrontendSeriesViewPage.js';
import { createGuestPage } from '../../helpers/wordpress.js';
import {
	FixtureTracker,
	createSeries,
	updateSeriesSettings,
	createPost,
	setSeriesOrder,
	deletePost,
} from '../../helpers/api-fixtures.js';

test.describe( 'SeriesCraft Frontend Rendering & Reader Experience', () => {
	/** @type {FixtureTracker} */
	let tracker;
	/** @type {{ context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page } | null} */
	let guestSession = null;

	test.beforeEach( async ( { browser } ) => {
		tracker = new FixtureTracker();
		guestSession = await createGuestPage( browser );
	} );

	test.afterEach( async ( { page } ) => {
		if ( guestSession?.context ) {
			await guestSession.context.close().catch( () => {} );
			guestSession = null;
		}
		await tracker.cleanup( page );
	} );

	test( 'Scenario 1: renders single series box, series title header, and "Part 2 of 3" badge for an unauthenticated guest', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Reader Series ${ uniqueSuffix }`,
				layout: 'link-list',
			},
			tracker
		);

		const post1 = await createPost(
			page,
			{
				title: `Reader Chapter 1 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);
		const post2 = await createPost(
			page,
			{
				title: `Reader Chapter 2 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);
		const post3 = await createPost(
			page,
			{
				title: `Reader Chapter 3 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);

		await setSeriesOrder( page, series.id, [ post1.id, post2.id, post3.id ] );

		const guestPage = /** @type {import('@playwright/test').Page} */ ( guestSession?.page );
		const frontendView = new FrontendSeriesViewPage( guestPage );

		await frontendView.gotoPost( post2.link );

		await expect( frontendView.seriesBox ).toBeVisible();
		await expect( frontendView.seriesTitle ).toHaveText( series.name );
		await expect( frontendView.positionBadge ).toHaveText( 'Part 2 of 3' );

		const renderedTitles = await frontendView.getRenderedPostTitles( series.id );
		expect( renderedTitles ).toEqual( [
			post1.title,
			post2.title,
			post3.title,
		] );
	} );

	test( 'Scenario 2: renders all 4 layout variants (link-list, link-grid, media-list, media-grid) with active "Reading Now" indicator', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Frontend Variants Series ${ uniqueSuffix }`,
				layout: 'link-list',
			},
			tracker
		);

		const post1 = await createPost(
			page,
			{
				title: `Variant Reader Part 1 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);
		const post2 = await createPost(
			page,
			{
				title: `Variant Reader Part 2 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);

		await setSeriesOrder( page, series.id, [ post1.id, post2.id ] );

		const guestPage = /** @type {import('@playwright/test').Page} */ ( guestSession?.page );
		const frontendView = new FrontendSeriesViewPage( guestPage );

		/** @type {Array<'link-list' | 'link-grid' | 'media-list' | 'media-grid'>} */
		const variants = [ 'link-list', 'link-grid', 'media-list', 'media-grid' ];

		for ( const variant of variants ) {
			await updateSeriesSettings( page, series.id, { layout: variant } );
			await frontendView.gotoPost( post1.link );

			const variantContainer = frontendView.getVariantContainer( variant, series.id );
			await expect( variantContainer ).toBeVisible();

			const items = frontendView.getVariantItems( variant, series.id );
			await expect( items ).toHaveCount( 2 );

			// Verify Part 1 has the active .is-current class and "Reading Now" badge
			const currentItem = frontendView.getCurrentItem( variant, series.id );
			await expect( currentItem ).toBeVisible();
			await expect( currentItem ).toContainText( post1.title );

			const readingNowBadge = frontendView.getReadingNowBadge( variant, series.id );
			await expect( readingNowBadge ).toHaveText( 'Reading Now' );

			// For media variants, verify thumbnail images are rendered inside items
			if ( variant === 'media-list' || variant === 'media-grid' ) {
				const images = variantContainer.locator( 'img' );
				await expect( images ).toHaveCount( 2 );
			}
		}
	} );

	test( 'Scenario 3: navigates sequentially across Part 1, Part 2, and Part 3 using Previous and Next links', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Sequential Nav Series ${ uniqueSuffix }`,
				layout: 'link-list',
			},
			tracker
		);

		const part1 = await createPost(
			page,
			{
				title: `Nav Episode 1 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);
		const part2 = await createPost(
			page,
			{
				title: `Nav Episode 2 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);
		const part3 = await createPost(
			page,
			{
				title: `Nav Episode 3 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);

		await setSeriesOrder( page, series.id, [ part1.id, part2.id, part3.id ] );

		const guestPage = /** @type {import('@playwright/test').Page} */ ( guestSession?.page );
		const frontendView = new FrontendSeriesViewPage( guestPage );

		// 1. On Part 1: Only "Next" link is rendered; "No Previous" placeholder is shown
		await frontendView.gotoPost( part1.link );
		await expect( frontendView.positionBadge ).toHaveText( 'Part 1 of 3' );
		await expect( frontendView.prevLink ).toHaveCount( 0 );
		await expect( frontendView.emptyNavPlaceholders ).toContainText( 'No Previous' );
		await expect( frontendView.nextLink ).toBeVisible();

		// Click "Next" to navigate to Part 2
		await frontendView.clickNextPost();

		// 2. On Part 2: Both "Previous" and "Next" links are rendered
		await expect( frontendView.positionBadge ).toHaveText( 'Part 2 of 3' );
		await expect( frontendView.prevLink ).toBeVisible();
		await expect( frontendView.nextLink ).toBeVisible();

		// Click "Next" to navigate to Part 3
		await frontendView.clickNextPost();

		// 3. On Part 3: Only "Previous" link is rendered; "No Next" placeholder is shown
		await expect( frontendView.positionBadge ).toHaveText( 'Part 3 of 3' );
		await expect( frontendView.nextLink ).toHaveCount( 0 );
		await expect( frontendView.emptyNavPlaceholders ).toContainText( 'No Next' );
		await expect( frontendView.prevLink ).toBeVisible();

		// Click "Previous" to return to Part 2
		await frontendView.clickPreviousPost();
		await expect( frontendView.positionBadge ).toHaveText( 'Part 2 of 3' );
	} );

	test( 'Scenario 4: renders collapsible multi-series AccordionLayout when a post belongs to multiple series', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const seriesAlpha = await createSeries(
			page,
			{
				name: `Accordion Series Alpha ${ uniqueSuffix }`,
				layout: 'link-list',
			},
			tracker
		);
		const seriesBeta = await createSeries(
			page,
			{
				name: `Accordion Series Beta ${ uniqueSuffix }`,
				layout: 'link-grid',
			},
			tracker
		);

		const sharedPost = await createPost(
			page,
			{
				title: `Multi-Series Shared Post ${ uniqueSuffix }`,
				seriesIds: [ seriesAlpha.id, seriesBeta.id ],
			},
			tracker
		);

		const guestPage = /** @type {import('@playwright/test').Page} */ ( guestSession?.page );
		const frontendView = new FrontendSeriesViewPage( guestPage );

		await frontendView.gotoPost( sharedPost.link );

		// Verify .seriescraft-accordion renders with 2 collapsible <details> panels
		await expect( frontendView.accordion ).toBeVisible();
		await expect( frontendView.accordionItems ).toHaveCount( 2 );

		const alphaPanel = frontendView.getAccordionItemByTitle( seriesAlpha.name );
		const betaPanel = frontendView.getAccordionItemByTitle( seriesBeta.name );
		await expect( alphaPanel ).toBeVisible();
		await expect( betaPanel ).toBeVisible();

		// Toggle Alpha panel open and verify its inner series box is visible
		await frontendView.toggleAccordionItem( seriesAlpha.name );
		expect( await frontendView.isAccordionItemOpen( seriesAlpha.name ) ).toBe( true );
		await expect( frontendView.getSeriesBoxById( seriesAlpha.id ) ).toBeVisible();

		// Toggle Alpha panel closed
		await frontendView.toggleAccordionItem( seriesAlpha.name );
		expect( await frontendView.isAccordionItemOpen( seriesAlpha.name ) ).toBe( false );

		// Toggle Beta panel open and verify its inner series box is visible
		await frontendView.toggleAccordionItem( seriesBeta.name );
		expect( await frontendView.isAccordionItemOpen( seriesBeta.name ) ).toBe( true );
		await expect( frontendView.getSeriesBoxById( seriesBeta.id ) ).toBeVisible();
	} );

	test( 'Scenario 5: outputs sanitized --sc-* inline CSS variables on the frontend series wrapper', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Frontend Styled Series ${ uniqueSuffix }`,
				layout: 'link-list',
				customStyles: {
					titleColor: '#b91c1c',
					headerBackgroundColor: '#fef2f2',
					buttonColor: '#1d4ed8',
					border: {
						width: '3px',
						style: 'dashed',
						color: '#1d4ed8',
					},
				},
			},
			tracker
		);

		const post = await createPost(
			page,
			{
				title: `Frontend Styled Post ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);

		const guestPage = /** @type {import('@playwright/test').Page} */ ( guestSession?.page );
		const frontendView = new FrontendSeriesViewPage( guestPage );

		await frontendView.gotoPost( post.link );

		const seriesBox = frontendView.getSeriesBoxById( series.id );
		await expect( seriesBox ).toBeVisible();

		expect( ( await frontendView.getComputedCssVariable( series.id, '--sc-title-color' ) ).toLowerCase() ).toBe( '#b91c1c' );
		expect( ( await frontendView.getComputedCssVariable( series.id, '--sc-header-bg' ) ).toLowerCase() ).toBe( '#fef2f2' );
		expect( ( await frontendView.getComputedCssVariable( series.id, '--sc-button-color' ) ).toLowerCase() ).toBe( '#1d4ed8' );
		expect( await frontendView.getComputedCssVariable( series.id, '--sc-border-width' ) ).toBe( '3px' );
		expect( await frontendView.getComputedCssVariable( series.id, '--sc-border-style' ) ).toBe( 'dashed' );
		expect( ( await frontendView.getComputedCssVariable( series.id, '--sc-border-color' ) ).toLowerCase() ).toBe( '#1d4ed8' );
	} );

	test( 'Scenario 6: automatically re-indexes remaining posts when a post in a 3-part series is deleted', async ( { page } ) => {
		const uniqueSuffix = Date.now();
		const series = await createSeries(
			page,
			{
				name: `E2E Lifecycle Reindex Series ${ uniqueSuffix }`,
				layout: 'link-list',
			},
			tracker
		);

		const post1 = await createPost(
			page,
			{
				title: `Lifecycle Part 1 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);
		const post2 = await createPost(
			page,
			{
				title: `Lifecycle Part 2 (To Delete) ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);
		const post3 = await createPost(
			page,
			{
				title: `Lifecycle Part 3 ${ uniqueSuffix }`,
				seriesIds: [ series.id ],
			},
			tracker
		);

		await setSeriesOrder( page, series.id, [ post1.id, post2.id, post3.id ] );

		const guestPage = /** @type {import('@playwright/test').Page} */ ( guestSession?.page );
		const frontendView = new FrontendSeriesViewPage( guestPage );

		// Confirm initial 3-part state on Part 3
		await frontendView.gotoPost( post3.link );
		await expect( frontendView.positionBadge ).toHaveText( 'Part 3 of 3' );

		// Delete Part 2 via REST API
		await deletePost( page, post2.id );

		// Verify Part 1 now displays "Part 1 of 2" and its Next button navigates directly to Part 3
		await frontendView.gotoPost( post1.link );
		await expect( frontendView.positionBadge ).toHaveText( 'Part 1 of 2' );
		expect( await frontendView.getRenderedPostTitles( series.id ) ).toEqual( [
			post1.title,
			post3.title,
		] );

		await frontendView.clickNextPost();

		// Verify Part 3 now displays "Part 2 of 2"
		await expect( frontendView.positionBadge ).toHaveText( 'Part 2 of 2' );
		expect( await frontendView.getRenderedPostTitles( series.id ) ).toEqual( [
			post1.title,
			post3.title,
		] );
	} );
} );

