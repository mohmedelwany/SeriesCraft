/**
 * SeriesCraft Store Resolvers.
 *
 * Automatic data resolution hooks triggered on first selector execution.
 *
 * @package SeriesCraft\Store
 */

import {
	fetchSeriesList,
	fetchSeriesPosts,
	fetchSeriesSettings,
} from '../api/seriesClient';
import { setSeries, receiveSeriesPosts, setSeriesMeta } from './actions';

/**
 * Resolver for `getSeries` selector.
 * Fetches available series taxonomy terms from the REST API.
 *
 * @return {Function} Async resolver.
 */
export const getSeries = () => async ( { dispatch } ) => {
	try {
		const items = await fetchSeriesList();

		if ( Array.isArray( items ) ) {
			dispatch( setSeries( items ) );
		}
		return items;
	} catch ( error ) {
		return [];
	}
};

/**
 * Resolver for `getSeriesPosts` selector.
 * Fetches ordered posts belonging to the specified series.
 *
 * @param {number|string} seriesId Series term ID.
 * @return {Function} Async resolver.
 */
export const getSeriesPosts = ( seriesId ) => async ( { dispatch } ) => {
	if ( ! seriesId ) {
		return [];
	}

	const numericSeriesId = Number( seriesId );

	try {
		const posts = await fetchSeriesPosts( numericSeriesId );

		if ( Array.isArray( posts ) ) {
			dispatch( receiveSeriesPosts( numericSeriesId, posts ) );
		}
		return posts;
	} catch ( error ) {
		return [];
	}
};

/**
 * Resolver for `getSeriesMeta` selector.
 * Fetches settings, layout variant, and custom styling for the specified series.
 *
 * @param {number|string} seriesId Series term ID.
 * @return {Function} Async resolver.
 */
export const getSeriesMeta = ( seriesId ) => async ( { dispatch } ) => {
	if ( ! seriesId ) {
		return null;
	}

	const numericSeriesId = Number( seriesId );

	try {
		const settings = await fetchSeriesSettings( numericSeriesId );

		if ( settings ) {
			dispatch( setSeriesMeta( numericSeriesId, settings ) );
		}
		return settings;
	} catch ( error ) {
		return null;
	}
};

export default {
	getSeries,
	getSeriesPosts,
	getSeriesMeta,
};

