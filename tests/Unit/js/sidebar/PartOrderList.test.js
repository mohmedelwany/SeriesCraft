/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as wpData from '@wordpress/data';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

jest.mock('@wordpress/components', () => ({
	Notice: ( { children, status, className } ) => (
		<div data-testid="mock-notice" data-status={ status } className={ className }>
			{ children }
		</div>
	),
	Spinner: () => <span data-testid="mock-spinner">Loading...</span>,
}));

import PartOrderList from '../../../../resources/js/sidebar/PartOrderList';

describe('Sidebar PartOrderList Component', () => {
	const mockReorderSeriesPosts = jest.fn();

	const samplePosts = [
		{ id: 101, title: { rendered: 'Post 1: Foundations' }, part_order: 1, status: 'publish' },
		{ id: 102, title: { rendered: 'Post 2: Advanced Topics' }, part_order: 2, status: 'publish' },
		{ id: 103, title: { rendered: 'Post 3: Future Work' }, part_order: 3, status: 'draft' },
	];

	beforeEach(() => {
		jest.clearAllMocks();
		mockReorderSeriesPosts.mockResolvedValue( { success: true } );
		wpData.useDispatch.mockReturnValue( {
			reorderSeriesPosts: mockReorderSeriesPosts,
		} );
	} );

	/**
	 * Test 1: Renders placeholder when series contains no posts.
	 */
	it('Test 1: displays empty placeholder when no posts exist in series', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeriesPosts: () => [],
				isSavingOrder: () => false,
				getOrderNotice: () => null,
			} ) );
		} );

		render( <PartOrderList seriesId={ 5 } currentPostId={ 101 } /> );

		expect(
			screen.getByText( 'No posts currently assigned to this series.' )
		).toBeDefined();
	} );

	/**
	 * Test 2: Renders list of draggable posts and highlights current post.
	 */
	it('Test 2: renders list of posts and marks current post with badge', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeriesPosts: () => samplePosts,
				isSavingOrder: () => false,
				getOrderNotice: () => null,
			} ) );
		} );

		render( <PartOrderList seriesId={ 5 } currentPostId={ 102 } /> );

		expect( screen.getByText( 'Post 1: Foundations' ) ).toBeDefined();
		expect( screen.getByText( 'Post 2: Advanced Topics' ) ).toBeDefined();
		expect( screen.getByText( 'Post 3: Future Work' ) ).toBeDefined();

		// Post 102 is the current post
		const currentPostItem = screen.getByTestId( 'draggable-post-102' );
		expect( currentPostItem.classList.contains( 'is-current-post' ) ).toBe( true );
	} );

	/**
	 * Test 3: Triggers reorderSeriesPosts on HTML5 drag-and-drop from top to bottom.
	 */
	it('Test 3: dispatches reorderSeriesPosts on drag drop event moving downwards', async () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeriesPosts: () => samplePosts,
				isSavingOrder: () => false,
				getOrderNotice: () => null,
			} ) );
		} );

		render( <PartOrderList seriesId={ 5 } currentPostId={ 101 } /> );

		const item0 = screen.getByTestId( 'draggable-post-101' );
		const item2 = screen.getByTestId( 'draggable-post-103' );

		const dataTransfer = {
			effectAllowed: '',
			dropEffect: '',
			setData: jest.fn(),
			getData: jest.fn().mockReturnValue( '0' ),
		};

		// Drag item 0 to item 2
		fireEvent.dragStart( item0, { dataTransfer } );
		fireEvent.dragOver( item2, { dataTransfer } );
		fireEvent.drop( item2, { dataTransfer } );

		await waitFor( () => {
			expect( mockReorderSeriesPosts ).toHaveBeenCalledTimes( 1 );
			// 101 moved from index 0 to index 2: [ 102, 103, 101 ]
			expect( mockReorderSeriesPosts ).toHaveBeenCalledWith( 5, [ 102, 103, 101 ] );
		} );
	} );

	/**
	 * Test 4: Triggers reorderSeriesPosts when dragging an item upwards.
	 */
	it('Test 4: dispatches reorderSeriesPosts when dragging an item upwards', async () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeriesPosts: () => samplePosts,
				isSavingOrder: () => false,
				getOrderNotice: () => null,
			} ) );
		} );

		render( <PartOrderList seriesId={ 5 } currentPostId={ 101 } /> );

		const item2 = screen.getByTestId( 'draggable-post-103' );
		const item0 = screen.getByTestId( 'draggable-post-101' );

		const dataTransfer = {
			effectAllowed: '',
			dropEffect: '',
			setData: jest.fn(),
			getData: jest.fn().mockReturnValue( '2' ),
		};

		// Drag item 2 to item 0
		fireEvent.dragStart( item2, { dataTransfer } );
		fireEvent.dragOver( item0, { dataTransfer } );
		fireEvent.drop( item0, { dataTransfer } );

		await waitFor( () => {
			expect( mockReorderSeriesPosts ).toHaveBeenCalledTimes( 1 );
			// 103 moved from index 2 to index 0: [ 103, 101, 102 ]
			expect( mockReorderSeriesPosts ).toHaveBeenCalledWith( 5, [ 103, 101, 102 ] );
		} );
	} );

	/**
	 * Test 5: Displays notice when getOrderNotice returns status and message.
	 */
	it('Test 5: renders notice when orderNotice is present in store', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeriesPosts: () => samplePosts,
				isSavingOrder: () => false,
				getOrderNotice: () => ( {
					status: 'success',
					message: 'Series order auto-saved successfully.',
				} ),
			} ) );
		} );

		render( <PartOrderList seriesId={ 5 } currentPostId={ 101 } /> );

		expect( screen.getByText( 'Series order auto-saved successfully.' ) ).toBeDefined();
	} );

	/**
	 * Test 6: Shows saving spinner and disables reordering when isSaving is true.
	 */
	it('Test 6: displays saving spinner indicator and prevents dragging when saving', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeriesPosts: () => samplePosts,
				isSavingOrder: () => true,
				getOrderNotice: () => null,
			} ) );
		} );

		render( <PartOrderList seriesId={ 5 } currentPostId={ 101 } /> );

		expect( screen.getByText( 'Auto-saving...' ) ).toBeDefined();
		const list = screen.getByLabelText( 'Series post order list' );
		expect( list.classList.contains( 'is-list-saving' ) ).toBe( true );
	} );

	/**
	 * Test 7: Dynamically appends unsaved current post with (Untitled) and Current Post badge.
	 */
	it('Test 7: dynamically appends unsaved current post with (Untitled) and Current Post badge', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeriesPosts: () => samplePosts,
				isSavingOrder: () => false,
				getOrderNotice: () => null,
			} ) );
		} );

		// Current post 999 is NOT in samplePosts
		render(
			<PartOrderList
				seriesId={ 5 }
				currentPostId={ 999 }
				currentPostTitle=""
			/>
		);

		expect( screen.getByText( '(Untitled)' ) ).toBeDefined();
		expect( screen.getByText( 'Current Post' ) ).toBeDefined();
		expect( screen.getByTestId( 'draggable-post-999' ) ).toBeDefined();
	} );

	/**
	 * Test 8: Updates current post title in real-time as author types.
	 */
	it('Test 8: updates current post title in real-time as author types', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeriesPosts: () => samplePosts,
				isSavingOrder: () => false,
				getOrderNotice: () => null,
			} ) );
		} );

		const { rerender } = render(
			<PartOrderList
				seriesId={ 5 }
				currentPostId={ 999 }
				currentPostTitle="My Draft Article"
			/>
		);

		expect( screen.getByText( 'My Draft Article' ) ).toBeDefined();

		// Simulate author continuing to type
		rerender(
			<PartOrderList
				seriesId={ 5 }
				currentPostId={ 999 }
				currentPostTitle="My Draft Article: Part 1"
			/>
		);

		expect( screen.getByText( 'My Draft Article: Part 1' ) ).toBeDefined();
	} );
} );
