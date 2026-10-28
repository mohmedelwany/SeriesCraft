/**
 * @jest-environment jsdom
 *
 * Unit Tests for useSeriesSettings Hook.
 *
 * @package SeriesCraft\Tests\Unit\Js\Hooks
 */

import { useSeriesSettings } from '../../../../resources/js/hooks/useSeriesSettings';
import { useSelect, useDispatch } from '@wordpress/data';
import { renderHook, act } from '@testing-library/react';
import {
	DEFAULT_STYLE,
	SPACING_PREVIEW_EVENT,
	LIVE_PREVIEW_EVENT,
	PREVIEW_REFRESH_EVENT,
} from '../../../../resources/js/editor/settings-sidebar/constants';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

describe('useSeriesSettings Hook', () => {
	const mockUpdateSeriesMeta = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
		mockUpdateSeriesMeta.mockResolvedValue({ success: true });

		useDispatch.mockReturnValue({
			updateSeriesMeta: mockUpdateSeriesMeta,
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('Test 1: initializes with default settings when store metadata is null', () => {
		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesMeta: () => null,
			}));
		});

		const { result } = renderHook(() => useSeriesSettings(10));

		expect(result.current.settings).toBeDefined();
		expect(result.current.settings.layout).toBe('link-list');
		expect(result.current.isSaving).toBe(false);
		expect(result.current.error).toBe('');
	});

	it('Test 2: initializes and normalizes settings from store meta', () => {
		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesMeta: (id) =>
					id === 25
						? {
								layout: 'cards',
								style: { ...DEFAULT_STYLE, buttonColor: '#ff0000' },
						  }
						: null,
			}));
		});

		const { result } = renderHook(() => useSeriesSettings(25));

		expect(result.current.settings.layout).toBe('cards');
		expect(result.current.settings.style.buttonColor).toBe('#ff0000');
	});

	it('Test 3: handleLayoutChange updates settings and calls updateSeriesMeta immediately', async () => {
		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesMeta: () => null,
			}));
		});

		const livePreviewListener = jest.fn();
		window.addEventListener(LIVE_PREVIEW_EVENT, livePreviewListener);

		const { result } = renderHook(() =>
			useSeriesSettings(15, {
				activeSeries: { id: 15, name: 'Docker 101' },
				currentPostId: 42,
				updateSeriesMeta: mockUpdateSeriesMeta,
			})
		);

		await act(async () => {
			result.current.handleLayoutChange('table-list');
		});

		expect(mockUpdateSeriesMeta).toHaveBeenCalledWith(
			15,
			expect.objectContaining({ layout: 'table-list' })
		);
		expect(result.current.settings.layout).toBe('table-list');
		expect(livePreviewListener).toHaveBeenCalled();

		window.removeEventListener(LIVE_PREVIEW_EVENT, livePreviewListener);
	});

	it('Test 4: handleStyleChange updates local settings and debounces persistence', async () => {
		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesMeta: () => null,
			}));
		});

		const { result } = renderHook(() =>
			useSeriesSettings(15, {
				activeSeries: { id: 15, name: 'Docker 101' },
				currentPostId: 42,
				updateSeriesMeta: mockUpdateSeriesMeta,
			})
		);

		act(() => {
			result.current.handleStyleChange({ buttonColor: '#00ff00' });
		});

		expect(result.current.settings.style.buttonColor).toBe('#00ff00');
		expect(mockUpdateSeriesMeta).not.toHaveBeenCalled();

		await act(async () => {
			jest.advanceTimersByTime(300);
		});

		expect(mockUpdateSeriesMeta).toHaveBeenCalledWith(
			15,
			expect.objectContaining({
				style: expect.objectContaining({ buttonColor: '#00ff00' }),
			})
		);
	});

	it('Test 5: handleSpacingChange dispatches SPACING_PREVIEW_EVENT and calls handleStyleChange', async () => {
		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesMeta: () => null,
			}));
		});

		const spacingListener = jest.fn();
		window.addEventListener(SPACING_PREVIEW_EVENT, spacingListener);

		const { result } = renderHook(() =>
			useSeriesSettings(15, {
				activeSeries: { id: 15, name: 'Docker 101' },
				currentPostId: 42,
				updateSeriesMeta: mockUpdateSeriesMeta,
			})
		);

		act(() => {
			result.current.handleSpacingChange('padding', { top: '24px' });
		});

		expect(spacingListener).toHaveBeenCalledWith(
			expect.objectContaining({
				detail: expect.objectContaining({
					termId: 15,
					changedKeys: ['padding'],
				}),
			})
		);

		window.removeEventListener(SPACING_PREVIEW_EVENT, spacingListener);
	});

	it('Test 6: handleResetStyles resets styles to default and persists', async () => {
		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesMeta: () => ({
					layout: 'cards',
					style: { ...DEFAULT_STYLE, primaryColor: '#123456' },
				}),
			}));
		});

		const { result } = renderHook(() =>
			useSeriesSettings(15, {
				activeSeries: { id: 15, name: 'Docker 101' },
				currentPostId: 42,
				updateSeriesMeta: mockUpdateSeriesMeta,
			})
		);

		await act(async () => {
			result.current.handleResetStyles();
		});

		expect(result.current.settings.style).toEqual(DEFAULT_STYLE);
		expect(mockUpdateSeriesMeta).toHaveBeenCalledWith(
			15,
			expect.objectContaining({ style: DEFAULT_STYLE })
		);
	});

	it('Test 7: records error message when saveSettings fails', async () => {
		useSelect.mockImplementation((selector) => {
			return selector(() => ({
				getSeriesMeta: () => null,
			}));
		});

		mockUpdateSeriesMeta.mockRejectedValueOnce(new Error('Network failure'));

		const { result } = renderHook(() =>
			useSeriesSettings(15, {
				updateSeriesMeta: mockUpdateSeriesMeta,
			})
		);

		await act(async () => {
			await result.current.saveSettings({ layout: 'cards' });
		});

		expect(result.current.error).toBe('Network failure');
		expect(result.current.isSaving).toBe(false);
	});
});
