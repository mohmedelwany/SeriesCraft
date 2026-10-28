/**
 * Custom React Hook: useSeries
 *
 * Centralizes series taxonomy retrieval, current post series assignment,
 * active series resolution for appearance controls, and series creation.
 *
 * @package SeriesCraft\Hooks
 */

import { useMemo } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { STORE_NAME } from '../store/constants';

/**
 * Normalizes raw taxonomy attribute to a numeric series term ID.
 *
 * @param {*} rawSeries Raw series attribute from core/editor.
 * @return {number} Extracted series term ID or 0.
 */
export function extractSeriesId( rawSeries ) {
	if ( Array.isArray( rawSeries ) && rawSeries.length > 0 ) {
		const first = rawSeries[ 0 ];
		const id =
			typeof first === 'object' && first !== null
				? Number( first.id || first.term_id )
				: Number( first );
		return isNaN( id ) ? 0 : id;
	}
	if ( rawSeries ) {
		const num = Number( rawSeries );
		return ! isNaN( num ) ? num : 0;
	}
	return 0;
}

/**
 * useSeries hook.
 *
 * @param {number} [targetSeriesId=0] Optional explicit series ID to inspect/customize.
 * @return {Object} Series state and manipulation handlers.
 */
export function useSeries( targetSeriesId = 0 ) {
	const { currentPostId, rawSeries, seriesList } = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		const store = select( STORE_NAME );

		return {
			currentPostId: editor?.getCurrentPostId?.() || 0,
			rawSeries: editor?.getEditedPostAttribute?.( 'series' ),
			seriesList: store?.getSeries?.() || [],
		};
	}, [] );

	const editorDispatch = typeof useDispatch === 'function' ? useDispatch( 'core/editor' ) : {};
	const storeDispatch = typeof useDispatch === 'function' ? useDispatch( STORE_NAME ) : {};
	const editPost = editorDispatch?.editPost;
	const createSeries = storeDispatch?.createSeries;
	const updateSeriesMeta = storeDispatch?.updateSeriesMeta;

	const assignedSeriesId = useMemo( () => extractSeriesId( rawSeries ), [ rawSeries ] );

	const assignedSeries = useMemo( () => {
		return seriesList.find( ( s ) => Number( s.id ) === Number( assignedSeriesId ) ) || null;
	}, [ seriesList, assignedSeriesId ] );

	const activeSeriesId = useMemo( () => {
		if ( targetSeriesId > 0 && seriesList.some( ( s ) => Number( s.id ) === Number( targetSeriesId ) ) ) {
			return Number( targetSeriesId );
		}
		if ( assignedSeriesId > 0 && seriesList.some( ( s ) => Number( s.id ) === Number( assignedSeriesId ) ) ) {
			return Number( assignedSeriesId );
		}
		return seriesList.length > 0 ? Number( seriesList[ 0 ].id ) : 0;
	}, [ targetSeriesId, assignedSeriesId, seriesList ] );

	const activeSeries = useMemo( () => {
		return seriesList.find( ( s ) => Number( s.id ) === Number( activeSeriesId ) ) || null;
	}, [ seriesList, activeSeriesId ] );

	const assignSeries = ( newSeriesId ) => {
		if ( typeof editPost === 'function' ) {
			const numericId = Number( newSeriesId );
			editPost( {
				series: numericId > 0 ? [ numericId ] : [],
			} );
		}
	};

	return {
		currentPostId,
		seriesList,
		assignedSeriesId,
		assignedSeries,
		activeSeriesId,
		activeSeries,
		createSeries,
		assignSeries,
		updateSeriesMeta,
	};
}

export default useSeries;
