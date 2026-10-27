/**
 * SeriesSidebar Component for Gutenberg editor.
 */

import { useState, useEffect } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import SeriesSelector from './SeriesSelector';
import PartOrderList from './PartOrderList';
import useSeries from '../hooks/useSeries';
import useSeriesOrder from '../hooks/useSeriesOrder';

/**
 * Main sidebar container combining series selection and layout settings.
 *
 * @param {Object} props                  Component props.
 * @param {Array}  props.seriesList       Available series array.
 * @param {number} props.initialSeriesId  Preselected series ID.
 * @param {number} props.currentPostId    Currently edited post ID.
 * @param {string} props.currentPostTitle Currently edited post title.
 * @return {JSX.Element} Rendered sidebar component.
 */
export default function SeriesSidebar( {
	seriesList = [],
	initialSeriesId = null,
	currentPostId = null,
	currentPostTitle = null,
} ) {
	const [ selectedSeriesId, setSelectedSeriesId ] = useState( initialSeriesId );
	const [ currentOrderedIds, setCurrentOrderedIds ] = useState( [] );

	const editorDispatch = useDispatch( 'core/editor' );
	const editPost = editorDispatch?.editPost;

	// Synchronize if initialSeriesId changes externally
	useEffect( () => {
		if ( initialSeriesId !== undefined && initialSeriesId !== selectedSeriesId ) {
			setSelectedSeriesId( initialSeriesId );
			setCurrentOrderedIds( [] );
		}
	}, [ initialSeriesId ] );

	const handleSeriesChange = ( nextId ) => {
		const parsedId = nextId ? Number( nextId ) : null;
		setSelectedSeriesId( parsedId );
		setCurrentOrderedIds( [] );

		// Persist series taxonomy selection in Gutenberg editor data store
		if ( typeof editPost === 'function' ) {
			editPost( { series: parsedId ? [ parsedId ] : [] } );
		}
	};

	const { settings, isSaving, error, saveSettings } = useSeries( selectedSeriesId );
	const { orderedPostIds, moveItem, saveOrder } = useSeriesOrder( selectedSeriesId );

	const handleSave = async () => {
		if ( selectedSeriesId ) {
			if ( saveSettings ) {
				await saveSettings( settings );
			}
			const finalOrderIds = currentOrderedIds.length > 0 ? currentOrderedIds : orderedPostIds;
			if ( saveOrder && finalOrderIds.length > 0 ) {
				await saveOrder( finalOrderIds );
			}
			if ( typeof editPost === 'function' ) {
				editPost( { series: [ selectedSeriesId ] } );
			}
		}
	};

	return (
		<div className="seriescraft-editor-sidebar sc-inspector-panel">
			<div className="sc-inspector-panel__section">
				<SeriesSelector
					seriesList={ seriesList }
					selectedSeriesId={ selectedSeriesId }
					onChange={ handleSeriesChange }
					isDisabled={ isSaving }
				/>

				{ error && (
					<div className="seriescraft-error-notice">
						<p>{ error }</p>
					</div>
				) }
			</div>

			{ selectedSeriesId && (
				<>
					<div className="sc-inspector-panel__section">
						<PartOrderList
							seriesId={ selectedSeriesId }
							currentPostId={ currentPostId }
							currentPostTitle={ currentPostTitle }
							orderedPostIds={ orderedPostIds }
							moveItem={ moveItem }
							onOrderChange={ setCurrentOrderedIds }
						/>
					</div>



					<div className="seriescraft-sidebar-actions">
						<Button
							variant="primary"
							onClick={ handleSave }
							isBusy={ isSaving }
							disabled={ isSaving }
						>
							Save Settings
						</Button>
					</div>
				</>
			) }
		</div>
	);
}