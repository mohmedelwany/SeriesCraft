/**
 * @jest-environment jsdom
 *
 * Unit Tests for useSeries Hook and Helpers.
 *
 * @package SeriesCraft\Tests\Unit\Js\Hooks
 */

import { extractSeriesId, useSeries } from '../../../../resources/js/hooks/useSeries';
import { useSelect, useDispatch } from '@wordpress/data';
import { renderHook, act } from '@testing-library/react';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

describe('useSeries Hook & Helpers', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('extractSeriesId helper', () => {
		it('extracts ID from array of objects with id property', () => {
			expect(extractSeriesId([{ id: 12, name: 'Sci-Fi' }])).toBe(12);
		});

		it('extracts ID from array of objects with term_id property', () => {
			expect(extractSeriesId([{ term_id: 15, name: 'Fantasy' }])).toBe(15);
		});

		it('extracts ID from array of numbers or numeric strings', () => {
			expect(extractSeriesId([42])).toBe(42);
			expect(extractSeriesId(['88'])).toBe(88);
		});

		it('returns 0 for empty array, null, or undefined', () => {
			expect(extractSeriesId([])).toBe(0);
			expect(extractSeriesId(null)).toBe(0);
			expect(extractSeriesId(undefined)).toBe(0);
			expect(extractSeriesId('invalid')).toBe(0);
		});
	});

	describe('useSeries hook execution', () => {
		it('returns series list, computes assigned series, and active series resolution', () => {
			const mockSeriesList = [
				{ id: 10, name: 'Series Alpha', count: 3 },
				{ id: 20, name: 'Series Beta', count: 5 },
			];

			useSelect.mockImplementation((selector) => {
				return selector((storeName) => {
					if (storeName === 'core/editor') {
						return {
							getCurrentPostId: () => 101,
							getEditedPostAttribute: (attr) => (attr === 'series' ? [20] : null),
						};
					}
					if (storeName === 'series-craft/store') {
						return {
							getSeries: () => mockSeriesList,
						};
					}
					return {};
				});
			});

			const mockEditPost = jest.fn();
			const mockCreateSeries = jest.fn();
			const mockUpdateMeta = jest.fn();

			useDispatch.mockImplementation((storeName) => {
				if (storeName === 'core/editor') {
					return { editPost: mockEditPost };
				}
				if (storeName === 'series-craft/store') {
					return {
						createSeries: mockCreateSeries,
						updateSeriesMeta: mockUpdateMeta,
					};
				}
				return {};
			});

			const { result } = renderHook(() => useSeries());

			expect(result.current.currentPostId).toBe(101);
			expect(result.current.seriesList).toEqual(mockSeriesList);
			expect(result.current.assignedSeriesId).toBe(20);
			expect(result.current.assignedSeries).toEqual(mockSeriesList[1]);
			expect(result.current.activeSeriesId).toBe(20);

			// Test assignSeries
			act(() => {
				result.current.assignSeries(10);
			});
			expect(mockEditPost).toHaveBeenCalledWith({ series: [10] });

			act(() => {
				result.current.assignSeries(0);
			});
			expect(mockEditPost).toHaveBeenCalledWith({ series: [] });
		});

		it('resolves activeSeriesId to explicit targetSeriesId when valid', () => {
			const mockSeriesList = [
				{ id: 1, name: 'One' },
				{ id: 2, name: 'Two' },
			];

			useSelect.mockImplementation((selector) => {
				return selector((storeName) => {
					if (storeName === 'core/editor') {
						return {
							getCurrentPostId: () => 5,
							getEditedPostAttribute: () => [1],
						};
					}
					if (storeName === 'series-craft/store') {
						return {
							getSeries: () => mockSeriesList,
						};
					}
					return {};
				});
			});

			useDispatch.mockReturnValue({});

			const { result } = renderHook(() => useSeries(2));
			expect(result.current.assignedSeriesId).toBe(1);
			expect(result.current.activeSeriesId).toBe(2);
			expect(result.current.activeSeries).toEqual(mockSeriesList[1]);
		});
	});
});

