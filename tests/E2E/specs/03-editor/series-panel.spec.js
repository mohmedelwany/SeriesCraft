// @ts-check
/**
 * E2E Test Suite: Gutenberg Document Settings "Series" Panel & Block Auto-Sync
 *
 * Verifies the SeriesCraft Document Settings panel in the Gutenberg Block Editor,
 * including removal of the core taxonomy panel, assigning an existing series with
 * automatic `seriescraft/series-list` block insertion at index 0, inline series creation,
 * interactive drag-and-drop part reordering with REST persistence and live canvas preview
 * synchronization, and series removal with automatic block removal.
 *
 * @covers
 * - Backend (PHP): src/src/Taxonomy/SeriesTaxonomy.php, src/src/Api/Controllers/SeriesRestController.php, src/src/Frontend/FrontendRenderer.php, src/src/Views/HeaderView.php, src/src/Views/Variants/LinkListView.php
 * - Frontend (JS/React): resources/js/editor/sidebar/index.js, resources/js/editor/sidebar/SeriesSelector.js, resources/js/editor/sidebar/PartOrderList.js, resources/js/editor/sidebar/DraggableItem.js, resources/js/hooks/usePostSavingSync.js, resources/js/hooks/useSeries.js, resources/js/hooks/useSeriesOrder.js, resources/js/blocks/series-list/edit.js
 * - Page Object: tests/E2E/pages/EditorSeriesPanelPage.js
 *
 * Test Scenarios:
 * 1. Verify the default core taxonomy panel (`taxonomy-panel-series`) is removed and `.seriescraft-document-settings-panel` renders.
 * 2. Assign an existing series to a post and verify `.seriescraft-series-card` appears and `seriescraft/series-list` is auto-inserted at index 0 in the editor canvas.
 * 3. Create a new series inline via `+ Add New Series` and verify immediate assignment and canvas block insertion.
 * 4. Reorder parts in `PartOrderList` via drag-and-drop and verify both REST order persistence and live `seriescraft/series-list` canvas preview update (`Part X of Y` badge & item sequence).
 * 5. Remove the current post from a series via `.seriescraft-remove-series-btn` and verify the series card disappears and the `seriescraft/series-list` block is auto-removed from the editor canvas.
 */

import { test, expect } from '@playwright/test';
import { EditorSeriesPanelPage } from '../../pages/EditorSeriesPanelPage.js';
import {
	FixtureTracker,
	createSeries,
	createPost,
	setSeriesOrder,
} from '../../helpers/api-fixtures.js';

test.describe( 'SeriesCraft — Gutenberg Document Settings Series Panel E2E Suite', () => {
	/** @type {FixtureTracker} */
	let tracker;

	test.beforeEach( () => {
		tracker = new FixtureTracker();
	} );

	test.afterEach( async ( { page } ) => {
		await tracker.cleanup( page );
	} );

	test( 'Scenario 1: Removes default core Series taxonomy panel and renders custom SeriesCraft Document Settings panel', async ( { page } ) => {
		const post = await createPost(
			page,
			{ title: 'E2E Editor Panel Check Post' },
			tracker
		);

		const editorPanel = new EditorSeriesPanelPage( page );
		await editorPanel.openPostAndSeriesPanel( post.id );

		await expect( editorPanel.panel ).toBeVisible();
		await expect( editorPanel.seriesSelector ).toBeVisible();
		await expect( editorPanel.assignDropdown ).toBeVisible();
		await expect( editorPanel.addSeriesToggleBtn ).toBeVisible();

		const isCoreRemoved = await editorPanel.isCoreTaxonomyPanelRemoved();
		expect( isCoreRemoved ).toBe( true );
	} );

	test( 'Scenario 2: Assigning an existing series renders the series card and auto-inserts seriescraft/series-list at index 0 in canvas', async ( { page } ) => {
		const series = await createSeries(
			page,
			{ name: `AutoSync Series ${ Date.now() }` },
			tracker
		);
		const post = await createPost(
			page,
			{
				title: 'AutoSync Target Post',
				content: '<!-- wp:paragraph --><p>Initial paragraph content.</p><!-- /wp:paragraph -->',
			},
			tracker
		);

		const editorPanel = new EditorSeriesPanelPage( page );
		await editorPanel.openPostAndSeriesPanel( post.id );

		// Assign the series via the dropdown
		await editorPanel.assignSeriesById( series.id );

		// Verify series card and PartOrderList appear with Current Post badge
		const card = editorPanel.getSeriesCardByName( series.name );
		await expect( card ).toBeVisible();

		const draggableItems = editorPanel.getDraggableItems( series.name );
		await expect( draggableItems ).toHaveCount( 1 );
		await expect( draggableItems.first() ).toContainText( 'AutoSync Target Post' );
		await expect( draggableItems.first().locator( '.seriescraft-badge-current' ) ).toHaveText( 'Current Post' );

		// Verify seriescraft/series-list block was auto-inserted at index 0 in the editor store
		await expect.poll( async () => {
			const blockNames = await editorPanel.getEditorBlockNames();
			return blockNames[ 0 ];
		} ).toBe( 'seriescraft/series-list' );

		// Verify the block is visibly rendered in the editor canvas (iframe or direct DOM)
		const canvasBlock = await editorPanel.getCanvasSeriesBlock();
		await expect( canvasBlock ).toBeVisible();
		await expect( canvasBlock.locator( '.seriescraft-series-title' ) ).toHaveText( series.name );
	} );

	test( 'Scenario 3: Creating a new series inline assigns it immediately and auto-inserts the canvas block', async ( { page } ) => {
		const post = await createPost(
			page,
			{ title: 'Inline Series Creation Post' },
			tracker
		);

		const editorPanel = new EditorSeriesPanelPage( page );
		await editorPanel.openPostAndSeriesPanel( post.id );

		const inlineSeriesName = `Inline Created Series ${ Date.now() }`;
		const createdSeriesId = await editorPanel.createSeriesInline( inlineSeriesName );

		if ( createdSeriesId > 0 ) {
			tracker.trackSeries( createdSeriesId );
		}
		expect( createdSeriesId ).toBeGreaterThan( 0 );

		// Verify series card and canvas block preview render the newly created series
		const card = editorPanel.getSeriesCardByName( inlineSeriesName );
		await expect( card ).toBeVisible();

		const canvasBlock = await editorPanel.getCanvasSeriesBlock();
		await expect( canvasBlock ).toBeVisible();
		await expect( canvasBlock.locator( '.seriescraft-series-title' ) ).toHaveText( inlineSeriesName );
	} );

	test( 'Scenario 4: Reordering parts in PartOrderList persists order via REST and updates the live canvas block preview', async ( { page } ) => {
		const series = await createSeries(
			page,
			{ name: `Canvas Reorder Series ${ Date.now() }`, layout: 'link-list' },
			tracker
		);

		const post1 = await createPost(
			page,
			{ title: 'Part Alpha', seriesIds: [ series.id ] },
			tracker
		);
		const post2 = await createPost(
			page,
			{ title: 'Part Beta', seriesIds: [ series.id ] },
			tracker
		);
		const post3 = await createPost(
			page,
			{
				title: 'Part Gamma',
				content: '<!-- wp:seriescraft/series-list /-->\n<!-- wp:paragraph --><p>Gamma content.</p><!-- /wp:paragraph -->',
				seriesIds: [ series.id ],
			},
			tracker
		);

		await setSeriesOrder( page, series.id, [ post1.id, post2.id, post3.id ] );

		const editorPanel = new EditorSeriesPanelPage( page );
		await editorPanel.openPostAndSeriesPanel( post3.id );

		const draggableItems = editorPanel.getDraggableItems( series.name );
		await expect( draggableItems ).toHaveCount( 3 );

		const initialSidebarTitles = await editorPanel.getSidebarOrderedTitles( series.name );
		expect( initialSidebarTitles ).toEqual( [ 'Part Alpha', 'Part Beta', 'Part Gamma' ] );

		// Wait for the initial live canvas block preview to show "Part 3 of 3"
		const positionBadge = await editorPanel.getCanvasPositionBadge();
		await expect( positionBadge ).toHaveText( 'Part 3 of 3' );

		// Listen for the REST order save request when dragging Part Gamma (index 2) to index 0
		const orderSaveResponsePromise = page.waitForResponse(
			( response ) =>
				response.url().includes( `/series/${ series.id }/order` ) &&
				response.request().method() === 'POST'
		);

		await editorPanel.reorderPartInSidebar( 2, 0, series.name );

		const orderSaveResponse = await orderSaveResponsePromise;
		expect( orderSaveResponse.ok() ).toBe( true );
		const orderSaveBody = await orderSaveResponse.json();
		expect( orderSaveBody.success ).toBe( true );

		// Verify sidebar notice and updated sidebar sequence: Part Gamma, Part Alpha, Part Beta
		await expect( editorPanel.orderNotice ).toContainText( 'Series post order saved successfully.' );
		const reorderedSidebarTitles = await editorPanel.getSidebarOrderedTitles( series.name );
		expect( reorderedSidebarTitles ).toEqual( [ 'Part Gamma', 'Part Alpha', 'Part Beta' ] );

		// Verify the live seriescraft/series-list block preview in the editor canvas updates accordingly:
		// 1. Header badge updates from "Part 3 of 3" to "Part 1 of 3"
		await expect( positionBadge ).toHaveText( 'Part 1 of 3' );

		// 2. Canvas preview item list reflects the new sequence (Part Gamma first with "Reading Now" badge)
		const canvasItemTitles = await editorPanel.getCanvasPreviewItemTitlesLocator();
		await expect( canvasItemTitles ).toHaveCount( 3 );
		await expect( canvasItemTitles.nth( 0 ) ).toContainText( 'Part Gamma' );
		await expect( canvasItemTitles.nth( 0 ) ).toContainText( 'Reading Now' );
		await expect( canvasItemTitles.nth( 1 ) ).toHaveText( 'Part Alpha' );
		await expect( canvasItemTitles.nth( 2 ) ).toHaveText( 'Part Beta' );
	} );

	test( 'Scenario 5: Removing the current post from a series removes the sidebar card and auto-removes the canvas block', async ( { page } ) => {
		const series = await createSeries(
			page,
			{ name: `Removable Series ${ Date.now() }` },
			tracker
		);
		const post = await createPost(
			page,
			{
				title: 'Removable Series Post',
				content: '<!-- wp:paragraph --><p>Body text remains intact.</p><!-- /wp:paragraph -->',
			},
			tracker
		);

		const editorPanel = new EditorSeriesPanelPage( page );
		await editorPanel.openPostAndSeriesPanel( post.id );

		// Step 1: Assign series and wait for block auto-insertion
		await editorPanel.assignSeriesById( series.id );
		const card = editorPanel.getSeriesCardByName( series.name );
		await expect( card ).toBeVisible();

		const canvasBlock = await editorPanel.getCanvasSeriesBlock();
		await expect( canvasBlock ).toBeVisible();

		// Step 2: Click the remove button on the series card
		await editorPanel.removeSeriesFromPost( series.name );

		// Verify series card disappears from sidebar
		await expect( card ).toHaveCount( 0 );

		// Verify seriescraft/series-list block is automatically removed from both the store and the canvas
		await expect.poll( async () => {
			const blockNames = await editorPanel.getEditorBlockNames();
			return blockNames.includes( 'seriescraft/series-list' );
		} ).toBe( false );

		await expect( canvasBlock ).toHaveCount( 0 );
	} );
} );

