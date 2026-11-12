// @ts-check
/**
 * E2E Test Suite: Classic Series Taxonomy Management & Post Reordering
 *
 * Verifies classic WordPress Series taxonomy term creation on `edit-tags.php` and
 * the custom Series Post Order sortable interface on `term.php` using the
 * `TaxonomyTermPage` Page Object Model.
 *
 * @covers
 * - Backend (PHP): src/src/Taxonomy/SeriesTaxonomy.php, src/src/Taxonomy/SeriesTaxonomyAdmin.php, src/src/Api/Controllers/SeriesRestController.php, src/src/Database/Repositories/SeriesRepository.php
 * - Frontend (JS/React): resources/scss/admin/_taxonomy-order.scss
 * - Page Object: tests/E2E/pages/TaxonomyTermPage.js
 *
 * Test Scenarios:
 * 1. Create a new Series term via the classic taxonomy screen (`/wp-admin/edit-tags.php?taxonomy=series`) and verify it appears in the terms table.
 * 2. Open the Edit Series screen (`/wp-admin/term.php?taxonomy=series&tag_ID=<id>`) for an empty series and verify the `.sc-sortable-empty` message and enqueued taxonomy stylesheet.
 * 3. Seed a series with 3 posts and verify `#series-order-sortable` lists all 3 posts in sequence order with matching `#series_post_order` value.
 * 4. Reorder posts on the Edit Series screen, verify live REST auto-save feedback (`✓ Order saved`) and form submission persistence across page reloads.
 */

import { test, expect } from '@playwright/test';
import { TaxonomyTermPage } from '../../pages/TaxonomyTermPage.js';
import {
	FixtureTracker,
	createSeries,
	createPost,
	setSeriesOrder,
	deleteSeries,
} from '../../helpers/api-fixtures.js';

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
		const taxonomyPage = new TaxonomyTermPage( page );
		await taxonomyPage.gotoSeriesTaxonomy();

		const uniqueName = `E2E Classic Series ${ Date.now() }`;
		const description = 'Created via classic taxonomy screen in Playwright E2E.';

		const { termId } = await taxonomyPage.createSeriesTerm( uniqueName, description );
		if ( termId > 0 ) {
			await deleteSeries( page, termId );
		}
	} );

	test( 'Scenario 2: Edit Series screen displays empty sortable notice and taxonomy stylesheet when no posts are assigned', async ( { page } ) => {
		const taxonomyPage = new TaxonomyTermPage( page );
		const series = await createSeries(
			page,
			{ name: `Empty Series ${ Date.now() }` },
			tracker
		);

		await taxonomyPage.openEditSeries( series.id );

		await expect( taxonomyPage.taxonomyStylesheet ).toBeAttached();
		await expect( taxonomyPage.orderFieldLabel ).toHaveText( 'Series Post Order' );
		await expect( taxonomyPage.emptySortableNotice ).toBeVisible();
		await expect( taxonomyPage.emptySortableNotice ).toHaveText( 'No posts assigned to this series yet.' );
	} );

	test( 'Scenario 3: Edit Series screen renders assigned posts in their explicit sequence order', async ( { page } ) => {
		const taxonomyPage = new TaxonomyTermPage( page );
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

		await taxonomyPage.openEditSeries( series.id );

		await expect( taxonomyPage.sortableItems ).toHaveCount( 3 );
		const titles = await taxonomyPage.getOrderedPostTitles();
		expect( titles ).toEqual( [ post1.title, post2.title, post3.title ] );

		const orderValue = await taxonomyPage.getOrderedPostIdsValue();
		expect( orderValue ).toBe( `${ post1.id },${ post2.id },${ post3.id }` );
	} );

	test( 'Scenario 4: Reordering posts on Edit Series screen triggers REST auto-save and persists across reloads', async ( { page } ) => {
		const taxonomyPage = new TaxonomyTermPage( page );
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

		await taxonomyPage.openEditSeries( series.id );
		await expect( taxonomyPage.sortableItems ).toHaveCount( 3 );

		await taxonomyPage.moveLastPostToFirstAndTriggerSortable();

		await expect( taxonomyPage.hiddenOrderInput ).toHaveValue( `${ postC.id },${ postA.id },${ postB.id }` );
		await expect( taxonomyPage.orderStatusSuccess ).toContainText( 'Order saved' );

		await taxonomyPage.submitEditTermForm();

		// Reload the Edit Series screen cleanly and confirm the new sequence persisted
		await taxonomyPage.openEditSeries( series.id );
		await expect( taxonomyPage.sortableItems ).toHaveCount( 3 );
		const titlesAfterReload = await taxonomyPage.getOrderedPostTitles();
		expect( titlesAfterReload ).toEqual( [ postC.title, postA.title, postB.title ] );
		await expect( taxonomyPage.hiddenOrderInput ).toHaveValue( `${ postC.id },${ postA.id },${ postB.id }` );
	} );
} );

