/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as wpData from '@wordpress/data';
import * as wpPlugins from '@wordpress/plugins';

jest.mock('@wordpress/plugins', () => ({
	registerPlugin: jest.fn(),
}));

jest.mock('@wordpress/blocks', () => ({
	createBlock: jest.fn( ( name, attributes ) => ( {
		clientId: 'mock-toc-client-id',
		name,
		attributes: attributes || {},
	} ) ),
}));

jest.mock('@wordpress/editor', () => ({
	PluginDocumentSettingPanel: ( { children, title } ) => (
		<div data-testid="plugin-document-setting-panel" data-title={ title }>
			<h2>{ title }</h2>
			{ children }
		</div>
	),
}));

jest.mock('@wordpress/components', () => ({
	Button: ( { children, onClick, disabled, label, className, ...props } ) => (
		<button
			type="button"
			onClick={ onClick }
			disabled={ disabled }
			aria-label={ label }
			className={ className }
			{ ...props }
		>
			{ children || label }
		</button>
	),
	SelectControl: ( { label, value, options, onChange, help } ) => (
		<div className="components-select-control">
			<label htmlFor="mock-select-control">{ label }</label>
			<select
				id="mock-select-control"
				value={ value }
				onChange={ ( e ) => onChange( e.target.value ) }
			>
				{ options.map( ( opt ) => (
					<option key={ opt.value } value={ opt.value }>
						{ opt.label }
					</option>
				) ) }
			</select>
			{ help && <span>{ help }</span> }
		</div>
	),
	TextControl: ( { value, onChange, placeholder, disabled, className } ) => (
		<input
			type="text"
			value={ value }
			onChange={ ( e ) => onChange( e.target.value ) }
			placeholder={ placeholder }
			disabled={ disabled }
			className={ className }
		/>
	),
	Notice: ( { children, status, className } ) => (
		<div data-testid="mock-notice" data-status={ status } className={ className }>
			{ children }
		</div>
	),
	Spinner: () => <span data-testid="mock-spinner">Loading...</span>,
}));

jest.mock('@wordpress/data', () => {
	const removeEditorPanel = jest.fn();
	return {
		useSelect: jest.fn(),
		useDispatch: jest.fn(),
		dispatch: jest.fn( () => ( {
			removeEditorPanel,
		} ) ),
	};
} );

jest.mock('@wordpress/dom-ready', () => ( callback ) => callback && callback());

import {
	SeriesDocumentSettingsPanel,
	removeCoreTaxonomyPanel,
	findSeriesBlocks,
	findSeriesListBlocks,
} from '../../../../resources/js/editor/sidebar';
import { createBlock } from '@wordpress/blocks';

describe('Sidebar Integration - SeriesDocumentSettingsPanel', () => {
	const mockEditPost = jest.fn();
	const mockInsertBlock = jest.fn();
	const mockRemoveBlock = jest.fn();

	beforeEach(() => {
		mockEditPost.mockClear();
		mockInsertBlock.mockClear();
		mockRemoveBlock.mockClear();
		createBlock.mockClear();
		wpData.useSelect.mockReset();
		wpData.useDispatch.mockImplementation( ( storeName ) => {
			if ( storeName === 'core/block-editor' ) {
				return {
					insertBlock: mockInsertBlock,
					removeBlock: mockRemoveBlock,
				};
			}
			return {
				editPost: mockEditPost,
				insertBlock: mockInsertBlock,
				removeBlock: mockRemoveBlock,
				createSeries: jest.fn(),
				reorderSeriesPosts: jest.fn(),
			};
		} );
	} );

	/**
	 * Test 1: PluginDocumentSettingPanel is registered with Gutenberg plugin registry.
	 */
	it('Test 1: registers seriescraft-document-settings plugin with Gutenberg', () => {
		expect( wpPlugins.registerPlugin ).toHaveBeenCalledWith(
			'seriescraft-document-settings',
			expect.objectContaining( {
				render: SeriesDocumentSettingsPanel,
				icon: 'list-view',
			} )
		);
	} );

	/**
	 * Test 2: Renders empty notice when post has no series assigned.
	 */
	it('Test 2: displays empty series help notice when no series is assigned to current post', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [] : null ),
						getBlocks: () => [],
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		expect( screen.getByText( 'Series' ) ).toBeDefined();
		expect(
			screen.getByText( /Select or create a series to manage sequential post ordering/i )
		).toBeDefined();
		expect( screen.queryByTestId( 'seriescraft-part-order-container' ) ).toBeNull();
	} );

	/**
	 * Test 3: Renders PartOrderList when post is assigned to a series.
	 */
	it('Test 3: displays PartOrderList when post is assigned to a series', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [ 5 ] : null ),
						getBlocks: () => [ { clientId: 'mock-block-id', name: 'seriescraft/series-list' } ],
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [ { clientId: 'mock-block-id', name: 'seriescraft/series-list' } ],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 2 } ],
					getSeriesPosts: () => [
						{ id: 100, title: { rendered: 'Post 100' }, part_order: 1 },
					],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		expect( screen.getByTestId( 'seriescraft-part-order-container' ) ).toBeDefined();
		expect( screen.getByText( 'Post 100' ) ).toBeDefined();
	} );

	/**
	 * Test 4: Dispatches editPost when a series is selected.
	 */
	it('Test 4: dispatches editPost with selected series ID on series change', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [] : null ),
						getBlocks: () => [],
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [],
					};
				}
				return {
					getSeries: () => [ { id: 8, name: 'Series 8', count: 3 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		const selectElement = screen.getByLabelText( 'Assign Series' );
		fireEvent.change( selectElement, { target: { value: '8' } } );

		expect( mockEditPost ).toHaveBeenCalledWith( {
			series: [ 8 ],
		} );
	} );

	/**
	 * Test 5: removeCoreTaxonomyPanel calls removeEditorPanel with taxonomy-panel-series.
	 */
	it('Test 5: dispatches removeEditorPanel for taxonomy-panel-series to remove default core panel', () => {
		removeCoreTaxonomyPanel();

		expect( wpData.dispatch ).toHaveBeenCalledWith( 'core/editor' );
		const editorStore = wpData.dispatch( 'core/editor' );
		expect( editorStore.removeEditorPanel ).toHaveBeenCalledWith( 'taxonomy-panel-series' );
	} );

	/**
	 * Test 6: Auto-inserts seriescraft/series-list at index 0 when series is assigned and no block exists.
	 */
	it('Test 6: automatically inserts seriescraft/series-list at index 0 when series is assigned', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [ 5 ] : null ),
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [
							{ clientId: 'p1', name: 'core/paragraph', attributes: { content: 'Intro' } },
						],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		expect( createBlock ).toHaveBeenCalledWith( 'seriescraft/series-list' );
		expect( mockInsertBlock ).toHaveBeenCalledWith(
			expect.objectContaining( {
				name: 'seriescraft/series-list',
				clientId: 'mock-toc-client-id',
			} ),
			0
		);
	} );

	/**
	 * Test 7: Does NOT insert a duplicate block if seriescraft/series-list already exists on canvas.
	 */
	it('Test 7: guards against duplicate insertion if seriescraft/series-list already exists on canvas', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [ 5 ] : null ),
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [
							{ clientId: 'existing-block', name: 'seriescraft/series-list' },
							{ clientId: 'p1', name: 'core/paragraph' },
						],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		expect( mockInsertBlock ).not.toHaveBeenCalled();
	} );

	/**
	 * Test 8: Preserves position of existing block when moved down by the user.
	 */
	it('Test 8: preserves current position if seriescraft/series-list was moved down in content', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [ 5 ] : null ),
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [
							{ clientId: 'p1', name: 'core/paragraph' },
							{ clientId: 'p2', name: 'core/paragraph' },
							{ clientId: 'moved-block', name: 'seriescraft/series-list' },
						],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		expect( mockInsertBlock ).not.toHaveBeenCalled();
		expect( mockRemoveBlock ).not.toHaveBeenCalled();
	} );

	/**
	 * Test 9: Auto-removes seriescraft/series-list block when series is unassigned (empty array).
	 */
	it('Test 9: automatically removes seriescraft/series-list block when series is unassigned', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [] : null ),
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [
							{ clientId: 'orphan-block', name: 'seriescraft/series-list' },
							{ clientId: 'p1', name: 'core/paragraph' },
						],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		expect( mockRemoveBlock ).toHaveBeenCalledWith( 'orphan-block' );
	} );

	/**
	 * Test 10: Auto-removes multiple blocks if multiple exist when series is reset to 0.
	 */
	it('Test 10: removes all series-list blocks when series is reset to 0 or null', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [ 0 ] : null ),
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [
							{ clientId: 'block-1', name: 'seriescraft/series-list' },
							{ clientId: 'block-2', name: 'seriescraft/series-list' },
						],
					};
				}
				return {
					getSeries: () => [],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		expect( mockRemoveBlock ).toHaveBeenCalledWith( 'block-1' );
		expect( mockRemoveBlock ).toHaveBeenCalledWith( 'block-2' );
	} );

	/**
	 * Test 11: findSeriesBlocks and findTocBlocks helper recursively locates nested blocks in container blocks.
	 */
	it('Test 11: findSeriesBlocks helper recursively locates nested blocks in container blocks', () => {
		const blockTree = [
			{ clientId: 'p1', name: 'core/paragraph' },
			{
				clientId: 'group-1',
				name: 'core/group',
				innerBlocks: [
					{ clientId: 'p2', name: 'core/paragraph' },
					{ clientId: 'nested-block', name: 'seriescraft/series-list' },
				],
			},
		];

		const found = findSeriesBlocks( blockTree );
		expect( found ).toHaveLength( 1 );
		expect( found[ 0 ].clientId ).toBe( 'nested-block' );

		const aliasFound = findSeriesListBlocks( blockTree );
		expect( aliasFound ).toHaveLength( 1 );
		expect( aliasFound[ 0 ].clientId ).toBe( 'nested-block' );
	} );

	/**
	 * Test 12: Renders fallback manual button for adding block or disabled state if already added.
	 */
	it('Test 12: renders fallback manual button in sidebar with proper state', () => {
		// Scenario A: Series is assigned and block is NOT on canvas -> shows enabled "Add Series List block" button
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [ 5 ] : null ),
						getBlocks: () => [ { clientId: 'p1', name: 'core/paragraph' } ],
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [ { clientId: 'p1', name: 'core/paragraph' } ],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		const { unmount } = render( <SeriesDocumentSettingsPanel /> );
		const addBtn = screen.getByRole( 'button', { name: /Add Series List block/i } );
		expect( addBtn ).toBeDefined();
		expect( addBtn.disabled ).toBe( false );

		fireEvent.click( addBtn );
		expect( createBlock ).toHaveBeenCalledWith( 'seriescraft/series-list' );

		unmount();

		// Scenario B: Series is assigned and block IS on canvas -> shows disabled "Series List block already added"
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [ 5 ] : null ),
						getBlocks: () => [ { clientId: 'b1', name: 'seriescraft/series-list' } ],
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [ { clientId: 'b1', name: 'seriescraft/series-list' } ],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );
		const addedBtn = screen.getByRole( 'button', { name: /Series List block already added/i } );
		expect( addedBtn ).toBeDefined();
		expect( addedBtn.disabled ).toBe( true );
	} );

	/**
	 * Test 13: Does NOT auto-insert on initial load of an existing saved post with series already assigned.
	 */
	it('Test 13: does NOT auto-insert on initial load of an existing saved post with series already assigned', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => ( attr === 'series' ? [ 5 ] : null ),
						getCurrentPostAttribute: ( attr ) => ( attr === 'series' ? [ 5 ] : null ),
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [
							{ clientId: 'p1', name: 'core/paragraph', attributes: { content: 'Body' } },
						],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		// Because saved series === edited series on initial load, no duplicate auto-insert occurs
		expect( mockInsertBlock ).not.toHaveBeenCalled();
	} );

	/**
	 * Test 14: Delays auto-sync when Gutenberg is still resolving content or post attributes.
	 */
	it('Test 14: delays auto-sync when Gutenberg is still resolving content or hydrating blocks', () => {
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( ( storeName ) => {
				if ( storeName === 'core/editor' ) {
					return {
						getCurrentPostId: () => 100,
						getEditedPostAttribute: ( attr ) => {
							if ( attr === 'series' ) return [ 5 ];
							if ( attr === 'content' ) return '<!-- wp:paragraph -->Raw<!-- /wp:paragraph -->';
							return null;
						},
						// Simulating block hydration: content exists, but blocks array is still empty
						isResolving: ( action, args ) => args?.[ 0 ] === 'content',
					};
				}
				if ( storeName === 'core/block-editor' ) {
					return {
						getBlocks: () => [],
					};
				}
				return {
					getSeries: () => [ { id: 5, name: 'Series 5', count: 1 } ],
					getSeriesPosts: () => [],
					isSavingOrder: () => false,
					getOrderNotice: () => null,
				};
			} );
		} );

		render( <SeriesDocumentSettingsPanel /> );

		expect( mockInsertBlock ).not.toHaveBeenCalled();
	} );

	/**
	 * Test 15: findSeriesListBlocks alias correctly locates seriescraft/series-list blocks recursively.
	 */
	it('Test 15: findSeriesListBlocks alias correctly locates seriescraft/series-list blocks recursively', () => {
		const nestedBlocks = [
			{
				clientId: 'group-1',
				name: 'core/group',
				innerBlocks: [
					{
						clientId: 'inner-series',
						name: 'seriescraft/series-list',
						innerBlocks: [],
					},
				],
			},
			{
				clientId: 'second-series',
				name: 'seriescraft/series-list',
				innerBlocks: [],
			},
		];

		const found = findSeriesListBlocks( nestedBlocks );
		expect( found.length ).toBe( 2 );
		expect( found[ 0 ].clientId ).toBe( 'inner-series' );
		expect( found[ 1 ].clientId ).toBe( 'second-series' );
	} );
} );
