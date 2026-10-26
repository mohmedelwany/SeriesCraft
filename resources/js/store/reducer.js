/**
 * SeriesCraft Store Reducer.
 *
 * Implements pure, immutable state transitions for the series data store.
 *
 * @package SeriesCraft\Store
 */

import { ACTION_TYPES } from './constants';

/**
 * Default initial store state.
 */
export const DEFAULT_STATE = {
	series: [],
	postsBySeries: {},
	metaBySeries: {},
	isSaving: {},
	notices: {},
};

/**
 * Reducer function for 'series-craft/store'.
 *
 * @param {Object} state Current store state.
 * @param {Object} action Dispatched action object.
 * @return {Object} Next store state.
 */
export default function reducer( state = DEFAULT_STATE, action ) {
	if ( ! action || ! action.type ) {
		return state;
	}

	switch ( action.type ) {
		case ACTION_TYPES.SET_SERIES: {
			return {
				...state,
				series: Array.isArray( action.items ) ? [ ...action.items ] : [],
			};
		}

		case ACTION_TYPES.RECEIVE_SERIES_POSTS: {
			const { seriesId, posts } = action;
			if ( ! seriesId ) {
				return state;
			}

			return {
				...state,
				postsBySeries: {
					...state.postsBySeries,
					[ seriesId ]: Array.isArray( posts ) ? [ ...posts ] : [],
				},
			};
		}

		case ACTION_TYPES.UPDATE_POST_ORDER: {
			const { seriesId, postIds } = action;
			if ( ! seriesId ) {
				return state;
			}

			const currentPosts = state.postsBySeries[ seriesId ] || [];
			let nextPosts;

			if ( ! Array.isArray( postIds ) ) {
				nextPosts = currentPosts;
			} else if ( postIds.length > 0 && typeof postIds[ 0 ] === 'object' && postIds[ 0 ] !== null ) {
				// Already an array of post objects: re-index part_order
				nextPosts = postIds.map( ( post, index ) => ( {
					...post,
					part_order: index + 1,
				} ) );
			} else if ( currentPosts.length > 0 && typeof currentPosts[ 0 ] === 'object' && currentPosts[ 0 ] !== null ) {
				// We have existing post objects: reorder them based on postIds sequence
				const postMap = new Map();
				currentPosts.forEach( ( post ) => {
					postMap.set( Number( post.id ), post );
				} );

				const reordered = [];
				postIds.forEach( ( id ) => {
					const numericId = Number( id );
					if ( postMap.has( numericId ) ) {
						reordered.push( postMap.get( numericId ) );
						postMap.delete( numericId );
					}
				} );

				// Append any leftover posts not explicitly present in postIds
				postMap.forEach( ( post ) => {
					reordered.push( post );
				} );

				nextPosts = reordered.map( ( post, index ) => ( {
					...post,
					part_order: index + 1,
				} ) );
			} else {
				// Simple array of IDs
				nextPosts = [ ...postIds ];
			}

			return {
				...state,
				postsBySeries: {
					...state.postsBySeries,
					[ seriesId ]: nextPosts,
				},
			};
		}

		case ACTION_TYPES.SET_SAVING_ORDER: {
			const { seriesId, isSaving } = action;
			if ( ! seriesId ) {
				return state;
			}

			return {
				...state,
				isSaving: {
					...state.isSaving,
					[ seriesId ]: Boolean( isSaving ),
				},
			};
		}

		case ACTION_TYPES.SET_SERIES_META: {
			const { seriesId, metaData } = action;
			if ( ! seriesId ) {
				return state;
			}

			const currentMeta = state.metaBySeries[ seriesId ] || {};

			return {
				...state,
				metaBySeries: {
					...state.metaBySeries,
					[ seriesId ]: {
						...currentMeta,
						...( metaData || {} ),
					},
				},
			};
		}

		case ACTION_TYPES.SET_NOTICE: {
			const { seriesId, status, message } = action;
			if ( ! seriesId ) {
				return state;
			}

			return {
				...state,
				notices: {
					...state.notices,
					[ seriesId ]: {
						status: status || 'info',
						message: message || '',
					},
				},
			};
		}

		case ACTION_TYPES.CLEAR_NOTICE: {
			const { seriesId } = action;
			if ( ! seriesId || ! ( seriesId in state.notices ) ) {
				return state;
			}

			const nextNotices = { ...state.notices };
			delete nextNotices[ seriesId ];

			return {
				...state,
				notices: nextNotices,
			};
		}

		default:
			return state;
	}
}
