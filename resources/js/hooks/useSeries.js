/**
 * SeriesCraft Custom Hook for interacting with Series Data.
 */

import { useEffect, useCallback } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { STORE_NAME } from '../store/constants';

/**
 * Custom React hook to manage series state, settings, and updates.
 *
 * @param {number|null} seriesId Active series term ID.
 * @return {Object} Series state and dispatch helpers.
 */
export default function useSeries( seriesId ) {
	const { settings, isSaving, error } = useSelect(
		( select ) => {
			const store = select( STORE_NAME );
			return {
				settings: store.getSeriesSettings(),
				isSaving: store.isSavingSeries(),
				error: store.getSeriesError(),
			};
		},
		[ seriesId ]
	);

	const {
		fetchSeries,
		updateSetting: dispatchUpdateSetting,
		saveSettings: dispatchSaveSettings,
	} = useDispatch( STORE_NAME );

	useEffect( () => {
		if ( seriesId ) {
			fetchSeries( seriesId );
		}
	}, [ seriesId, fetchSeries ] );

	const updateSetting = useCallback(
		( key, value ) => {
			dispatchUpdateSetting( key, value );
		},
		[ dispatchUpdateSetting ]
	);

	const saveSettings = useCallback(
		async ( newSettings ) => {
			if ( ! seriesId ) {
				return;
			}
			return await dispatchSaveSettings( seriesId, newSettings );
		},
		[ seriesId, dispatchSaveSettings ]
	);

	return {
		settings,
		isSaving,
		error,
		updateSetting,
		saveSettings,
	};
}