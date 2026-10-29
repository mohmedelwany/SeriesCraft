/**
 * Custom React Hook: useSeriesSettings
 *
 * Coordinates series appearance metadata retrieval, local settings synchronization,
 * debounced REST persistence, and canvas live preview event dispatching.
 *
 * @package SeriesCraft\Hooks
 */

import { useState, useEffect, useMemo, useRef } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import {
	STORE_NAME,
	DEFAULT_SETTINGS,
	DEFAULT_STYLE,
	SPACING_PREVIEW_EVENT,
	LIVE_PREVIEW_EVENT,
	PREVIEW_REFRESH_EVENT,
	normalizeSeriesSettings,
	applySpacingPreview,
	applyStylePreview,
} from '../editor/settings-sidebar/constants';

/**
 * useSeriesSettings hook.
 *
 * @param {number|string} seriesId Active series term ID.
 * @param {Object} [options] Optional options.
 * @param {Object} [options.activeSeries] Active series term object.
 * @param {number} [options.currentPostId] Currently edited post ID.
 * @param {Function} [options.updateSeriesMeta] Optional custom updater function.
 * @return {Object} Series settings state and actions.
 */
export function useSeriesSettings( seriesId, options = {} ) {
	const numericSeriesId = Number( seriesId );

	const storeMeta = useSelect(
		( select ) => {
			if ( ! numericSeriesId ) {
				return null;
			}
			return select( STORE_NAME )?.getSeriesMeta?.( numericSeriesId ) || null;
		},
		[ numericSeriesId ]
	);

	const storeDispatch = useDispatch( STORE_NAME ) || {};
	const updateSeriesMeta = options.updateSeriesMeta || storeDispatch.updateSeriesMeta;

	const storeMetaKey = useMemo( () => {
		return storeMeta ? JSON.stringify( storeMeta ) : '';
	}, [ storeMeta ] );

	const [ settings, setSettings ] = useState( () => normalizeSeriesSettings( storeMeta ) );
	const settingsRef = useRef( settings );
	settingsRef.current = settings;
	const saveDebounceTimerRef = useRef( null );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ error, setError ] = useState( '' );

	useEffect( () => {
		return () => {
			if ( saveDebounceTimerRef.current ) {
				clearTimeout( saveDebounceTimerRef.current );
			}
		};
	}, [] );

	// Synchronize local settings when store meta updates
	useEffect( () => {
		if ( storeMeta ) {
			const normalized = normalizeSeriesSettings( storeMeta );
			setSettings( normalized );
			if ( numericSeriesId && normalized?.style ) {
				applyStylePreview( {
					termId: numericSeriesId,
					style: normalized.style,
				} );
			}
		}
	}, [ storeMetaKey, numericSeriesId ] );

	// Register canvas listener for visual spacing preview overlay
	useEffect( () => {
		if ( typeof window === 'undefined' ) {
			return;
		}

		const handleSpacingPreview = ( event ) => {
			applySpacingPreview( event?.detail || {} );
		};

		window.addEventListener( SPACING_PREVIEW_EVENT, handleSpacingPreview );
		return () => {
			window.removeEventListener( SPACING_PREVIEW_EVENT, handleSpacingPreview );
		};
	}, [] );

	/**
	 * Dispatches window event helpers for live canvas and SSR updates.
	 *
	 * @param {number} termId Term ID.
	 * @param {Object} nextSettings Complete settings object.
	 */
	const dispatchLiveEvents = ( termId, nextSettings ) => {
		if ( typeof window === 'undefined' || ! window.dispatchEvent ) {
			return;
		}

		// 1. Live preview event for instant canvas re-render
		window.dispatchEvent(
			new CustomEvent( LIVE_PREVIEW_EVENT, {
				detail: {
					series: options.activeSeries ? [ options.activeSeries ] : [],
					layoutVariants: { [ termId ]: nextSettings.layout },
					layoutStyles: { [ termId ]: nextSettings.style },
					postId: options.currentPostId || 0,
				},
			} )
		);

		// 2. Trigger ServerSideRender / canvas block refresh
		window.dispatchEvent(
			new CustomEvent( PREVIEW_REFRESH_EVENT, {
				detail: { termId },
			} )
		);
		window.dispatchEvent(
			new CustomEvent( 'sc-series-preview-refresh', {
				detail: { termId },
			} )
		);
	};

	/**
	 * Persists settings changes to REST and triggers events.
	 *
	 * @param {Object} updatedSettings Merged settings.
	 */
	const saveSettings = async ( updatedSettings ) => {
		if ( ! numericSeriesId ) {
			return;
		}

		setError( '' );
		setSettings( updatedSettings );
		setIsSaving( true );

		const payload = {
			position: updatedSettings.position || DEFAULT_SETTINGS.position,
			layout: updatedSettings.layout || DEFAULT_SETTINGS.layout,
			style: updatedSettings.style || DEFAULT_STYLE,
			custom_styles: updatedSettings.style || DEFAULT_STYLE,
		};

		try {
			if ( typeof updateSeriesMeta === 'function' ) {
				await updateSeriesMeta( numericSeriesId, payload );
			}
			dispatchLiveEvents( numericSeriesId, updatedSettings );
		} catch ( err ) {
			setError( err?.message || __( 'Failed to update series settings.', 'series-craft' ) );
		} finally {
			setIsSaving( false );
		}
	};

	/**
	 * Handles layout variant updates from LayoutTab.
	 *
	 * @param {string} nextLayout Layout slug.
	 */
	const handleLayoutChange = ( nextLayout ) => {
		const next = {
			...settingsRef.current,
			layout: nextLayout,
		};
		saveSettings( next );
	};

	/**
	 * Handles individual style updates from StyleTab.
	 *
	 * @param {Object} styleUpdates Partial style object.
	 */
	const handleStyleChange = ( styleUpdates ) => {
		const nextStyle = {
			...settingsRef.current.style,
			...styleUpdates,
		};
		const next = {
			...settingsRef.current,
			style: nextStyle,
		};

		// 1. Immediately apply visual style custom properties to canvas DOM elements for instant feedback
		applyStylePreview( {
			termId: numericSeriesId,
			style: nextStyle,
		} );

		// 2. Dispatch live preview event immediately so all canvas listeners update
		if ( typeof window !== 'undefined' && window.dispatchEvent ) {
			window.dispatchEvent(
				new CustomEvent( LIVE_PREVIEW_EVENT, {
					detail: {
						series: options.activeSeries ? [ options.activeSeries ] : [],
						termId: numericSeriesId,
						layoutVariants: { [ numericSeriesId ]: next.layout },
						layoutStyles: { [ numericSeriesId ]: nextStyle },
						style: nextStyle,
						postId: options.currentPostId || 0,
					},
				} )
			);
		}

		setSettings( next );

		// 3. Debounce the REST API persistence to prevent flooding server requests during continuous color picking
		if ( saveDebounceTimerRef.current ) {
			clearTimeout( saveDebounceTimerRef.current );
		}
		saveDebounceTimerRef.current = setTimeout( () => {
			saveSettings( next );
		}, 300 );
	};

	/**
	 * Handles spacing dimension updates and triggers the spacing visualizer overlay.
	 *
	 * @param {string} type 'padding' | 'margin'
	 * @param {Object} nextValues Spacing values object.
	 */
	const handleSpacingChange = ( type, nextValues ) => {
		const nextStyle = {
			...settingsRef.current.style,
			[ type ]: nextValues,
		};

		if ( typeof window !== 'undefined' && window.dispatchEvent ) {
			window.dispatchEvent(
				new CustomEvent( SPACING_PREVIEW_EVENT, {
					detail: {
						termId: numericSeriesId,
						style: nextStyle,
						changedKeys: [ type ],
					},
				} )
			);
		}

		handleStyleChange( { [ type ]: nextValues } );
	};

	/**
	 * Resets custom styles back to design system defaults.
	 */
	const handleResetStyles = () => {
		const next = {
			...settingsRef.current,
			style: { ...DEFAULT_STYLE },
		};

		applyStylePreview( {
			termId: numericSeriesId,
			style: DEFAULT_STYLE,
		} );

		if ( typeof window !== 'undefined' && window.dispatchEvent ) {
			window.dispatchEvent(
				new CustomEvent( LIVE_PREVIEW_EVENT, {
					detail: {
						series: options.activeSeries ? [ options.activeSeries ] : [],
						termId: numericSeriesId,
						layoutVariants: { [ numericSeriesId ]: next.layout },
						layoutStyles: { [ numericSeriesId ]: DEFAULT_STYLE },
						style: DEFAULT_STYLE,
						postId: options.currentPostId || 0,
					},
				} )
			);
		}

		saveSettings( next );
	};

	return {
		settings,
		localSettings: settings,
		storeMeta,
		isSaving,
		error,
		setError,
		saveSettings,
		handleLayoutChange,
		handleStyleChange,
		handleSpacingChange,
		handleResetStyles,
		dispatchLiveEvents,
	};
}

export default useSeriesSettings;
