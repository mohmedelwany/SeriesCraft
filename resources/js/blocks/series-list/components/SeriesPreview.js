/**
 * SeriesPreview Component for Gutenberg Block & Inspector Preview.
 *
 * Matches the legacy visual presentation exactly, displaying series name and count badge.
 */

import { Spinner } from '@wordpress/components';
import { __, sprintf, _n } from '@wordpress/i18n';

/**
 * Series Preview listing.
 *
 * @param {Object}  props                        Component props.
 * @param {string}  props.mode                   Display mode (all, top, user, topics).
 * @param {Array}   props.seriesTerms            Array of fetched series term objects.
 * @param {boolean} props.isResolvingSeriesTerms Whether series terms are loading.
 * @return {JSX.Element} Rendered preview component.
 */
export default function SeriesPreview( {
	mode = 'all',
	seriesTerms = [],
	isResolvingSeriesTerms = false,
} ) {
	const count = Array.isArray( seriesTerms ) ? seriesTerms.length : 0;

	return (
		<div className="sc-series-preview sm-series-preview bg-white border border-gray-100 rounded-lg shadow-sm" data-testid="series-preview-root">
			{ /* Header */ }
			<div className="sc-series-preview__header flex items-center justify-between px-3 py-3 border-b border-gray-50">
				<label className="sc-series-preview__label text-[10px] font-bold text-blue-600 uppercase tracking-wider">
					{ __( 'Series', 'series-craft' ) }
				</label>
				<p className="sc-series-preview__count-badge text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium" data-testid="series-count-badge">
					{ mode === 'top'
						? sprintf(
							_n(
								'Top %d series',
								'Top %d series',
								count,
								'series-craft'
							),
							count
						)
						: sprintf(
							_n(
								'%d series',
								'%d series',
								count,
								'series-craft'
							),
							count
						) }
				</p>
			</div>

			<div className="sc-series-preview__body space-y-3">
				{ /* Mode Specific Notices */ }
				{ ( mode === 'user' || mode === 'topics' ) && (
					<div className="sc-series-preview__notice p-3 rounded-lg bg-surface-container text-body-sm text-on-surface-variant border border-outline-variant">
						<p>
							{ mode === 'user'
								? __(
									'Preview shows sample series. Actual results depend on selected user.',
									'series-craft'
								)
								: __(
									'Topics taxonomy not available for preview.',
									'series-craft'
								) }
						</p>
					</div>
				) }

				{ /* Loading State */ }
				{ isResolvingSeriesTerms ? (
					<div className="sc-series-preview__loading flex items-center gap-2 p-3 rounded-lg bg-surface-container" data-testid="series-preview-loading">
						<Spinner />
						<span className="text-body-sm text-on-surface-variant">
							{ __( 'Loading series...', 'series-craft' ) }
						</span>
					</div>
				) : ( ! seriesTerms || seriesTerms.length === 0 ) ? (
					<div className="sc-series-preview__empty p-3 rounded-lg bg-surface-container text-body-sm text-on-surface-variant" data-testid="series-preview-empty">
						{ mode === 'topics'
							? __( 'Topics taxonomy not available.', 'series-craft' )
							: __( 'No series found.', 'series-craft' ) }
					</div>
				) : (
					<div className="sc-series-preview__content space-y-3">
						<div className="sc-series-preview__list series-scrollbar divide-y divide-gray-50 max-h-64 overflow-y-auto pr-1" data-testid="series-preview-list">
							{ seriesTerms.map( ( term ) => (
								<div
									key={ term.id }
									className="sc-series-preview__row flex items-center px-3 py-2 text-sm"
									data-testid={ `series-preview-term-${ term.id }` }
								>
									<span className="sc-series-preview__item-name flex-1 text-gray-700 font-medium">
										{ term.name }
									</span>
									<span className="sc-series-preview__item-count text-xs px-2 py-1 text-gray-500">
										({ term.count ?? 0 })
									</span>
								</div>
							) ) }
						</div>
					</div>
				) }
			</div>
		</div>
	);
}
