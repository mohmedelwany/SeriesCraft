/**
 * SeriesSelector Component for Gutenberg Document Settings Sidebar.
 *
 * Manages post series assignment via dropdown and facilitates inline series
 * creation with immediate auto-selection.
 *
 * @package SeriesCraft\Sidebar
 */

import { useState } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl, Button, Notice } from '@wordpress/components';
import { STORE_NAME } from '../store/constants';

/**
 * SeriesSelector component.
 *
 * @param {Object} props Component props.
 * @param {number} props.currentSeriesId Currently assigned series ID (or 0).
 * @param {Function} props.onSelectSeries Callback invoked with newly selected series ID.
 * @return {JSX.Element} Rendered selector UI.
 */
export default function SeriesSelector( { currentSeriesId = 0, onSelectSeries } ) {
	const seriesList = useSelect( ( select ) => {
		return select( STORE_NAME ).getSeries() || [];
	}, [] );

	const { createSeries } = useDispatch( STORE_NAME );

	// Inline creation states
	const [ isCreating, setIsCreating ] = useState( false );
	const [ newSeriesName, setNewSeriesName ] = useState( '' );
	const [ isSubmitting, setIsSubmitting ] = useState( false );
	const [ errorMessage, setErrorMessage ] = useState( '' );

	// Options for SelectControl
	const options = [
		{ label: __( '— Select a Series —', 'series-craft' ), value: '' },
		...seriesList.map( ( item ) => ( {
			label: `${ item.name } (${ item.count || 0 })`,
			value: String( item.id ),
		} ) ),
	];

	// Handle inline series creation
	const handleCreateSeries = async ( e ) => {
		if ( e && e.preventDefault ) {
			e.preventDefault();
		}

		const trimmedName = newSeriesName.trim();
		if ( ! trimmedName ) {
			return;
		}

		setIsSubmitting( true );
		setErrorMessage( '' );

		try {
			const created = await createSeries( trimmedName );
			setIsSubmitting( false );
			setNewSeriesName( '' );
			setIsCreating( false );

			if ( created && ( created.id || created.term_id ) ) {
				const createdId = Number( created.id || created.term_id );
				onSelectSeries( createdId );
			}
		} catch ( error ) {
			setIsSubmitting( false );
			setErrorMessage( error?.message || __( 'Failed to create series.', 'series-craft' ) );
		}
	};

	return (
		<div className="seriescraft-series-selector" data-testid="seriescraft-series-selector">
			<SelectControl
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				label={ __( 'Assign Series', 'series-craft' ) }
				value={ currentSeriesId ? String( currentSeriesId ) : '' }
				options={ options }
				onChange={ ( value ) => {
					onSelectSeries( value ? Number( value ) : 0 );
				} }
				help={ __( 'Assign this post to a chronological series.', 'series-craft' ) }
			/>

			{ ! isCreating ? (
				<div className="seriescraft-create-toggle-wrap">
					<Button
						variant="link"
						size="small"
						onClick={ () => {
							setIsCreating( true );
							setErrorMessage( '' );
						} }
						className="seriescraft-add-series-toggle"
					>
						{ __( '+ Add New Series', 'series-craft' ) }
					</Button>
				</div>
			) : (
				<form
					className="seriescraft-inline-create-form"
					onSubmit={ handleCreateSeries }
					data-testid="seriescraft-inline-create-form"
				>
					<div className="seriescraft-inline-create-title">
						{ __( 'Create New Series', 'series-craft' ) }
					</div>

					{ errorMessage && (
						<Notice
							status="error"
							isDismissible={ false }
							className="seriescraft-create-error"
						>
							{ errorMessage }
						</Notice>
					) }

					<div className="seriescraft-inline-input-group">
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							value={ newSeriesName }
							onChange={ setNewSeriesName }
							placeholder={ __( 'Series name...', 'series-craft' ) }
							disabled={ isSubmitting }
							className="seriescraft-inline-input"
						/>
						<Button
							variant="secondary"
							isBusy={ isSubmitting }
							disabled={ ! newSeriesName.trim() || isSubmitting }
							onClick={ handleCreateSeries }
							className="seriescraft-inline-submit-btn"
						>

							{ __( 'Add', 'series-craft' ) }
						</Button>
					</div>

					<div className="seriescraft-inline-actions">
						<Button
							variant="link"
							size="small"
							disabled={ isSubmitting }
							onClick={ () => {
								setIsCreating( false );
								setNewSeriesName( '' );
								setErrorMessage( '' );
							} }
							className="seriescraft-cancel-create-btn"
						>
							{ __( 'Cancel', 'series-craft' ) }
						</Button>
					</div>
				</form>
			) }
		</div>
	);
}
