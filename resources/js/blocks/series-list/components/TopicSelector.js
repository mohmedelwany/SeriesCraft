/**
 * TopicSelector Component for Series List Gutenberg Block.
 *
 * @package SeriesCraft\Blocks
 */

import { SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Topic / Taxonomy Selector dropdown control.
 *
 * @param {Object} props Component props.
 * @param {string} props.selectedTopic Selected topic slug or ID.
 * @param {Array}  [props.topics]      Optional list of topic items.
 * @param {Function} props.onChange    Selection callback.
 * @return {JSX.Element} Rendered control.
 */
export default function TopicSelector( { selectedTopic = '', topics, onChange } ) {
	const availableTopics = useSelect(
		( select ) => {
			if ( Array.isArray( topics ) && topics.length > 0 ) {
				return topics;
			}
			const core = select( 'core' );
			const categories =
				core?.getEntityRecords?.( 'taxonomy', 'category', {
					per_page: -1,
					hide_empty: false,
				} ) || [];
			return categories;
		},
		[ topics ]
	);

	const topicList = Array.isArray( topics ) ? topics : ( availableTopics || [] );

	const topicOptions = [
		{ label: __( '— Select a Topic / Taxonomy —', 'series-craft' ), value: '' },
		...topicList.map( ( topic ) => ( {
			label: topic.name || topic.slug || `Topic #${ topic.id }`,
			value: topic.slug || String( topic.id ),
		} ) ),
	];

	return (
		<SelectControl
			label={ __( 'SELECT TOPIC', 'series-craft' ) }
			value={ selectedTopic || '' }
			options={ topicOptions }
			onChange={ ( val ) => onChange( val || '' ) }
			__next40pxDefaultSize={ true }
			__nextHasNoMarginBottom={ true }
		/>
	);
}
