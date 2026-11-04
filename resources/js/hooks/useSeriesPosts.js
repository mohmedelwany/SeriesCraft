/**
 * Custom React Hook: useSeriesPosts
 *
 * Coordinates post list retrieval for a series term, caching, and dynamic
 * injection of the active edited post into the series sequence.
 *
 * @package SeriesCraft\Hooks
 */

import { useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { STORE_NAME } from '../store/constants';

/**
 * Injects or updates the currently edited post into the series post list.
 *
 * @param {Array} rawPosts Posts returned from the store.
 * @param {number|string} seriesId Series term ID.
 * @param {number|string} currentPostId Current edited post ID.
 * @param {string} [currentPostTitle] Current edited post title.
 * @return {Array} Computed posts array with active post highlighted.
 */
export function computeDisplayPosts( rawPosts, seriesId, currentPostId, currentPostTitle ) {
	const posts = Array.isArray( rawPosts ) ? rawPosts : [];
	if ( currentPostTitle === undefined ) {
		return posts;
	}

	const displayTitle =
		typeof currentPostTitle === 'string' && currentPostTitle.trim() !== ''
			? currentPostTitle
			: '(Untitled)';

	const postItems = posts.map( ( p ) => {
		const isCurrent = currentPostId && Number( p.id ) === Number( currentPostId );
		if ( isCurrent ) {
			const existingTitle =
				typeof p?.title === 'object' ? p.title?.rendered : p?.title;
			const activeTitle =
				typeof currentPostTitle === 'string' && currentPostTitle.trim() !== ''
					? currentPostTitle
					: existingTitle && existingTitle.trim() !== ''
					? existingTitle
					: '(Untitled)';
			return {
				...p,
				title: activeTitle,
				isCurrent: true,
			};
		}
		return p;
	} );

	const isCurrentPostInList = postItems.some(
		( p ) => ( currentPostId && Number( p.id ) === Number( currentPostId ) ) || p.isCurrent
	);

	if ( ! isCurrentPostInList && seriesId && Number( seriesId ) > 0 ) {
		postItems.push( {
			id: currentPostId || 'temp-current-post',
			title: displayTitle,
			order: postItems.length + 1,
			part_order: postItems.length + 1,
			isCurrent: true,
		} );
	}

	return postItems;
}

/**
 * useSeriesPosts hook.
 *
 * @param {number|string} seriesId Series term ID.
 * @param {Object} [options] Optional options.
 * @param {number|string} [options.currentPostId] Currently edited post ID.
 * @param {string} [options.currentPostTitle] Currently edited post title.
 * @return {Object} Posts data and state indicators.
 */
export function useSeriesPosts( seriesId, options = {} ) {
	const numericSeriesId = Number( seriesId );
	const { currentPostId, currentPostTitle } = options;

	const { rawPosts, isSaving, orderNotice } = useSelect(
		( select ) => {
			if ( ! numericSeriesId ) {
				return { rawPosts: [], isSaving: false, orderNotice: null };
			}
			const store = select( STORE_NAME );
			return {
				rawPosts: store?.getSeriesPosts?.( numericSeriesId ) || [],
				isSaving: Boolean( store?.isSavingOrder?.( numericSeriesId ) ),
				orderNotice: store?.getOrderNotice?.( numericSeriesId ) || null,
			};
		},
		[ numericSeriesId ]
	);

	const posts = useMemo( () => {
		return computeDisplayPosts( rawPosts, numericSeriesId, currentPostId, currentPostTitle );
	}, [ rawPosts, numericSeriesId, currentPostId, currentPostTitle ] );

	return {
		posts,
		rawPosts,
		isSaving,
		orderNotice,
	};
}

export default useSeriesPosts;
