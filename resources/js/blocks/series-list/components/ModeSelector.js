/**
 * ModeSelector Component for Series List Gutenberg Block.
 */

import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Series display mode selector.
 *
 * @param {Object} props Component props.
 * @param {string} props.mode Active mode value.
 * @param {Function} props.onChange Mode change callback.
 * @return {JSX.Element} Rendered select control.
 */
export default function ModeSelector( { mode, onChange } ) {
	return (
		<SelectControl
			label={ __( 'Mode', 'series-craft' ) }
			value={ mode }
			options={ [
				{ label: __( 'All Series', 'series-craft' ), value: 'all' },
				{ label: __( 'Top Series', 'series-craft' ), value: 'top' },
				{ label: __( 'User Series', 'series-craft' ), value: 'user' },
				{ label: __( 'Topics / CSCs', 'series-craft' ), value: 'topics' },
			] }
			onChange={ onChange }
			__next40pxDefaultSize={ true }
			__nextHasNoMarginBottom={ true }
		/>
	);
}
