/**
 * LayoutVariantSelector Component.
 *
 * Renders the 4 interactive layout selection cards for a series.
 */

import { __ } from '@wordpress/i18n';
import LayoutPreview from './LayoutPreview';

const LAYOUT_OPTIONS = [
	{
		value: 'link-list',
		label: __( 'Link List', 'series-craft' ),
	},
	{
		value: 'link-grid',
		label: __( 'Link Grid', 'series-craft' ),
	},
	{
		value: 'media-list',
		label: __( 'Media List', 'series-craft' ),
	},
	{
		value: 'media-grid',
		label: __( 'Media Grid', 'series-craft' ),
	},
];

/**
 * Layout Variant Selector.
 *
 * @param {Object}   props          Component props.
 * @param {string}   props.value    Selected layout variant.
 * @param {Function} props.onChange Selection callback.
 * @param {string}   [props.label]  Optional section label.
 * @return {JSX.Element} Rendered layout selector.
 */
export default function LayoutVariantSelector( {
	value = 'link-list',
	onChange,
	label,
} ) {
	return (
		<div className="sc-layout-selector sm-layout-selector mb-4 mt-4" data-testid="layout-variant-selector">
			{ label && (
				<p className="sc-layout-selector__label sm-layout-selector__label">
					{ label }
				</p>
			) }

			<div className="sc-layout-selector__grid sm-layout-selector__grid">
				{ LAYOUT_OPTIONS.map( ( option ) => {
					const isSelected = value === option.value;
					return (
						<button
							key={ option.value }
							type="button"
							className={ `sc-layout-card sm-layout-card ${ isSelected ? 'is-selected' : '' }` }
							aria-pressed={ isSelected }
							data-layout={ option.value }
							data-testid={ `layout-card-${ option.value }` }
							onClick={ () => onChange && onChange( option.value ) }
						>
							<span className="sc-layout-card__indicator sm-layout-card__indicator" />
							<LayoutPreview type={ option.value } />
							<div className="sc-layout-card__content sm-layout-card__content">
								<div className="sc-layout-card__title sm-layout-card__title">
									{ option.label }
								</div>
							</div>
						</button>
					);
				} ) }
			</div>
		</div>
	);
}
