/**
 * SeriesCraft Custom Hook for managing sequential post ordering.
 */

import { useCallback } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { STORE_NAME } from '../store/constants';

/**
 * Custom React hook to reorder and persist series posts.
 *
 * @param {number|null} seriesId Active series term ID.
 * @return {Object} Ordered post IDs and manipulation helpers.
 */
export default function useSeriesOrder( seriesId ) {
	const { orderedPostIds, isSaving } = useSelect(
		( select ) => {
			const store = select( STORE_NAME );
			return {
				orderedPostIds: store.getOrderedPostIds(),
				isSaving: store.isSavingSeries(),
			};
		},
		[ seriesId ]
	);

	const {
		setPostsOrder: dispatchSetPostsOrder,
		savePostsOrder: dispatchSavePostsOrder,
	} = useDispatch( STORE_NAME );

	/**
	 * Moves an item from fromIndex to toIndex within the array.
	 */
	const moveItem = useCallback(
		( fromIndex, toIndex ) => {
			if (
				fromIndex < 0 ||
				toIndex < 0 ||
				fromIndex >= orderedPostIds.length ||
				toIndex >= orderedPostIds.length
			) {
				return;
			}

			const updated = [ ...orderedPostIds ];
			const [ movedItem ] = updated.splice( fromIndex, 1 );
			updated.splice( toIndex, 0, movedItem );

			dispatchSetPostsOrder( updated );
		},
		[ orderedPostIds, dispatchSetPostsOrder ]
	);

	/**
	 * Persists the post order to the database via REST API.
	 */
	const saveOrder = useCallback(
		async ( postIds = orderedPostIds ) => {
			if ( ! seriesId ) {
				return;
			}
			return await dispatchSavePostsOrder( seriesId, postIds );
		},
		[ seriesId, orderedPostIds, dispatchSavePostsOrder ]
	);

	return {
		orderedPostIds,
		isSaving,
		moveItem,
		saveOrder,
	};
}