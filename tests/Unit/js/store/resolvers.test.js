/**
 * Unit Tests for SeriesCraft Store Resolvers.
 *
 * @package SeriesCraft\Tests\Unit\Js\Store
 */

import apiFetch from '@wordpress/api-fetch';
import {
	getSeries,
	getSeriesPosts,
	getSeriesMeta,
} from '../../../../resources/js/store/resolvers';
import {
	setSeries,
	receiveSeriesPosts,
	setSeriesMeta,
} from '../../../../resources/js/store/actions';

jest.mock('@wordpress/api-fetch');

describe('SeriesCraft Store Resolvers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	/**
	 * Test 1: getSeries resolver fetches from API and dispatches setSeries action.
	 */
	it('Test 1: getSeries fetches series listing and dispatches setSeries', async () => {
		const mockDispatch = jest.fn();
		const mockItems = [
			{ id: 1, name: 'AI Engineering', slug: 'ai-engineering', count: 4 },
			{ id: 2, name: 'Frontend Architecture', slug: 'frontend-architecture', count: 6 },
		];
		apiFetch.mockResolvedValueOnce( mockItems );

		const resolver = getSeries();
		const result = await resolver( { dispatch: mockDispatch } );

		expect( apiFetch ).toHaveBeenCalledTimes( 1 );
		expect( apiFetch ).toHaveBeenCalledWith( {
			path: '/series-craft/v1/series',
			method: 'GET',
		} );
		expect( mockDispatch ).toHaveBeenCalledWith( setSeries( mockItems ) );
		expect( result ).toEqual( mockItems );
	} );

	/**
	 * Test 2: getSeries resolver returns empty array gracefully when API call fails.
	 */
	it('Test 2: getSeries returns empty array on API failure without throwing uncaught error', async () => {
		const mockDispatch = jest.fn();
		apiFetch.mockRejectedValueOnce( new Error( 'Network error' ) );

		const resolver = getSeries();
		const result = await resolver( { dispatch: mockDispatch } );

		expect( result ).toEqual( [] );
		expect( mockDispatch ).not.toHaveBeenCalled();
	} );

	/**
	 * Test 3: getSeriesPosts resolver fetches posts for seriesId and dispatches receiveSeriesPosts.
	 */
	it('Test 3: getSeriesPosts fetches posts for series and dispatches receiveSeriesPosts', async () => {
		const mockDispatch = jest.fn();
		const mockPosts = [
			{ id: 101, title: { rendered: 'Post 1' }, part_order: 1 },
			{ id: 102, title: { rendered: 'Post 2' }, part_order: 2 },
		];
		apiFetch.mockResolvedValueOnce( mockPosts );

		const resolver = getSeriesPosts( 12 );
		const result = await resolver( { dispatch: mockDispatch } );

		expect( apiFetch ).toHaveBeenCalledWith( {
			path: '/series-craft/v1/series/12/posts',
			method: 'GET',
		} );
		expect( mockDispatch ).toHaveBeenCalledWith( receiveSeriesPosts( 12, mockPosts ) );
		expect( result ).toEqual( mockPosts );
	} );

	/**
	 * Test 4: getSeriesPosts resolver early returns empty array if seriesId is omitted.
	 */
	it('Test 4: getSeriesPosts returns empty array early when seriesId is falsy', async () => {
		const mockDispatch = jest.fn();
		const resolver = getSeriesPosts( null );
		const result = await resolver( { dispatch: mockDispatch } );

		expect( apiFetch ).not.toHaveBeenCalled();
		expect( mockDispatch ).not.toHaveBeenCalled();
		expect( result ).toEqual( [] );
	} );

	/**
	 * Test 5: getSeriesMeta resolver fetches settings metadata and dispatches setSeriesMeta.
	 */
	it('Test 5: getSeriesMeta fetches series settings and dispatches setSeriesMeta', async () => {
		const mockDispatch = jest.fn();
		const mockSettings = {
			term_id: 15,
			layout: 'media-grid',
			custom_styles: { border_color: '#6366f1' },
		};
		apiFetch.mockResolvedValueOnce( mockSettings );

		const resolver = getSeriesMeta( 15 );
		const result = await resolver( { dispatch: mockDispatch } );

		expect( apiFetch ).toHaveBeenCalledWith( {
			path: '/series-craft/v1/series/15/settings',
			method: 'GET',
		} );
		expect( mockDispatch ).toHaveBeenCalledWith( setSeriesMeta( 15, mockSettings ) );
		expect( result ).toEqual( mockSettings );
	} );

	/**
	 * Test 6: getSeriesMeta resolver early returns null if seriesId is omitted.
	 */
	it('Test 6: getSeriesMeta returns null early when seriesId is falsy', async () => {
		const mockDispatch = jest.fn();
		const resolver = getSeriesMeta( 0 );
		const result = await resolver( { dispatch: mockDispatch } );

		expect( apiFetch ).not.toHaveBeenCalled();
		expect( mockDispatch ).not.toHaveBeenCalled();
		expect( result ).toBeNull();
	} );
} );
