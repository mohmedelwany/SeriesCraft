import reducer, { DEFAULT_STATE } from '../../../../resources/js/store/reducer';
import { ACTION_TYPES } from '../../../../resources/js/store/constants';

describe('Series Store Reducer', () => {
	it('should return initial state when action is unknown', () => {
		const state = reducer(undefined, { type: 'UNKNOWN_ACTION' });
		expect(state).toEqual(DEFAULT_STATE);
	});

	it('should handle SET_SERIES_ID', () => {
		const state = reducer(DEFAULT_STATE, {
			type: ACTION_TYPES.SET_SERIES_ID,
			seriesId: 42,
		});
		expect(state.currentSeriesId).toBe(42);
	});

	it('should handle SET_SERIES_SETTINGS', () => {
		const settings = {
			layout: 'media-grid',
			custom_styles: { border_color: '#111111' },
		};
		const state = reducer(DEFAULT_STATE, {
			type: ACTION_TYPES.SET_SERIES_SETTINGS,
			settings,
		});
		expect(state.settings).toEqual(settings);
	});

	it('should handle UPDATE_SETTING for a single key', () => {
		const initialState = {
			...DEFAULT_STATE,
			settings: { layout: 'list', custom_styles: {} },
		};
		const state = reducer(initialState, {
			type: ACTION_TYPES.UPDATE_SETTING,
			key: 'layout',
			value: 'grid',
		});
		expect(state.settings.layout).toBe('grid');
	});

	it('should handle SET_POSTS_ORDER', () => {
		const postIds = [301, 302, 305];
		const state = reducer(DEFAULT_STATE, {
			type: ACTION_TYPES.SET_POSTS_ORDER,
			postIds,
		});
		expect(state.orderedPostIds).toEqual(postIds);
	});

	it('should handle SET_IS_SAVING and SET_ERROR flags', () => {
		let state = reducer(DEFAULT_STATE, {
			type: ACTION_TYPES.SET_IS_SAVING,
			isSaving: true,
		});
		expect(state.isSaving).toBe(true);

		state = reducer(state, {
			type: ACTION_TYPES.SET_ERROR,
			error: 'Network failure',
		});
		expect(state.error).toBe('Network failure');
	});
});