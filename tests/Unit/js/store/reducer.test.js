/**
 * Unit Tests for SeriesCraft Store Reducer.
 *
 * @package SeriesCraft\Tests\Unit\Js\Store
 */

import reducer, { DEFAULT_STATE } from '../../../../resources/js/store/reducer';
import {
	SET_SERIES,
	RECEIVE_SERIES_POSTS,
	UPDATE_POST_ORDER,
	SET_SAVING_ORDER,
	SET_SERIES_META,
	SET_NOTICE,
	CLEAR_NOTICE,
} from '../../../../resources/js/store/constants';

describe('SeriesCraft Store Reducer', () => {
	/**
	 * Test 1: Returns initial default state when called with undefined state.
	 */
	it('Test 1: returns default initial state when invoked with undefined state', () => {
		const state = reducer( undefined, { type: '@@INIT' } );
		expect( state ).toEqual( DEFAULT_STATE );
		expect( state.series ).toEqual( [] );
		expect( state.postsBySeries ).toEqual( {} );
		expect( state.metaBySeries ).toEqual( {} );
		expect( state.isSaving ).toEqual( {} );
		expect( state.notices ).toEqual( {} );
	} );

	/**
	 * Test 2: Handles SET_SERIES action by updating series list immutably.
	 */
	it('Test 2: handles SET_SERIES by storing series array immutably', () => {
		const seriesList = [
			{ id: 1, name: 'Web Development', slug: 'web-dev', count: 4 },
			{ id: 2, name: 'Cloud Architecture', slug: 'cloud-arch', count: 2 },
		];

		const prevState = { ...DEFAULT_STATE };
		const nextState = reducer( prevState, {
			type: SET_SERIES,
			items: seriesList,
		} );

		expect( nextState.series ).toEqual( seriesList );
		expect( nextState.series ).not.toBe( seriesList );
		expect( nextState ).not.toBe( prevState );
	} );

	/**
	 * Test 3: Handles SET_SERIES with invalid non-array payload by falling back to empty array.
	 */
	it('Test 3: handles SET_SERIES with invalid payload by defaulting to empty array', () => {
		const nextState = reducer( DEFAULT_STATE, {
			type: SET_SERIES,
			items: null,
		} );
		expect( nextState.series ).toEqual( [] );
	} );

	/**
	 * Test 4: Handles RECEIVE_SERIES_POSTS by associating posts with the specified seriesId.
	 */
	it('Test 4: handles RECEIVE_SERIES_POSTS by indexing posts by seriesId', () => {
		const posts = [
			{ id: 101, title: { rendered: 'Part 1: Intro' }, part_order: 1 },
			{ id: 102, title: { rendered: 'Part 2: Basics' }, part_order: 2 },
		];

		const nextState = reducer( DEFAULT_STATE, {
			type: RECEIVE_SERIES_POSTS,
			seriesId: 10,
			posts,
		} );

		expect( nextState.postsBySeries[ 10 ] ).toEqual( posts );
		expect( nextState.postsBySeries[ 10 ] ).not.toBe( posts );
	} );

	/**
	 * Test 5: Ignores RECEIVE_SERIES_POSTS if seriesId is omitted.
	 */
	it('Test 5: returns unchanged state when RECEIVE_SERIES_POSTS has no seriesId', () => {
		const nextState = reducer( DEFAULT_STATE, {
			type: RECEIVE_SERIES_POSTS,
			seriesId: null,
			posts: [ { id: 101 } ],
		} );
		expect( nextState ).toBe( DEFAULT_STATE );
	} );

	/**
	 * Test 6: Handles UPDATE_POST_ORDER with numeric IDs by reordering existing post objects.
	 */
	it('Test 6: reorders existing post objects and updates part_order when passed array of IDs', () => {
		const initialPosts = [
			{ id: 101, title: { rendered: 'Post A' }, part_order: 1 },
			{ id: 102, title: { rendered: 'Post B' }, part_order: 2 },
			{ id: 103, title: { rendered: 'Post C' }, part_order: 3 },
		];

		const stateWithPosts = {
			...DEFAULT_STATE,
			postsBySeries: {
				5: initialPosts,
			},
		};

		// Reverse order: 103, 102, 101
		const nextState = reducer( stateWithPosts, {
			type: UPDATE_POST_ORDER,
			seriesId: 5,
			postIds: [ 103, 102, 101 ],
		} );

		expect( nextState.postsBySeries[ 5 ] ).toEqual( [
			{ id: 103, title: { rendered: 'Post C' }, part_order: 1 },
			{ id: 102, title: { rendered: 'Post B' }, part_order: 2 },
			{ id: 101, title: { rendered: 'Post A' }, part_order: 3 },
		] );
	} );

	/**
	 * Test 7: Handles UPDATE_POST_ORDER when postsBySeries is initially empty.
	 */
	it('Test 7: handles UPDATE_POST_ORDER when previous posts are not yet cached', () => {
		const nextState = reducer( DEFAULT_STATE, {
			type: UPDATE_POST_ORDER,
			seriesId: 8,
			postIds: [ 201, 202, 203 ],
		} );

		expect( nextState.postsBySeries[ 8 ] ).toEqual( [ 201, 202, 203 ] );
	} );

	/**
	 * Test 8: Handles UPDATE_POST_ORDER when passed an array of full post objects directly.
	 */
	it('Test 8: handles UPDATE_POST_ORDER when passed full post objects', () => {
		const newPosts = [
			{ id: 302, title: { rendered: 'Post Two' } },
			{ id: 301, title: { rendered: 'Post One' } },
		];

		const nextState = reducer( DEFAULT_STATE, {
			type: UPDATE_POST_ORDER,
			seriesId: 12,
			postIds: newPosts,
		} );

		expect( nextState.postsBySeries[ 12 ] ).toEqual( [
			{ id: 302, title: { rendered: 'Post Two' }, part_order: 1 },
			{ id: 301, title: { rendered: 'Post One' }, part_order: 2 },
		] );
	} );

	/**
	 * Test 9: Handles SET_SAVING_ORDER by updating the boolean isSaving map.
	 */
	it('Test 9: handles SET_SAVING_ORDER for a seriesId', () => {
		const stateSaving = reducer( DEFAULT_STATE, {
			type: SET_SAVING_ORDER,
			seriesId: 7,
			isSaving: true,
		} );
		expect( stateSaving.isSaving[ 7 ] ).toBe( true );

		const stateDone = reducer( stateSaving, {
			type: SET_SAVING_ORDER,
			seriesId: 7,
			isSaving: false,
		} );
		expect( stateDone.isSaving[ 7 ] ).toBe( false );
	} );

	/**
	 * Test 10: Handles SET_SERIES_META by merging metadata into metaBySeries.
	 */
	it('Test 10: handles SET_SERIES_META by merging metadata cleanly', () => {
		const firstState = reducer( DEFAULT_STATE, {
			type: SET_SERIES_META,
			seriesId: 15,
			metaData: { layout: 'media-grid' },
		} );
		expect( firstState.metaBySeries[ 15 ] ).toEqual( { layout: 'media-grid' } );

		const secondState = reducer( firstState, {
			type: SET_SERIES_META,
			seriesId: 15,
			metaData: { custom_styles: { border_color: '#ff0000' } },
		} );
		expect( secondState.metaBySeries[ 15 ] ).toEqual( {
			layout: 'media-grid',
			custom_styles: { border_color: '#ff0000' },
		} );
	} );

	/**
	 * Test 11: Handles SET_NOTICE by storing notice object with status and message.
	 */
	it('Test 11: handles SET_NOTICE by recording notice details for seriesId', () => {
		const nextState = reducer( DEFAULT_STATE, {
			type: SET_NOTICE,
			seriesId: 20,
			status: 'success',
			message: 'Order updated successfully.',
		} );

		expect( nextState.notices[ 20 ] ).toEqual( {
			status: 'success',
			message: 'Order updated successfully.',
		} );
	} );

	/**
	 * Test 12: Handles CLEAR_NOTICE by removing the notice entry for seriesId.
	 */
	it('Test 12: handles CLEAR_NOTICE by removing notice for seriesId', () => {
		const stateWithNotice = {
			...DEFAULT_STATE,
			notices: {
				20: { status: 'error', message: 'Network failed' },
				25: { status: 'info', message: 'Pending' },
			},
		};

		const nextState = reducer( stateWithNotice, {
			type: CLEAR_NOTICE,
			seriesId: 20,
		} );

		expect( nextState.notices[ 20 ] ).toBeUndefined();
		expect( nextState.notices[ 25 ] ).toBeDefined();
	} );

	/**
	 * Test 13: Preserves immutability across repeated state updates.
	 */
	it('Test 13: preserves immutability and never mutates previous state references', () => {
		const state1 = reducer( DEFAULT_STATE, {
			type: SET_SERIES,
			items: [ { id: 1, name: 'S1' } ],
		} );

		const state2 = reducer( state1, {
			type: RECEIVE_SERIES_POSTS,
			seriesId: 1,
			posts: [ { id: 10 } ],
		} );

		expect( state1 ).not.toBe( state2 );
		expect( state1.postsBySeries ).not.toBe( state2.postsBySeries );
		expect( state1.postsBySeries[ 1 ] ).toBeUndefined();
		expect( state2.postsBySeries[ 1 ] ).toHaveLength( 1 );
	} );
} );
