/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import useSeries from '../../../../resources/js/hooks/useSeries';
import * as wpData from '@wordpress/data';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

describe('useSeries Custom Hook', () => {
	const mockDispatch = {
		fetchSeries: jest.fn(),
		updateSetting: jest.fn(),
		saveSettings: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		wpData.useDispatch.mockReturnValue(mockDispatch);
	});

	it('should return series state and dispatch fetch on mount when seriesId provided', () => {
		wpData.useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesSettings: () => ({ layout: 'list' }),
				isSavingSeries: () => false,
				getSeriesError: () => null,
			}));
		});

		const { result } = renderHook(() => useSeries(15));

		expect(mockDispatch.fetchSeries).toHaveBeenCalledWith(15);
		expect(result.current.settings).toEqual({ layout: 'list' });
		expect(result.current.isSaving).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it('should provide updateSetting and saveSettings helpers', async () => {
		wpData.useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesSettings: () => ({ layout: 'grid' }),
				isSavingSeries: () => false,
				getSeriesError: () => null,
			}));
		});

		const { result } = renderHook(() => useSeries(15));

		act(() => {
			result.current.updateSetting('layout', 'media-grid');
		});
		expect(mockDispatch.updateSetting).toHaveBeenCalledWith('layout', 'media-grid');

		await act(async () => {
			await result.current.saveSettings({ layout: 'media-grid' });
		});
		expect(mockDispatch.saveSettings).toHaveBeenCalledWith(15, { layout: 'media-grid' });
	});
});