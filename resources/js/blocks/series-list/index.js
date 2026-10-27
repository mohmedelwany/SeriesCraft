/**
 * Block registration entry point for 'seriescraft/series-list'.
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import save from './save';

const EditWrapper = ( props ) => {
	const Edit = require( './edit' ).default;
	return <Edit { ...props } />;
};

/**
 * Registers the seriescraft/series-list block type.
 */
export function registerSeriesListBlock() {
	if ( typeof registerBlockType === 'function' ) {
		return registerBlockType( metadata.name, {
			...metadata,
			edit: EditWrapper,
			save,
		} );
	}
}

registerSeriesListBlock();
