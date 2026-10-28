/**
 * @jest-environment jsdom
 *
 * Unit Tests for useSeriesOrder Hook.
 *
 * @package SeriesCraft\Tests\Unit\Js\Hooks
 */

import { useSeriesOrder } from '../../../../resources/js/hooks/useSeriesOrder';
import { useSelect, useDispatch } from '@wordpress/data';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

describe('useSeriesOrder Hook', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns saving and notice status from store', () => {
		useSelect.mockImplementation((selector) => {
			return selector((storeName) => {
				if (storeName === 'series-craft/store') {
					return {
						isSavingOrder: () => false,
						getOrderNotice: () => ({ status: 'error', message: 'Failed' }),
					};
				}
				return {};
			});
		});

		useDispatch.mockReturnValue({
			reorderSeriesPosts: jest.fn(),
			clearNotice: jest.fn(),
		});

		const { isSaving, orderNotice } = useSeriesOrder(12);
		expect(isSaving).toBe(false);
		expect(orderNotice).toEqual({ status: 'error', message: 'Failed' });
	});

	it('reorderPosts dispatches normalized array of post IDs', async () => {
		const mockReorder = jest.fn().mockResolvedValue({ success: true });

		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				isSavingOrder: () => false,
				getOrderNotice: () => null,
			}));
		});

		useDispatch.mockReturnValue({
			reorderSeriesPosts: mockReorder,
			clearNotice: jest.fn(),
		});

		const { reorderPosts } = useSeriesOrder(12);

		// Test with array of objects
		await reorderPosts([{ id: 101 }, { id: 102 }]);
		expect(mockReorder).toHaveBeenCalledWith(12, [101, 102]);

		// Test with raw numeric array
		await reorderPosts([201, 202]);
		expect(mockReorder).toHaveBeenCalledWith(12, [201, 202]);
	});

	it('clearNotice invokes store clearNotice action with seriesId', () => {
		const mockClear = jest.fn();

		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				isSavingOrder: () => false,
				getOrderNotice: () => null,
			}));
		});

		useDispatch.mockReturnValue({
			reorderSeriesPosts: jest.fn(),
			clearNotice: mockClear,
		});

		const { clearNotice } = useSeriesOrder(15);
		clearNotice();

		expect(mockClear).toHaveBeenCalledWith(15);
	});
});
