/**
 * UserSelector Component for Series List Gutenberg Block.
 *
 * @package SeriesCraft\Blocks
 */

import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * User Selector dropdown control.
 *
 * @param {Object} props Component props.
 * @param {number|string} props.selectedUser Selected user ID.
 * @param {Array} props.users Available users list.
 * @param {Function} props.onChange Selection callback.
 * @return {JSX.Element} Rendered control.
 */
export default function UserSelector( { selectedUser = 0, users = [], onChange } ) {
	const userOptions = [
		{ label: __( '— Select a User —', 'series-craft' ), value: '0' },
		...users.map( ( user ) => ( {
			label: user.name || user.slug || `User #${ user.id }`,
			value: String( user.id ),
		} ) ),
	];

	return (
		<SelectControl
			label={ __( 'SELECT USER', 'series-craft' ) }
			value={ String( selectedUser || 0 ) }
			options={ userOptions }
			onChange={ ( val ) => onChange( Number( val ) || 0 ) }
			__next40pxDefaultSize={ true }
			__nextHasNoMarginBottom={ true }
		/>
	);
}
