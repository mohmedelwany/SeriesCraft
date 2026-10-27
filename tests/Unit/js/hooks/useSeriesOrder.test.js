/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import useSeriesOrder from '../../../../resources/js/hooks/useSeriesOrder';
import * as wpData from '@wordpress/data';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

describe('useSeriesOrder Custom Hook', () => {
	const mockDispatch = {
		setPostsOrder: jest.fn(),
		savePostsOrder: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		wpData.useDispatch.mockReturnValue(mockDispatch);
	});

	it('should return current ordered post IDs and saving state', () => {
		const mockStore = {
			getOrderedPostIds: jest.fn().mockReturnValue([101, 102, 103]),
			isSavingSeries: jest.fn().mockReturnValue(false),
		};

		wpData.useSelect.mockImplementation((selector) => {
			return selector(() => mockStore);
		});

		const { result } = renderHook(() => useSeriesOrder(25));

		expect(result.current.orderedPostIds).toEqual([101, 102, 103]);
		expect(result.current.isSaving).toBe(false);
	});

	it('should reorder posts array correctly when moveItem is called', () => {
		const mockStore = {
			getOrderedPostIds: jest.fn().mockReturnValue([101, 102, 103]),
			isSavingSeries: jest.fn().mockReturnValue(false),
		};

		wpData.useSelect.mockImplementation((selector) => {
			return selector(() => mockStore);
		});

		const { result } = renderHook(() => useSeriesOrder(25));

		act(() => {
			result.current.moveItem(0, 2);
		});

		expect(mockDispatch.setPostsOrder).toHaveBeenCalledWith([102, 103, 101]);
	});

	it('should persist order when saveOrder is called', async () => {
		const mockStore = {
			getOrderedPostIds: jest.fn().mockReturnValue([102, 103, 101]),
			isSavingSeries: jest.fn().mockReturnValue(false),
		};

		wpData.useSelect.mockImplementation((selector) => {
			return selector(() => mockStore);
		});

		const { result } = renderHook(() => useSeriesOrder(25));

		await act(async () => {
			await result.current.saveOrder([102, 103, 101]);
		});

		expect(mockDispatch.savePostsOrder).toHaveBeenCalledWith(25, [102, 103, 101]);
	});
});