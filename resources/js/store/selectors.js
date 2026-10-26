/**
 * SeriesCraft Store Selectors.
 *
 * @package SeriesCraft\Store
 */

/**
 * Retrieves the list of all available series.
 *
 * @param {Object} state Store state.
 * @return {Array} List of series terms.
 */
export function getSeries( state ) {
	return state?.series || [];
}

/**
 * Retrieves the ordered list of posts for a specific series.
 *
 * @param {Object} state Store state.
 * @param {number|string} seriesId Series term ID.
 * @return {Array} List of ordered posts or IDs.
 */
export function getSeriesPosts( state, seriesId ) {
	if ( ! seriesId ) {
		return [];
	}
	return state?.postsBySeries?.[ seriesId ] || [];
}

/**
 * Checks whether a specific series is currently saving its post order.
 *
 * @param {Object} state Store state.
 * @param {number|string} seriesId Series term ID.
 * @return {boolean} True if currently saving order, false otherwise.
 */
export function isSavingOrder( state, seriesId ) {
	if ( ! seriesId ) {
		return false;
	}
	return Boolean( state?.isSaving?.[ seriesId ] );
}

/**
 * Retrieves styling and layout settings metadata for a specific series.
 *
 * @param {Object} state Store state.
 * @param {number|string} seriesId Series term ID.
 * @return {Object|null} Series metadata or null if not loaded.
 */
export function getSeriesMeta( state, seriesId ) {
	if ( ! seriesId ) {
		return null;
	}
	return state?.metaBySeries?.[ seriesId ] || null;
}

/**
 * Retrieves the current status notice for a specific series order operation.
 *
 * @param {Object} state Store state.
 * @param {number|string} seriesId Series term ID.
 * @return {Object|null} Notice object with { status, message } or null.
 */
export function getOrderNotice( state, seriesId ) {
	if ( ! seriesId ) {
		return null;
	}
	return state?.notices?.[ seriesId ] || null;
}

/**
 * Retrieves a single series item by its ID.
 *
 * @param {Object} state Store state.
 * @param {number|string} seriesId Series term ID.
 * @return {Object|null} Series item or null if not found.
 */
export function getSeriesById( state, seriesId ) {
	if ( ! seriesId ) {
		return null;
	}
	const list = getSeries( state );
	return list.find( ( item ) => Number( item.id ) === Number( seriesId ) ) || null;
}

/**
 * Retrieves all currently active notices across all series.
 *
 * @param {Object} state Store state.
 * @return {Object} Notices dictionary keyed by seriesId.
 */
export function getAllNotices( state ) {
	return state?.notices || {};
}

export default {
	getSeries,
	getSeriesPosts,
	isSavingOrder,
	getSeriesMeta,
	getOrderNotice,
	getSeriesById,
	getAllNotices,
};
