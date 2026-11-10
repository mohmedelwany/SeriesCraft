// @ts-check
/**
 * E2E Test Suite: Classic Series Taxonomy Management & Post Reordering
 *
 * Verifies classic WordPress Series taxonomy term creation on `edit-tags.php` and
 * the custom Series Post Order sortable interface on `term.php`, including empty state
 * rendering, initial sequence display, jQuery UI Sortable REST auto-save, and form-based
 * order persistence.
 *
 * @covers
 * - Backend (PHP): src/src/Taxonomy/SeriesTaxonomy.php, src/src/Taxonomy/SeriesTaxonomyAdmin.php, src/src/Api/Controllers/SeriesRestController.php, src/src/Database/Repositories/SeriesRepository.php
 * - Frontend (JS/React): resources/scss/admin/_taxonomy-order.scss
 *
 * Test Scenarios:
 * 1. Create a new Series term via the classic taxonomy screen (`/wp-admin/edit-tags.php?taxonomy=series`) and verify it appears in the terms table.
 * 2. Open the Edit Series screen (`/wp-admin/term.php?taxonomy=series&tag_ID=<id>`) for an empty series and verify the `.sc-sortable-empty` message and enqueued taxonomy stylesheet.
 * 3. Seed a series with 3 posts and verify `#series-order-sortable` lists all 3 posts in sequence order with matching `#series_post_order` value.
 * 4. Reorder posts on the Edit Series screen, verify live REST auto-save feedback (`✓ Order saved`) and form submission persistence across page reloads.
 */

import { test, expect } from '@playwright/test';
import {
	FixtureTracker,
	createSeries,
	createPost,
	setSeriesOrder,
	deleteSeries,
} from './helpers/api-fixtures.js';

const TAXONOMY_LIST_URL = '/wp-admin/edit-tags.php?taxonomy=series';

test.describe( 'SeriesCraft — Classic Series Taxonomy & Post Reordering E2E Suite', () => {
	/** @type {FixtureTracker} */
	let tracker;

	test.beforeEach( () => {
		tracker = new FixtureTracker();
	} );

	test.afterEach( async ( { page } ) => {
		await tracker.cleanup( page );
	} );

	test( 'Scenario 1: Can create a new Series term via the classic taxonomy admin screen', async ( { page } ) => {
		await page.goto( TAXONOMY_LIST_URL );

		const uniqueName = `E2E Classic Series ${ Date.now() }`;
		const description = 'Created via classic taxonomy screen in Playwright E2E.';

		await page.fill( '#tag-name', uniqueName );
		await page.fill( '#tag-description', description );
		await page.click( '#submit' );

		// Wait for the new row to appear in the taxonomy table via AJAX
		const termRow = page.locator( '#the-list tr', { hasText: uniqueName } );
		await expect( termRow ).toBeVisible();
		await expect( termRow.locator( 'a.row-title' ) ).toHaveText( uniqueName );

		// Extract term ID from the row's id attribute (e.g. "tag-123") so tracker cleans it up
		const rowIdAttr = await termRow.getAttribute( 'id' );
		if ( rowIdAttr && rowIdAttr.startsWith( 'tag-' ) ) {
			const termId = parseInt( rowIdAttr.replace( 'tag-', '' ), 10 );
			if ( termId > 0 ) {
				await deleteSeries( page, termId );
			}
		}
	} );

	test( 'Scenario 2: Edit Series screen displays empty sortable notice and taxonomy stylesheet when no posts are assigned', async ( { page } ) => {
		const series = await createSeries(
			page,
			{ name: `Empty Series ${ Date.now() }` },
			tracker
		);

		await page.goto( `/wp-admin/term.php?taxonomy=series&tag_ID=${ series.id }&post_type=post` );

		// Verify admin taxonomy stylesheet is enqueued
		const taxonomyStylesheet = page.locator( 'link#seriescraft-admin-taxonomy-css' );
		await expect( taxonomyStylesheet ).toBeAttached();

		// Verify Series Post Order row and empty message
		const orderWrap = page.locator( 'tr.series-order-wrap' );
		await expect( orderWrap ).toBeVisible();
		await expect( orderWrap.locator( 'th label' ) ).toHaveText( 'Series Post Order' );

		const emptyItem = orderWrap.locator( '#series-order-sortable li.sc-sortable-empty' );
		await expect( emptyItem ).toBeVisible();
		await expect( emptyItem ).toHaveText( 'No posts assigned to this series yet.' );
	} );

	test( 'Scenario 3: Edit Series screen renders assigned posts in their explicit sequence order', async ( { page } ) => {
		const series = await createSeries(
			page,
			{ name: `Ordered Series ${ Date.now() }` },
			tracker
		);

		const post1 = await createPost(
			page,
			{ title: 'Chapter 1: Getting Started', seriesIds: [ series.id ] },
			tracker
		);
		const post2 = await createPost(
			page,
			{ title: 'Chapter 2: Deep Dive', seriesIds: [ series.id ] },
			tracker
		);
		const post3 = await createPost(
			page,
			{ title: 'Chapter 3: Conclusion', seriesIds: [ series.id ] },
			tracker
		);

		await setSeriesOrder( page, series.id, [ post1.id, post2.id, post3.id ] );

		await page.goto( `/wp-admin/term.php?taxonomy=series&tag_ID=${ series.id }&post_type=post` );

		const items = page.locator( '#series-order-sortable li.sc-sortable-post-item' );
		await expect( items ).toHaveCount( 3 );

		await expect( items.nth( 0 ).locator( '.sc-sortable-title' ) ).toHaveText( post1.title );
		await expect( items.nth( 1 ).locator( '.sc-sortable-title' ) ).toHaveText( post2.title );
		await expect( items.nth( 2 ).locator( '.sc-sortable-title' ) ).toHaveText( post3.title );

		// Verify hidden input contains comma-separated post IDs in order
		const hiddenOrderInput = page.locator( 'input#series_post_order' );
		await expect( hiddenOrderInput ).toHaveValue( `${ post1.id },${ post2.id },${ post3.id }` );
	} );

	test( 'Scenario 4: Reordering posts on Edit Series screen triggers REST auto-save and persists across reloads', async ( { page } ) => {
		const series = await createSeries(
			page,
			{ name: `Reorderable Series ${ Date.now() }` },
			tracker
		);

		const postA = await createPost(
			page,
			{ title: 'Alpha Part', seriesIds: [ series.id ] },
			tracker
		);
		const postB = await createPost(
			page,
			{ title: 'Beta Part', seriesIds: [ series.id ] },
			tracker
		);
		const postC = await createPost(
			page,
			{ title: 'Gamma Part', seriesIds: [ series.id ] },
			tracker
		);

		await setSeriesOrder( page, series.id, [ postA.id, postB.id, postC.id ] );

		const editTermUrl = `/wp-admin/term.php?taxonomy=series&tag_ID=${ series.id }&post_type=post`;
		await page.goto( editTermUrl );

		const items = page.locator( '#series-order-sortable li.sc-sortable-post-item' );
		await expect( items ).toHaveCount( 3 );

		// Move the last item (postC) to the top of #series-order-sortable and trigger jQuery UI sortable's update callback
		await page.evaluate( () => {
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

		// Verify hidden input updated to new order: postC, postA, postB
		const hiddenOrderInput = page.locator( 'input#series_post_order' );
		await expect( hiddenOrderInput ).toHaveValue( `${ postC.id },${ postA.id },${ postB.id }` );

		// Verify live REST status message confirms order saved
		const orderStatus = page.locator( '#sc-order-status .sc-status-success' );
		await expect( orderStatus ).toContainText( 'Order saved' );

		// Also submit the Edit Series form to verify form-based save_order_field persistence
		await page.locator( '#edittag input[type="submit"], .edit-tag-actions input[type="submit"]' ).first().click();

		// Reload the Edit Series screen cleanly and confirm the new sequence persisted
		await page.goto( editTermUrl );
		await expect( items ).toHaveCount( 3 );
		await expect( items.nth( 0 ).locator( '.sc-sortable-title' ) ).toHaveText( postC.title );
		await expect( items.nth( 1 ).locator( '.sc-sortable-title' ) ).toHaveText( postA.title );
		await expect( items.nth( 2 ).locator( '.sc-sortable-title' ) ).toHaveText( postB.title );
		await expect( hiddenOrderInput ).toHaveValue( `${ postC.id },${ postA.id },${ postB.id }` );
	} );
} );

