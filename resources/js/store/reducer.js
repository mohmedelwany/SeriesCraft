/**
 * SeriesCraft Store Reducer.
 */

import { ACTION_TYPES } from './constants';

export const DEFAULT_STATE = {
	currentSeriesId: null,
	settings: {
		layout: 'list',
		custom_styles: {},
	},
	orderedPostIds: [],
	isSaving: false,
	error: null,
};

/**
 * Handles state transitions for the series store.
 *
 * @param {Object} state  Current state slice.
 * @param {Object} action Dispatched action object.
 * @return {Object} Updated immutable state.
 */
export default function reducer( state = DEFAULT_STATE, action ) {
	switch ( action.type ) {
		case ACTION_TYPES.SET_SERIES_ID:
			return {
				...state,
				currentSeriesId: action.seriesId,
			};

		case ACTION_TYPES.SET_SERIES_SETTINGS:
			return {
				...state,
				settings: {
					...state.settings,
					...action.settings,
				},
			};

		case ACTION_TYPES.UPDATE_SETTING:
			return {
				...state,
				settings: {
					...state.settings,
					[ action.key ]: action.value,
				},
			};

		case ACTION_TYPES.SET_POSTS_ORDER:
			return {
				...state,
				orderedPostIds: [ ...action.postIds ],
			};

		case ACTION_TYPES.SET_IS_SAVING:
			return {
				...state,
				isSaving: Boolean( action.isSaving ),
			};

		case ACTION_TYPES.SET_ERROR:
			return {
				...state,
				error: action.error,
			};

		default:
			return state;
	}
}