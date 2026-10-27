/**
 * SeriesSelector Component for Gutenberg editor.
 */

import { SelectControl } from '@wordpress/components';

/**
 * Dropdown selector for assigning an active series to a post.
 *
 * @param {Object}   props                  Component props.
 * @param {Array}    props.seriesList       Array of series objects { id, name }.
 * @param {number}   props.selectedSeriesId Currently selected series ID.
 * @param {Function} props.onChange         Callback when selection updates.
 * @param {boolean}  props.isDisabled       Flag to disable interaction.
 * @return {JSX.Element} Rendered select control.
 */
export default function SeriesSelector( {
	seriesList = [],
	selectedSeriesId = null,
	onChange,
	isDisabled = false,
} ) {
	const options = [
		{ label: '— Select a Series —', value: '' },
		...seriesList.map( ( series ) => ( {
			label: series.name,
			value: String( series.id ),
		} ) ),
	];

	const handleChange = ( newValue ) => {
		if ( ! onChange ) {
			return;
		}

		if ( newValue === '' || newValue === undefined ) {
			onChange( null );
			return;
		}

		onChange( Number( newValue ) );
	};

	return (
		<SelectControl
			label="Assign to Series"
			value={ selectedSeriesId ? String( selectedSeriesId ) : '' }
			options={ options }
			onChange={ handleChange }
			disabled={ isDisabled }
			className="seriescraft-selector"
			__next40pxDefaultSize={ true }
			__nextHasNoMarginBottom={ true }
		/>
	);
}