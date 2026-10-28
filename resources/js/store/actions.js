/**
 * SeriesCraft Store Actions.
 *
 * Implements standard action creators and async thunk workflows for optimistic
 * post reordering, metadata persistence, and inline series creation.
 *
 * @package SeriesCraft\Store
 */

import { ACTION_TYPES } from './constants';
import {
	updateSeriesOrder as clientUpdateSeriesOrder,
	updateSeriesSettings as clientUpdateSeriesSettings,
	createSeries as clientCreateSeries,
} from '../api/seriesClient';

/**
 * In-memory map to track auto-clearing notice timer IDs per series.
 */
const noticeTimers = new Map();

/**
 * Sets the full list of series in the store.
 *
 * @param {Array} items Array of series objects.
 * @return {Object} Action object.
 */
export function setSeries( items ) {
	return {
		type: ACTION_TYPES.SET_SERIES,
		items,
	};
}

/**
 * Receives the posts associated with a specific series.
 *
 * @param {number|string} seriesId Series term ID.
 * @param {Array} posts Array of post objects or IDs.
 * @return {Object} Action object.
 */
export function receiveSeriesPosts( seriesId, posts ) {
	return {
		type: ACTION_TYPES.RECEIVE_SERIES_POSTS,
		seriesId: Number( seriesId ),
		posts,
	};
}

/**
 * Updates the local post sequence for a series.
 *
 * @param {number|string} seriesId Series term ID.
 * @param {Array} postIds Array of post IDs or post objects.
 * @return {Object} Action object.
 */
export function updatePostOrder( seriesId, postIds ) {
	return {
		type: ACTION_TYPES.UPDATE_POST_ORDER,
		seriesId: Number( seriesId ),
		postIds,
	};
}

/**
 * Sets the saving state for post order persistence.
 *
 * @param {number|string} seriesId Series term ID.
 * @param {boolean} isSaving True if saving in progress, false otherwise.
 * @return {Object} Action object.
 */
export function setSavingOrder( seriesId, isSaving ) {
	return {
		type: ACTION_TYPES.SET_SAVING_ORDER,
		seriesId: Number( seriesId ),
		isSaving: Boolean( isSaving ),
	};
}

/**
 * Sets styling and layout metadata for a specific series.
 *
 * @param {number|string} seriesId Series term ID.
 * @param {Object} metaData Metadata object.
 * @return {Object} Action object.
 */
export function setSeriesMeta( seriesId, metaData ) {
	return {
		type: ACTION_TYPES.SET_SERIES_META,
		seriesId: Number( seriesId ),
		metaData,
	};
}

/**
 * Sets a status notice for a specific series.
 *
 * @param {number|string} seriesId Series term ID.
 * @param {string} status Notice status ('success', 'error', 'info', etc.).
 * @param {string} message Notice text content.
 * @return {Object} Action object.
 */
export function setNotice( seriesId, status, message ) {
	return {
		type: ACTION_TYPES.SET_NOTICE,
		seriesId: Number( seriesId ),
		status,
		message,
	};
}

/**
 * Clears the status notice for a specific series.
 *
 * @param {number|string} seriesId Series term ID.
 * @return {Object} Action object.
 */
export function clearNotice( seriesId ) {
	const numericId = Number( seriesId );
	if ( noticeTimers.has( numericId ) ) {
		clearTimeout( noticeTimers.get( numericId ) );
		noticeTimers.delete( numericId );
	}

	return {
		type: ACTION_TYPES.CLEAR_NOTICE,
		seriesId: numericId,
	};
}

/**
 * Optimistically reorders posts in a series, persists changes to the REST API,
 * dispatches a transient success notice, and rolls back with an error notice on failure.
 *
 * @param {number|string} seriesId Series term ID.
 * @param {Array<number|Object>} orderedPostIds Ordered array of post IDs or post objects.
 * @return {Function} Async thunk action.
 */
export const reorderSeriesPosts = ( seriesId, orderedPostIds ) => async ( { dispatch, select } ) => {
	if ( ! seriesId ) {
		throw new Error( 'seriesId is required to reorder series posts' );
	}
	if ( ! Array.isArray( orderedPostIds ) ) {
		throw new Error( 'orderedPostIds must be an array' );
	}

	const numericSeriesId = Number( seriesId );

	// 1. Capture snapshot of existing posts for rollback on failure
	const previousPosts = select.getSeriesPosts( numericSeriesId );

	// 2. Immediate optimistic local update
	dispatch( updatePostOrder( numericSeriesId, orderedPostIds ) );
	dispatch( setSavingOrder( numericSeriesId, true ) );

	// Normalize post IDs to numeric array for the REST payload
	const postIds = orderedPostIds.map( ( item ) =>
		typeof item === 'object' && item !== null ? Number( item.id ) : Number( item )
	);

	try {
		const response = await clientUpdateSeriesOrder( numericSeriesId, postIds );

		dispatch( setSavingOrder( numericSeriesId, false ) );
		dispatch( setNotice( numericSeriesId, 'success', 'Series post order saved successfully.' ) );

		// Clear any existing timer for this series
		if ( noticeTimers.has( numericSeriesId ) ) {
			clearTimeout( noticeTimers.get( numericSeriesId ) );
		}

		// Schedule transient auto-clear after 3.5 seconds
		const timerId = setTimeout( () => {
			dispatch( clearNotice( numericSeriesId ) );
			noticeTimers.delete( numericSeriesId );
		}, 3500 );
		noticeTimers.set( numericSeriesId, timerId );

		return response;
	} catch ( error ) {
		// Roll back to previous snapshot immediately
		dispatch( updatePostOrder( numericSeriesId, previousPosts ) );
		dispatch( setSavingOrder( numericSeriesId, false ) );

		const errorMessage = error?.message || 'Failed to save series post order.';
		dispatch( setNotice( numericSeriesId, 'error', errorMessage ) );

		throw error;
	}
};

/**
 * Persists layout and visual styles to series meta via the REST API.
 *
 * @param {number|string} seriesId Series term ID.
 * @param {Object} metaData Metadata payload containing layout and custom_styles.
 * @return {Function} Async thunk action.
 */
export const updateSeriesMeta = ( seriesId, metaData ) => async ( { dispatch } ) => {
	if ( ! seriesId ) {
		throw new Error( 'seriesId is required to update series meta' );
	}

	const numericSeriesId = Number( seriesId );

	// Optimistically apply metadata to local store
	dispatch( setSeriesMeta( numericSeriesId, metaData ) );

	try {
		const response = await clientUpdateSeriesSettings( numericSeriesId, metaData );

		const updatedSettings = response?.settings || response;
		if ( updatedSettings ) {
			dispatch( setSeriesMeta( numericSeriesId, updatedSettings ) );
		}

		return response;
	} catch ( error ) {
		const errorMessage = error?.message || 'Failed to update series settings.';
		dispatch( setNotice( numericSeriesId, 'error', errorMessage ) );
		throw error;
	}
};

/**
 * Creates a new series term inline via the REST API and updates store state.
 *
 * @param {string} name Series name.
 * @param {Object} [additionalData] Optional additional fields (description, slug, etc.).
 * @return {Function} Async thunk action.
 */
export const createSeries = ( name, additionalData = {} ) => async ( { dispatch, select } ) => {
	try {
		const response = await clientCreateSeries( name, additionalData );

		const newSeries = {
			id: Number( response?.id || response?.term_id ),
			name: response?.name || ( typeof name === 'string' ? name.trim() : '' ),
			slug: response?.slug || '',
			count: Number( response?.count || 0 ),
			...response,
		};

		const existingSeries = select.getSeries() || [];
		dispatch( setSeries( [ ...existingSeries, newSeries ] ) );

		return newSeries;
	} catch ( error ) {
		const errorMessage = error?.message || 'Failed to create series.';
		throw new Error( errorMessage );
	}
};


export default {
	setSeries,
	receiveSeriesPosts,
	updatePostOrder,
	setSavingOrder,
	setSeriesMeta,
	setNotice,
	clearNotice,
	reorderSeriesPosts,
	updateSeriesMeta,
	createSeries,
};
