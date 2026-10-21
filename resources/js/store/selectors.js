/**
 * SeriesCraft Store Selectors.
 */

/**
 * Gets the currently selected series term ID.
 *
 * @param {Object} state Store state.
 * @return {number|null} Current series ID.
 */
export function getCurrentSeriesId( state ) {
	return state?.currentSeriesId ?? null;
}

/**
 * Gets the current series settings.
 *
 * @param {Object} state Store state.
 * @return {Object} Series settings object.
 */
export function getSeriesSettings( state ) {
	return state?.settings || {};
}

/**
 * Gets a specific setting value by key.
 *
 * @param {Object} state        Store state.
 * @param {string} key          Setting key name.
 * @param {*}      defaultValue Fallback value if setting not found.
 * @return {*} Setting value.
 */
export function getSeriesSetting( state, key, defaultValue = undefined ) {
	const settings = getSeriesSettings( state );
	return settings[ key ] !== undefined ? settings[ key ] : defaultValue;
}

/**
 * Gets the ordered array of post IDs for the active series.
 *
 * @param {Object} state Store state.
 * @return {Array<number>} List of ordered post IDs.
 */
export function getOrderedPostIds( state ) {
	return state?.orderedPostIds || [];
}

/**
 * Checks whether an asynchronous save operation is in progress.
 *
 * @param {Object} state Store state.
 * @return {boolean} True if saving.
 */
export function isSavingSeries( state ) {
	return Boolean( state?.isSaving );
}

/**
 * Gets the latest error message if any.
 *
 * @param {Object} state Store state.
 * @return {string|null} Error message or null.
 */
export function getSeriesError( state ) {
	return state?.error ?? null;
}