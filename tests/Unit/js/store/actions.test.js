/**
 * @jest-environment jsdom
 *
 * Unit Tests for SeriesCraft Store Actions.
 *
 * @package SeriesCraft\Tests\Unit\Js\Store
 */

import apiFetch from '@wordpress/api-fetch';
import {
	setSeries,
	receiveSeriesPosts,
	updatePostOrder,
	setSavingOrder,
	setSeriesMeta,
	setNotice,
	clearNotice,
	reorderSeriesPosts,
	updateSeriesMeta,
	createSeries,
} from '../../../../resources/js/store/actions';
import {
	SET_SERIES,
	RECEIVE_SERIES_POSTS,
	UPDATE_POST_ORDER,
	SET_SAVING_ORDER,
	SET_SERIES_META,
	SET_NOTICE,
	CLEAR_NOTICE,
} from '../../../../resources/js/store/constants';

jest.mock('@wordpress/api-fetch');

describe('SeriesCraft Store Actions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useRealTimers();
	});

	describe('Synchronous Action Creators', () => {
		/**
		 * Test 1: setSeries returns action object with type SET_SERIES and items.
		 */
		it('Test 1: setSeries generates SET_SERIES action with items payload', () => {
			const items = [ { id: 1, name: 'Series A' } ];
			expect( setSeries( items ) ).toEqual( {
				type: SET_SERIES,
				items,
			} );
		} );

		/**
		 * Test 2: receiveSeriesPosts returns action object with seriesId and posts.
		 */
		it('Test 2: receiveSeriesPosts generates RECEIVE_SERIES_POSTS action', () => {
			const posts = [ { id: 101 }, { id: 102 } ];
			expect( receiveSeriesPosts( 5, posts ) ).toEqual( {
				type: RECEIVE_SERIES_POSTS,
				seriesId: 5,
				posts,
			} );
		} );

		/**
		 * Test 3: updatePostOrder returns action object with seriesId and postIds.
		 */
		it('Test 3: updatePostOrder generates UPDATE_POST_ORDER action', () => {
			const postIds = [ 102, 101 ];
			expect( updatePostOrder( 5, postIds ) ).toEqual( {
				type: UPDATE_POST_ORDER,
				seriesId: 5,
				postIds,
			} );
		} );

		/**
		 * Test 4: setSavingOrder returns action object with seriesId and boolean isSaving.
		 */
		it('Test 4: setSavingOrder generates SET_SAVING_ORDER action', () => {
			expect( setSavingOrder( 5, true ) ).toEqual( {
				type: SET_SAVING_ORDER,
				seriesId: 5,
				isSaving: true,
			} );
		} );

		/**
		 * Test 5: setSeriesMeta returns action object with seriesId and metaData.
		 */
		it('Test 5: setSeriesMeta generates SET_SERIES_META action', () => {
			const meta = { layout: 'link-grid' };
			expect( setSeriesMeta( 5, meta ) ).toEqual( {
				type: SET_SERIES_META,
				seriesId: 5,
				metaData: meta,
			} );
		} );

		/**
		 * Test 6: setNotice and clearNotice return appropriate notice actions.
		 */
		it('Test 6: setNotice and clearNotice generate correct notice action payloads', () => {
			expect( setNotice( 5, 'success', 'All good' ) ).toEqual( {
				type: SET_NOTICE,
				seriesId: 5,
				status: 'success',
				message: 'All good',
			} );

			expect( clearNotice( 5 ) ).toEqual( {
				type: CLEAR_NOTICE,
				seriesId: 5,
			} );
		} );
	} );

	describe('reorderSeriesPosts (Optimistic Auto-save Thunk)', () => {
		/**
		 * Test 7: Throws error when seriesId or postIds are invalid.
		 */
		it('Test 7: throws error if seriesId or postIds parameter is missing/invalid', async () => {
			const thunkMissingId = reorderSeriesPosts( null, [ 101 ] );
			await expect( thunkMissingId( { dispatch: jest.fn(), select: {} } ) ).rejects.toThrow(
				'seriesId is required to reorder series posts'
			);

			const thunkInvalidPosts = reorderSeriesPosts( 5, 'not-an-array' );
			await expect( thunkInvalidPosts( { dispatch: jest.fn(), select: {} } ) ).rejects.toThrow(
				'orderedPostIds must be an array'
			);
		} );

		/**
		 * Test 8: Optimistically updates order, persists to API, and dispatches success notice.
		 */
		it('Test 8: performs optimistic update, calls REST API, and dispatches success notice on success', async () => {
			jest.useFakeTimers();

			const dispatchEventSpy = jest.spyOn( window, 'dispatchEvent' );
			const mockDispatch = jest.fn();
			const mockSelect = {
				getSeriesPosts: jest.fn().mockReturnValue( [
					{ id: 101, part_order: 1 },
					{ id: 102, part_order: 2 },
				] ),
			};

			const mockResponse = { success: true, term_id: 10, updated: 2 };
			apiFetch.mockResolvedValueOnce( mockResponse );

			const newOrder = [ 102, 101 ];
			const thunk = reorderSeriesPosts( 10, newOrder );

			const result = await thunk( { dispatch: mockDispatch, select: mockSelect } );

			// Check previous posts were captured
			expect( mockSelect.getSeriesPosts ).toHaveBeenCalledWith( 10 );

			// Check optimistic update dispatched immediately
			expect( mockDispatch ).toHaveBeenCalledWith( updatePostOrder( 10, newOrder ) );
			expect( mockDispatch ).toHaveBeenCalledWith( setSavingOrder( 10, true ) );

			// Check apiFetch was called with Phase 3 order endpoint
			expect( apiFetch ).toHaveBeenCalledTimes( 1 );
			expect( apiFetch ).toHaveBeenCalledWith( {
				path: '/series-craft/v1/series/10/order',
				method: 'POST',
				data: { post_ids: [ 102, 101 ] },
			} );

			// Check saving flag reset and success notice dispatched
			expect( mockDispatch ).toHaveBeenCalledWith( setSavingOrder( 10, false ) );
			expect( mockDispatch ).toHaveBeenCalledWith(
				setNotice( 10, 'success', 'Series post order saved successfully.' )
			);

			expect( result ).toEqual( mockResponse );

			// Check window synchronization events dispatched
			expect( dispatchEventSpy ).toHaveBeenCalledWith(
				expect.objectContaining( {
					type: 'seriescraft:order-updated',
					detail: expect.objectContaining( {
						seriesId: 10,
						postIds: [ 102, 101 ],
					} ),
				} )
			);
			expect( dispatchEventSpy ).toHaveBeenCalledWith(
				expect.objectContaining( {
					type: 'sc-series-preview-refresh',
					detail: expect.objectContaining( {
						seriesId: 10,
						postIds: [ 102, 101 ],
					} ),
				} )
			);
			dispatchEventSpy.mockRestore();

			// Fast-forward timers to test transient notice auto-clear
			jest.advanceTimersByTime( 3500 );
			expect( mockDispatch ).toHaveBeenCalledWith( clearNotice( 10 ) );

			jest.useRealTimers();
		} );

		/**
		 * Test 9: Rolls back to previous post order and dispatches error notice on API failure.
		 */
		it('Test 9: rolls back to previous post order and dispatches error notice when API call rejects', async () => {
			const mockDispatch = jest.fn();
			const previousPosts = [
				{ id: 101, part_order: 1 },
				{ id: 102, part_order: 2 },
			];
			const mockSelect = {
				getSeriesPosts: jest.fn().mockReturnValue( previousPosts ),
			};

			const mockApiError = new Error( 'Database lock timeout' );
			apiFetch.mockRejectedValueOnce( mockApiError );

			const newOrder = [ 102, 101 ];
			const thunk = reorderSeriesPosts( 10, newOrder );

			await expect( thunk( { dispatch: mockDispatch, select: mockSelect } ) ).rejects.toThrow(
				'Database lock timeout'
			);

			// Check rollback occurred: updatePostOrder dispatched with previousPosts
			expect( mockDispatch ).toHaveBeenCalledWith( updatePostOrder( 10, previousPosts ) );

			// Check saving flag reset to false
			expect( mockDispatch ).toHaveBeenCalledWith( setSavingOrder( 10, false ) );

			// Check error notice dispatched
			expect( mockDispatch ).toHaveBeenCalledWith(
				setNotice( 10, 'error', 'Database lock timeout' )
			);
		} );
	} );

	describe('updateSeriesMeta Thunk', () => {
		/**
		 * Test 10: Optimistically updates metadata and persists via REST API.
		 */
		it('Test 10: optimistically applies meta and persists to settings REST API endpoint', async () => {
			const mockDispatch = jest.fn();
			const settingsPayload = {
				layout: 'media-grid',
				custom_styles: { border_color: '#10b981' },
			};
			const mockResponse = {
				success: true,
				term_id: 15,
				settings: settingsPayload,
			};
			apiFetch.mockResolvedValueOnce( mockResponse );

			const thunk = updateSeriesMeta( 15, settingsPayload );
			const result = await thunk( { dispatch: mockDispatch } );

			expect( mockDispatch ).toHaveBeenCalledWith( setSeriesMeta( 15, settingsPayload ) );
			expect( apiFetch ).toHaveBeenCalledWith( {
				path: '/series-craft/v1/series/15/settings',
				method: 'POST',
				data: settingsPayload,
			} );
			expect( result ).toEqual( mockResponse );
		} );

		/**
		 * Test 11: Dispatches error notice if updateSeriesMeta fails.
		 */
		it('Test 11: dispatches error notice and throws error when updating settings fails', async () => {
			const mockDispatch = jest.fn();
			apiFetch.mockRejectedValueOnce( new Error( 'Unauthorized permission' ) );

			const thunk = updateSeriesMeta( 15, { layout: 'link-list' } );
			await expect( thunk( { dispatch: mockDispatch } ) ).rejects.toThrow( 'Unauthorized permission' );

			expect( mockDispatch ).toHaveBeenCalledWith(
				setNotice( 15, 'error', 'Unauthorized permission' )
			);
		} );
	} );

	describe('createSeries Thunk', () => {
		/**
		 * Test 12: Validates name parameter and creates new series term inline via REST API.
		 */
		it('Test 12: creates series term via REST API and updates store series list', async () => {
			const mockDispatch = jest.fn();
			const existingSeries = [ { id: 1, name: 'Old Series', slug: 'old-series', count: 2 } ];
			const mockSelect = {
				getSeries: jest.fn().mockReturnValue( existingSeries ),
			};

			const mockResponse = {
				id: 25,
				name: 'New Advanced Series',
				slug: 'new-advanced-series',
				count: 0,
			};
			apiFetch.mockResolvedValueOnce( mockResponse );

			const thunk = createSeries( 'New Advanced Series', { description: 'A brand new series' } );
			const result = await thunk( { dispatch: mockDispatch, select: mockSelect } );

			expect( apiFetch ).toHaveBeenCalledTimes( 1 );
			expect( mockDispatch ).toHaveBeenCalledWith(
				setSeries( [
					...existingSeries,
					{
						id: 25,
						name: 'New Advanced Series',
						slug: 'new-advanced-series',
						count: 0,
					},
				] )
			);
			expect( result.id ).toBe( 25 );
		} );

		/**
		 * Test 13: Throws error when series name is empty or invalid.
		 */
		it('Test 13: throws error when creating a series with an invalid or empty name', async () => {
			const thunk = createSeries( '   ' );
			await expect( thunk( { dispatch: jest.fn(), select: {} } ) ).rejects.toThrow(
				'Series name is required'
			);
		} );
	} );
} );
