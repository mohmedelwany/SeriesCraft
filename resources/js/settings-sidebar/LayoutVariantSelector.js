/**
 * LayoutVariantSelector Component.
 *
 * Renders 4 interactive cards (.sm-layout-card) for Media Grid, Link Grid,
 * Media List, and Link List matching legacy series-manager markup and selectors.
 *
 * @package SeriesCraft\SettingsSidebar
 */

import React from 'react';
import { LAYOUT_OPTIONS } from './constants';

/**
 * Pure inline SVG vector icon for media/image wireframe previews.
 *
 * @param {Object} props Component props.
 * @param {number} props.size Icon pixel size.
 * @return {JSX.Element} SVG element.
 */
export const MediaIcon = ( { size = 14 } ) => (
	<svg
		width={ size }
		height={ size }
		viewBox="0 0 24 24"
		fill="currentColor"
		aria-hidden="true"
		className="sm-preview__svg sm-preview__svg--media"
	>
		<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
	</svg>
);

/**
 * Pure inline SVG vector icon for link wireframe previews.
 *
 * @param {Object} props Component props.
 * @param {number} props.size Icon pixel size.
 * @return {JSX.Element} SVG element.
 */
export const LinkIcon = ( { size = 14 } ) => (
	<svg
		width={ size }
		height={ size }
		viewBox="0 0 24 24"
		fill="currentColor"
		aria-hidden="true"
		className="sm-preview__svg sm-preview__svg--link"
	>
		<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
	</svg>
);

/**
 * Miniature wireframe preview representation for layout variants.
 *
 * @param {Object} props Component props.
 * @param {string} props.type Layout variant type.
 * @return {JSX.Element|null} Rendered preview.
 */
export function LayoutPreview( { type } ) {
	switch ( type ) {
		case 'media-grid':
			return (
				<div className="sc-preview sm-preview sc-preview--grid sm-preview--grid" data-testid="preview-media-grid">
					{ Array.from( { length: 6 } ).map( ( _, i ) => (
						<div key={ i } className="sc-preview__cell sm-preview__cell">
							<MediaIcon size={ 14 } />
							<div className="sm-preview-lines">
								<div className="sm-preview__line_1" />
								<div className="sm-preview__line_2" />
							</div>
						</div>
					) ) }
				</div>
			);

		case 'link-grid':
			return (
				<div className="sc-preview sm-preview sc-preview--grid sm-preview--grid" data-testid="preview-link-grid">
					{ Array.from( { length: 6 } ).map( ( _, i ) => (
						<div key={ i } className="sc-preview__cell sm-preview__cell">
							<LinkIcon size={ 14 } />
							<div className="sm-preview-lines">
								<div className="sm-preview__line_1" />
								<div className="sm-preview__line_2" />
							</div>
						</div>
					) ) }
				</div>
			);

		case 'media-list':
			return (
				<div className="sc-preview sm-preview sc-preview--list sm-preview--list" data-testid="preview-media-list">
					{ Array.from( { length: 3 } ).map( ( _, i ) => (
						<div key={ i } className="sc-preview__row sm-preview__row">
							<div className="sc-preview__media-icon sm-preview__media-icon">
								<MediaIcon size={ 12 } />
							</div>
							<div className="sm-preview__lines">
								<div className="sm-preview__line_1" />
								<div className="sm-preview__line_2" />
							</div>
						</div>
					) ) }
				</div>
			);

		case 'link-list':
			return (
				<div className="sc-preview sm-preview sc-preview--list sm-preview--list" data-testid="preview-link-list">
					{ Array.from( { length: 3 } ).map( ( _, i ) => (
						<div key={ i } className="sc-preview__row sm-preview__row">
							<div className="sc-preview__media-icon sm-preview__media-icon">
								<LinkIcon size={ 12 } />
							</div>
							<div className="sm-preview__lines">
								<div className="sm-preview__line_1" />
								<div className="sm-preview__line_2" />
							</div>
						</div>
					) ) }
				</div>
			);

		default:
			return null;
	}
}

/**
 * LayoutVariantSelector component.
 *
 * @param {Object} props Component props.
 * @param {string} props.value Currently selected layout.
 * @param {Function} props.onChange Callback when a variant is clicked.
 * @param {string} [props.label] Optional label.
 * @return {JSX.Element} Rendered layout selector.
 */
export function LayoutVariantSelector( { value = 'link-list', onChange, label } ) {
	return (
		<div className="sc-layout-selector sm-layout-selector" data-testid="sm-layout-selector">
			{ label && <p className="sc-layout-selector__label sm-layout-selector__label">{ label }</p> }

			<div className="sc-layout-selector__grid sm-layout-selector__grid">
				{ LAYOUT_OPTIONS.map( ( option ) => {
					const isSelected = value === option.value;
					return (
						<button
							key={ option.value }
							type="button"
							className={ `sc-layout-card sm-layout-card ${ isSelected ? 'is-selected sc-layout-card--selected' : '' }` }
							aria-pressed={ isSelected }
							data-testid={ `layout-card-${ option.value }` }
							onClick={ () => onChange && onChange( option.value ) }
						>
							<span className="sc-layout-card__indicator sm-layout-card__indicator" />
							<LayoutPreview type={ option.value } />
							<div className="sc-layout-card__content sm-layout-card__content">
								<div className="sc-layout-card__title sm-layout-card__title">{ option.label }</div>
							</div>
						</button>
					);
				} ) }
			</div>
		</div>
	);
}

export default LayoutVariantSelector;
