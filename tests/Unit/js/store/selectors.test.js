import {
	getCurrentSeriesId,
	getSeriesSettings,
	getSeriesSetting,
	getOrderedPostIds,
	isSavingSeries,
	getSeriesError,
} from '../../../../resources/js/store/selectors';

describe('Series Store Selectors', () => {
	const mockState = {
		currentSeriesId: 25,
		settings: {
			layout: 'media-grid',
			custom_styles: { border_color: '#0073aa' },
		},
		orderedPostIds: [10, 20, 30],
		isSaving: true,
		error: 'Save failed',
	};

	it('should return the current series ID', () => {
		expect(getCurrentSeriesId(mockState)).toBe(25);
	});

	it('should return all series settings or empty object fallback', () => {
		expect(getSeriesSettings(mockState)).toEqual(mockState.settings);
		expect(getSeriesSettings({})).toEqual({});
	});

	it('should return a specific setting by key with fallback default', () => {
		expect(getSeriesSetting(mockState, 'layout')).toBe('media-grid');
		expect(getSeriesSetting(mockState, 'non_existent', 'default-value')).toBe('default-value');
	});

	it('should return ordered post IDs array', () => {
		expect(getOrderedPostIds(mockState)).toEqual([10, 20, 30]);
		expect(getOrderedPostIds({})).toEqual([]);
	});

	it('should return saving and error states', () => {
		expect(isSavingSeries(mockState)).toBe(true);
		expect(getSeriesError(mockState)).toBe('Save failed');
	});
});