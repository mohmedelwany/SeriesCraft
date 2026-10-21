/**
 * Edit component for 'seriescraft/series-list' Gutenberg block.
 *
 * Fetches series data strictly using the new modern REST API endpoint (/seriescraft/v1/series).
 */

import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, RangeControl } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import ModeSelector from './components/ModeSelector';
import UserSelector from './components/UserSelector';
import SeriesPreview from './components/SeriesPreview';
import { fetchSeriesList } from '../../api/seriesClient';

/**
 * Series List Block Edit Component.
 *
 * @param {Object} props Component props.
 * @param {Object} props.attributes Block attributes.
 * @param {Function} props.setAttributes Attribute update setter.
 * @return {JSX.Element} Rendered block edit UI.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { mode = 'all', limit = 5, userId = '' } = attributes;
	const [ seriesTerms, setSeriesTerms ] = useState( [] );
	const [ isLoading, setIsLoading ] = useState( false );

	const blockProps = useBlockProps( {
		className: 'wp-block-seriescraft-series-list seriescraft-series-list-block sm-series-editor-root',
	} );

	// Fetch users for the user selector if in user mode
	const users = useSelect( ( select ) => {
		const core = select( 'core' );
		return core?.getUsers?.( { per_page: -1 } ) || [];
	}, [] );

	// Fetch series data strictly using the new modern REST API endpoint (/seriescraft/v1/series)
	useEffect( () => {
		let isMounted = true;
		setIsLoading( true );

		fetchSeriesList( {
			mode,
			limit: mode === 'top' ? limit : 100,
			userId,
		} )
			.then( ( data ) => {
				if ( isMounted ) {
					setSeriesTerms( Array.isArray( data ) ? data : [] );
					setIsLoading( false );
				}
			} )
			.catch( () => {
				if ( isMounted ) {
					setSeriesTerms( [] );
					setIsLoading( false );
				}
			} );

		return () => {
			isMounted = false;
		};
	}, [ mode, limit, userId ] );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Series Display Mode', 'series-craft' ) }>
					<ModeSelector
						mode={ mode }
						onChange={ ( newMode ) => setAttributes( { mode: newMode } ) }
					/>

					{ mode === 'top' && (
						<RangeControl
							label={ __( 'Limit', 'series-craft' ) }
							value={ limit }
							onChange={ ( newLimit ) => setAttributes( { limit: newLimit } ) }
							min={ 1 }
							max={ 20 }
							__nextHasNoMarginBottom={ true }
						/>
					) }

					{ ( mode === 'user' || mode === 'topics' ) && (
						<UserSelector
							userId={ userId }
							users={ users }
							onChange={ ( newUserId ) => setAttributes( { userId: newUserId } ) }
						/>
					) }

					<SeriesPreview
						mode={ mode }
						seriesTerms={ seriesTerms }
						isResolvingSeriesTerms={ isLoading }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className="sc-series-block-canvas-preview" data-testid="series-block-canvas">
					<SeriesPreview
						mode={ mode }
						seriesTerms={ seriesTerms }
						isResolvingSeriesTerms={ isLoading }
					/>
				</div>
			</div>
		</>
	);
}
