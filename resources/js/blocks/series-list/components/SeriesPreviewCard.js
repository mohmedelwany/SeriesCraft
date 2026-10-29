/**
 * SeriesPreviewCard Component for Series List Inspector Controls.
 *
 * Displays series count pill badge, callout notice, loading state,
 * and dynamically queried series items via core getEntityRecords.
 *
 * @package SeriesCraft\Blocks
 */

import { useSelect } from '@wordpress/data';
import { Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Series Preview Card component for InspectorControls.
 *
 * @param {Object} props Component props.
 * @param {string} [props.mode='all'] Series display mode.
 * @param {number} [props.limit=5] Maximum series limit in 'top' mode.
 * @param {number} [props.selectedUser=0] Author ID filter in 'user' mode.
 * @param {string} [props.selectedTopic=''] Topic slug filter in 'topics' mode.
 * @param {Array}  [props.series] Optional explicit series list (used in tests/overrides).
 * @return {JSX.Element} Rendered card UI.
 */
export default function SeriesPreviewCard( {
	mode = 'all',
	limit = 5,
	selectedUser = 0,
	selectedTopic = '',
	series,
} ) {
	const { seriesList, isLoading } = useSelect(
		( select ) => {
			const core = select( 'core' );
			const coreData = select( 'core/data' );

			const query = {
				per_page: mode === 'top' ? ( limit || 5 ) : 10,
				hide_empty: false,
			};

			if ( mode === 'user' && selectedUser ) {
				query.author = selectedUser;
			}

			if ( mode === 'topics' && selectedTopic ) {
				query.topic = selectedTopic;
			}

			const records = core?.getEntityRecords?.( 'taxonomy', 'series', query );
			const isResolving = coreData?.isResolving
				? coreData.isResolving( 'core', 'getEntityRecords', [ 'taxonomy', 'series', query ] )
				: false;

			return {
				seriesList: records || [],
				isLoading: Boolean( isResolving ),
			};
		},
		[ mode, limit, selectedUser, selectedTopic ]
	);

	if ( isLoading ) {
		return (
			<div className="sc-series-preview-loading" data-testid="series-preview-loading">
				<Spinner />
			</div>
		);
	}

	const displayList = Array.isArray( series ) ? series : seriesList;
	const totalCount = displayList.length;

	return (
		<div className="sc-series-preview-card" data-testid="series-preview-card">
			<div className="sc-series-preview-card__header">
				<span className="sc-series-preview-card__title sc-series-preview-card__label">
					{ __( 'SERIESES', 'series-craft' ) }
				</span>
				<span
					className="sc-series-preview-card__badge"
					data-testid="series-count-badge"
				>
					{ totalCount } { __( 'series', 'series-craft' ) }
				</span>
			</div>

			<div className="sc-series-preview-card__notice">
				<p>
					{ __(
						'Preview shows sample series. Actual results depend on selected user.',
						'series-craft'
					) }
				</p>
			</div>

			{ totalCount === 0 ? (
				<div
					className="sc-series-preview-card__empty"
					data-testid="series-preview-empty"
				>
					{ __( 'No series found.', 'series-craft' ) }
				</div>
			) : (
				<ul
					className="sc-series-preview-card__list"
					data-testid="series-preview-card-list"
				>
					{ displayList.slice( 0, mode === 'top' ? ( limit || 5 ) : 5 ).map( ( term ) => (
						<li
							key={ term.id }
							className="sc-series-preview-card__item"
							data-testid={ `series-preview-item-${ term.id }` }
						>
							<span className="sc-series-preview-card__name sc-series-preview-card__item-title">
								{ term.name }
							</span>
						</li>
					) ) }
				</ul>
			) }
		</div>
	);
}
