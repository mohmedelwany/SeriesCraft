/**
 * UserSelector Component for Series List Gutenberg Block.
 */

import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * User Selector dropdown control.
 *
 * @param {Object} props Component props.
 * @param {string} props.userId Selected user ID.
 * @param {Array} props.users Available users list.
 * @param {Function} props.onChange Selection callback.
 * @return {JSX.Element} Rendered control.
 */
export default function UserSelector( { userId = '', users = [], onChange } ) {
	const userOptions = [
		{ label: __( 'Select a user', 'series-craft' ), value: '' },
		...users.map( ( user ) => ( {
			label: user.name || user.slug || `User #${ user.id }`,
			value: String( user.id ),
		} ) ),
	];

	return (
		<SelectControl
			label={ __( 'Select User', 'series-craft' ) }
			value={ userId }
			options={ userOptions }
			onChange={ onChange }
			__next40pxDefaultSize={ true }
			__nextHasNoMarginBottom={ true }
		/>
	);
}
