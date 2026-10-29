/**
 * Integration Unit Tests for SeriesCraft Centralized Data Store.
 *
 * @package SeriesCraft\Tests\Unit\Js\Store
 */

import { select, dispatch } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import {
	STORE_NAME,
	store,
	storeConfig,
} from '../../../../resources/js/store';

jest.mock('@wordpress/api-fetch');

describe('SeriesCraft Centralized Redux Store Registration', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	/**
	 * Test 1: Verifies store name constant and store descriptor creation.
	 */
	it('Test 1: store descriptor is properly configured with namespace series-craft/store', () => {
		expect( STORE_NAME ).toBe( 'series-craft/store' );
		expect( store ).toBeDefined();
		expect( storeConfig.reducer ).toBeDefined();
		expect( storeConfig.actions ).toBeDefined();
		expect( storeConfig.selectors ).toBeDefined();
		expect( storeConfig.resolvers ).toBeDefined();
	} );

	/**
	 * Test 2: Selectors and dispatchers are registered and accessible via @wordpress/data.
	 */
	it('Test 2: registry exposes selectors and actions under series-craft/store namespace', () => {
		const storeSelectors = select( STORE_NAME );
		expect( storeSelectors ).toBeDefined();
		expect( typeof storeSelectors.getSeries ).toBe('function');
		expect( typeof storeSelectors.getSeriesPosts ).toBe('function');
		expect( typeof storeSelectors.isSavingOrder ).toBe('function');
		expect( typeof storeSelectors.getSeriesMeta ).toBe('function');
		expect( typeof storeSelectors.getOrderNotice ).toBe('function');

		const storeDispatch = dispatch( STORE_NAME );
		expect( storeDispatch ).toBeDefined();
		expect( typeof storeDispatch.setSeries ).toBe('function');
		expect( typeof storeDispatch.receiveSeriesPosts ).toBe('function');
		expect( typeof storeDispatch.reorderSeriesPosts ).toBe('function');
		expect( typeof storeDispatch.updateSeriesMeta ).toBe('function');
		expect( typeof storeDispatch.createSeries ).toBe('function');
		expect( typeof storeDispatch.setNotice ).toBe('function');
		expect( typeof storeDispatch.clearNotice ).toBe('function');
	} );

	/**
	 * Test 3: Dispatches mutate store state and selectors read back updated state.
	 */
	it('Test 3: end-to-end synchronous dispatching updates store state cleanly', () => {
		const storeDispatch = dispatch( STORE_NAME );
		const storeSelect = select( STORE_NAME );

		const mockSeries = [
			{ id: 42, name: 'Quantum Computing', slug: 'quantum-computing', count: 7 },
		];
		storeDispatch.setSeries( mockSeries );
		expect( storeSelect.getSeries() ).toEqual( mockSeries );

		const mockPosts = [
			{ id: 401, title: { rendered: 'Qubits 101' }, part_order: 1 },
			{ id: 402, title: { rendered: 'Superposition' }, part_order: 2 },
		];
		storeDispatch.receiveSeriesPosts( 42, mockPosts );
		expect( storeSelect.getSeriesPosts( 42 ) ).toEqual( mockPosts );

		storeDispatch.setSeriesMeta( 42, { layout: 'media-list' } );
		expect( storeSelect.getSeriesMeta( 42 ) ).toEqual( { layout: 'media-list' } );

		storeDispatch.setNotice( 42, 'success', 'All tests passing' );
		expect( storeSelect.getOrderNotice( 42 ) ).toEqual( {
			status: 'success',
			message: 'All tests passing',
		} );

		storeDispatch.clearNotice( 42 );
		expect( storeSelect.getOrderNotice( 42 ) ).toBeNull();
	} );
} );
