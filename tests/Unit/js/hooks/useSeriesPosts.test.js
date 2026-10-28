/**
 * @jest-environment jsdom
 *
 * Unit Tests for useSeriesPosts Hook and computeDisplayPosts helper.
 *
 * @package SeriesCraft\Tests\Unit\Js\Hooks
 */

import { computeDisplayPosts, useSeriesPosts } from '../../../../resources/js/hooks/useSeriesPosts';
import { useSelect } from '@wordpress/data';
import { renderHook } from '@testing-library/react';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
}));

describe('useSeriesPosts Hook & Helpers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('computeDisplayPosts', () => {
		it('returns empty array when rawPosts is empty and no current post is specified', () => {
			expect(computeDisplayPosts([], 0, 0, undefined)).toEqual([]);
		});

		it('marks active post with isCurrent and overrides title when currentPostId matches', () => {
			const rawPosts = [
				{ id: 10, title: { rendered: 'Post 1' }, part_order: 1 },
				{ id: 20, title: 'Post 2', part_order: 2 },
			];

			const result = computeDisplayPosts(rawPosts, 5, 20, 'Post 2 Updated');
			expect(result[0].isCurrent).toBeUndefined();
			expect(result[1].isCurrent).toBe(true);
			expect(result[1].title).toBe('Post 2 Updated');
		});

		it('injects temporary placeholder post when current post is not yet in series posts', () => {
			const rawPosts = [{ id: 10, title: 'Post 1', part_order: 1 }];
			const result = computeDisplayPosts(rawPosts, 5, 99, 'Draft Post In Progress');

			expect(result).toHaveLength(2);
			expect(result[1]).toEqual({
				id: 99,
				title: 'Draft Post In Progress',
				order: 2,
				part_order: 2,
				isCurrent: true,
			});
		});
	});

	describe('useSeriesPosts execution', () => {
		it('queries store for series posts, isSaving, and notices', () => {
			const mockPosts = [{ id: 1, title: 'Chapter 1' }];
			const mockNotice = { status: 'success', message: 'Order saved' };

			useSelect.mockImplementation((selector) => {
				return selector((storeName) => {
					if (storeName === 'series-craft/store') {
						return {
							getSeriesPosts: () => mockPosts,
							isSavingOrder: () => true,
							getOrderNotice: () => mockNotice,
						};
					}
					return {};
				});
			});

			const { result } = renderHook(() => useSeriesPosts(10));
			expect(result.current.posts).toEqual(mockPosts);
			expect(result.current.isSaving).toBe(true);
			expect(result.current.orderNotice).toEqual(mockNotice);
		});

		it('returns safe default values when seriesId is 0 or null', () => {
			useSelect.mockImplementation((selector) => {
				return selector(() => ({}));
			});

			const { result } = renderHook(() => useSeriesPosts(0));
			expect(result.current.posts).toEqual([]);
			expect(result.current.rawPosts).toEqual([]);
			expect(result.current.isSaving).toBe(false);
			expect(result.current.orderNotice).toBeNull();
		});
	});
});

