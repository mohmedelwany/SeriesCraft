/**
 * LayoutPreview Component.
 *
 * Renders miniature wireframe previews for layout variants (Media Grid, Link Grid, Media List, Link List).
 */

import { Icon } from '@wordpress/components';
import { media, link } from '@wordpress/icons';

/**
 * Layout Preview miniature wireframes.
 *
 * @param {Object} props Component props.
 * @param {string} props.type Layout variant type.
 * @return {JSX.Element|null} Rendered preview.
 */
export default function LayoutPreview( { type } ) {
	switch ( type ) {
		case 'media-grid':
			return (
				<div className="sc-preview sm-preview sc-preview--grid sm-preview--grid">
					{ Array.from( { length: 6 } ).map( ( _, i ) => (
						<div key={ i } className="sc-preview__cell sm-preview__cell">
							<Icon icon={ media } />
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
				<div className="sc-preview sm-preview sc-preview--grid sm-preview--grid">
					{ Array.from( { length: 6 } ).map( ( _, i ) => (
						<div key={ i } className="sc-preview__cell sm-preview__cell">
							<Icon icon={ link } />
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
				<div className="sc-preview sm-preview sc-preview--list sm-preview--list">
					{ Array.from( { length: 3 } ).map( ( _, i ) => (
						<div key={ i } className="sc-preview__row sm-preview__row">
							<div className="sc-preview__media-icon sm-preview__media-icon">
								<Icon icon={ media } />
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
				<div className="sc-preview sm-preview sc-preview--list sm-preview--list">
					{ Array.from( { length: 3 } ).map( ( _, i ) => (
						<div key={ i } className="sc-preview__row sm-preview__row">
							<div className="sc-preview__media-icon sm-preview__media-icon">
								<Icon icon={ link } />
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
