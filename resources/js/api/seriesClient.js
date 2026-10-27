/**
 * SeriesCraft Client-side REST API wrapper.
 *
 * Communicates with the WordPress REST API endpoints for series management.
 */

import apiFetch from '@wordpress/api-fetch';

/**
 * Base REST API namespace.
 */
const REST_NAMESPACE = '/series-craft/v1';

/**
 * Fetches settings for a specific series term.
 *
 * @param {number} termId Series term ID.
 * @return {Promise<Object>} Response data containing series settings.
 */
export async function fetchSeriesSettings( termId ) {
	if ( ! termId || typeof termId !== 'number' ) {
		throw new Error( 'Valid series term ID is required' );
	}

	return await apiFetch( {
		path: `${ REST_NAMESPACE }/series/${ termId }/settings`,
		method: 'GET',
	} );
}

/**
 * Updates settings for a specific series term.
 *
 * @param {number} termId Series term ID.
 * @param {Object} settings Settings payload to persist.
 * @return {Promise<Object>} Response data confirming update.
 */
export async function updateSeriesSettings( termId, settings = {} ) {
	if ( ! termId || typeof termId !== 'number' ) {
		throw new Error( 'Valid series term ID is required' );
	}

	return await apiFetch( {
		path: `${ REST_NAMESPACE }/series/${ termId }/settings`,
		method: 'POST',
		data: settings,
	} );
}

/**
 * Updates the sequential order of posts for a specific series term.
 *
 * @param {number} termId Series term ID.
 * @param {Array<number>} postIds Ordered array of post IDs.
 * @return {Promise<Object>} Response data confirming reorder.
 */
export async function updateSeriesOrder( termId, postIds ) {
	if ( ! termId || typeof termId !== 'number' ) {
		throw new Error( 'Valid series term ID is required' );
	}

	if ( ! Array.isArray( postIds ) ) {
		throw new Error( 'postIds must be an array of integers' );
	}

	const response = await apiFetch( {
		path: `${ REST_NAMESPACE }/series/${ termId }/order`,
		method: 'POST',
		data: {
			post_ids: postIds,
		},
	} );

	if ( typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' ) {
		const eventPayload = {
			seriesId: termId,
			termId,
			postIds,
			timestamp: Date.now(),
		};
		window.dispatchEvent( new CustomEvent( 'seriescraft:order-updated', { detail: eventPayload } ) );
		window.dispatchEvent( new CustomEvent( 'sc-series-preview-refresh', { detail: eventPayload } ) );
	}

	return response;
}

/**
 * Fetches list of series from the modern REST API endpoint.
 *
 * @param {Object} [params] Query parameters (mode, limit, userId).
 * @return {Promise<Array>} List of series objects.
 */
export async function fetchSeriesList( params = {} ) {
	const query = [];
	if ( params.mode ) {
		query.push( `mode=${ encodeURIComponent( params.mode ) }` );
	}
	if ( params.limit !== undefined && params.limit !== null ) {
		query.push( `limit=${ encodeURIComponent( params.limit ) }` );
	}
	if ( params.userId ) {
		query.push( `userId=${ encodeURIComponent( params.userId ) }` );
	}

	const queryString = query.length > 0 ? `?${ query.join( '&' ) }` : '';
	return await apiFetch( {
		path: `/seriescraft/v1/series${ queryString }`,
		method: 'GET',
	} );
}

export default {
	fetchSeriesSettings,
	updateSeriesSettings,
	updateSeriesOrder,
	fetchSeriesList,
};