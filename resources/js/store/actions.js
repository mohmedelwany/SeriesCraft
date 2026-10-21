/**
 * SeriesCraft Store Actions.
 */

import { ACTION_TYPES } from './constants';
import {
	fetchSeriesSettings,
	updateSeriesSettings,
	updateSeriesOrder,
} from '../api/seriesClient';

export function setSeriesId( seriesId ) {
	return {
		type: ACTION_TYPES.SET_SERIES_ID,
		seriesId,
	};
}

export function setSeriesSettings( settings ) {
	return {
		type: ACTION_TYPES.SET_SERIES_SETTINGS,
		settings,
	};
}

export function updateSetting( key, value ) {
	return {
		type: ACTION_TYPES.UPDATE_SETTING,
		key,
		value,
	};
}

export function setPostsOrder( postIds ) {
	return {
		type: ACTION_TYPES.SET_POSTS_ORDER,
		postIds,
	};
}

export function setIsSaving( isSaving ) {
	return {
		type: ACTION_TYPES.SET_IS_SAVING,
		isSaving,
	};
}

export function setError( error ) {
	return {
		type: ACTION_TYPES.SET_ERROR,
		error,
	};
}

/**
 * Thunk to fetch settings for a series from REST API.
 */
export const fetchSeries = ( termId ) => async ( { dispatch } ) => {
	try {
		const settings = await fetchSeriesSettings( termId );
		dispatch( setSeriesSettings( settings ) );
	} catch ( err ) {
		dispatch( setError( err.message || 'Failed to fetch series' ) );
	}
};

/**
 * Thunk to save settings for a series.
 */
export const saveSettings = ( termId, settings ) => async ( { dispatch } ) => {
	dispatch( setIsSaving( true ) );
	dispatch( setError( null ) );

	try {
		const result = await updateSeriesSettings( termId, settings );
		dispatch( setSeriesSettings( settings ) );
		return result;
	} catch ( err ) {
		dispatch( setError( err.message || 'Failed to update settings' ) );
		throw err;
	} finally {
		dispatch( setIsSaving( false ) );
	}
};

/**
 * Thunk to save sequential post ordering.
 */
export const savePostsOrder = ( termId, postIds ) => async ( { dispatch } ) => {
	dispatch( setIsSaving( true ) );
	dispatch( setError( null ) );

	try {
		const result = await updateSeriesOrder( termId, postIds );
		dispatch( setPostsOrder( postIds ) );
		return result;
	} catch ( err ) {
		dispatch( setError( err.message || 'Failed to update post order' ) );
		throw err;
	} finally {
		dispatch( setIsSaving( false ) );
	}
};