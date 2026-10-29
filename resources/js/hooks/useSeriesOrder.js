/**
 * Custom React Hook: useSeriesOrder
 *
 * Coordinates post reordering persistence, saving indicators, and status notices.
 *
 * @package SeriesCraft\Hooks
 */

import { useSelect, useDispatch } from '@wordpress/data';
import { STORE_NAME } from '../store/constants';

/**
 * useSeriesOrder hook.
 *
 * @param {number|string} seriesId Series term ID.
 * @return {Object} Reorder action handler and state flags.
 */
export function useSeriesOrder( seriesId ) {
	const numericSeriesId = Number( seriesId );

	const { isSaving, orderNotice } = useSelect(
		( select ) => {
			if ( ! numericSeriesId ) {
				return { isSaving: false, orderNotice: null };
			}
			const store = select( STORE_NAME );
			return {
				isSaving: Boolean( store?.isSavingOrder?.( numericSeriesId ) ),
				orderNotice: store?.getOrderNotice?.( numericSeriesId ) || null,
			};
		},
		[ numericSeriesId ]
	);

	const { reorderSeriesPosts, clearNotice: clearStoreNotice } = useDispatch( STORE_NAME ) || {};

	const reorderPosts = async ( orderedPostIds ) => {
		if ( ! numericSeriesId || typeof reorderSeriesPosts !== 'function' ) {
			return;
		}

		const postIds = Array.isArray( orderedPostIds )
			? orderedPostIds
					.map( ( item ) => ( typeof item === 'object' && item !== null ? Number( item.id ) : Number( item ) ) )
					.filter( ( id ) => ! isNaN( id ) && id > 0 )
			: [];

		if ( postIds.length === 0 ) {
			return;
		}

		return await reorderSeriesPosts( numericSeriesId, postIds );
	};

	const clearNotice = () => {
		if ( numericSeriesId && typeof clearStoreNotice === 'function' ) {
			clearStoreNotice( numericSeriesId );
		}
	};

	return {
		reorderPosts,
		isSaving,
		orderNotice,
		clearNotice,
	};
}

export default useSeriesOrder;
