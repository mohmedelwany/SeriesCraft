/**
 * @jest-environment jsdom
 *
 * Unit Tests for usePostSavingSync Hook and Helpers.
 *
 * @package SeriesCraft\Tests\Unit\Js\Hooks
 */

import {
	findSeriesBlocks,
	findSeriesListBlocks,
	removeCoreTaxonomyPanel,
	usePostSavingSync,
} from '../../../../resources/js/hooks/usePostSavingSync';
import { useSelect, useDispatch, dispatch } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';
import { renderHook, act } from '@testing-library/react';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
	dispatch: jest.fn(),
}));


jest.mock('@wordpress/blocks', () => ({
	createBlock: jest.fn((name) => ({ name, clientId: 'mock-client-id' })),
}));

describe('usePostSavingSync Hook & Helpers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('findSeriesBlocks helper', () => {
		it('recursively locates seriescraft/series-list blocks in nested structures', () => {
			const blockTree = [
				{ name: 'core/paragraph', innerBlocks: [] },
				{
					name: 'core/group',
					innerBlocks: [
						{ name: 'seriescraft/series-list', clientId: 'block-1' },
						{
							name: 'core/columns',
							innerBlocks: [
								{ name: 'seriescraft/series-list', clientId: 'block-2' },
							],
						},
					],
				},
			];

			const results = findSeriesBlocks(blockTree);
			expect(results).toHaveLength(2);
			expect(results[0].clientId).toBe('block-1');
			expect(results[1].clientId).toBe('block-2');
		});

		it('findSeriesListBlocks alias produces identical results', () => {
			expect(findSeriesListBlocks).toBe(findSeriesBlocks);
		});
	});

	describe('removeCoreTaxonomyPanel helper', () => {
		it('invokes removeEditorPanel on core/editor store', () => {
			const mockRemove = jest.fn();
			dispatch.mockReturnValue({ removeEditorPanel: mockRemove });

			removeCoreTaxonomyPanel();
			expect(mockRemove).toHaveBeenCalledWith('taxonomy-panel-series');
		});
	});

	describe('usePostSavingSync hook execution', () => {
		it('exposes editor readiness, block existence flag, and manual insertion action', () => {
			useSelect.mockImplementation((selector) => {
				return selector((storeName) => {
					if (storeName === 'core/editor') {
						return {
							getCurrentPostId: () => 42,
							getEditedPostAttribute: (attr) => (attr === 'series' ? [7] : 'Title'),
							getCurrentPostAttribute: () => [7],
							__unstableIsEditorReady: () => true,
						};
					}
					if (storeName === 'core/block-editor') {
						return {
							getBlocks: () => [{ name: 'seriescraft/series-list', clientId: 'id-1' }],
						};
					}
					if (storeName === 'core/data') {
						return {
							isResolving: () => false,
						};
					}
					return {};
				});
			});

			const mockInsertBlock = jest.fn();
			const mockRemoveBlock = jest.fn();
			useDispatch.mockReturnValue({
				insertBlock: mockInsertBlock,
				removeBlock: mockRemoveBlock,
				editPost: jest.fn(),
			});

			const { result } = renderHook(() => usePostSavingSync());

			expect(result.current.currentPostId).toBe(42);

			expect(result.current.assignedSeriesId).toBe(7);
			expect(result.current.isEditorReady).toBe(true);
			expect(result.current.hasSeriesBlock).toBe(true);
			expect(result.current.seriesBlocks).toHaveLength(1);

			// Manual addition
			act(() => {
				result.current.handleAddBlockManual();
			});
			expect(createBlock).toHaveBeenCalledWith('seriescraft/series-list');
			expect(mockInsertBlock).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'seriescraft/series-list' }),
				0
			);

		});
	});
});
