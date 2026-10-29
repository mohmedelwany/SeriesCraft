/**
 * Block registration entry point for 'seriescraft/series-list'.
 *
 * @package SeriesCraft\Blocks
 */

import { registerBlockType } from '@wordpress/blocks';
import metadata from './block.json';
import Edit from './edit';
import save from './save';

/**
 * Registers the seriescraft/series-list block type.
 *
 * @return {Object|undefined} Registered block configuration.
 */
export function registerSeriesListBlock() {
	if ( typeof registerBlockType === 'function' ) {
		return registerBlockType( metadata.name, {
			...metadata,
			edit: Edit,
			save,
		} );
	}
}

registerSeriesListBlock();
