/**
 * PartOrderList Component for Gutenberg Document Settings Sidebar.
 *
 * Coordinates post ordering for an active series using optimistic drag-and-drop
 * and instant auto-save synchronization via the centralized data store.
 *
 * @package SeriesCraft\Sidebar
 */

import { useState, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { Notice, Spinner } from '@wordpress/components';
import { STORE_NAME } from '../store/constants';
import DraggableItem from './DraggableItem';

/**
 * Reorders an array by moving an item from one index to another.
 *
 * @param {Array} list Source array.
 * @param {number} startIndex From index.
 * @param {number} endIndex To index.
 * @return {Array} Reordered array.
 */
function reorderArray( list, startIndex, endIndex ) {
	const result = Array.from( list );
	const [ removed ] = result.splice( startIndex, 1 );
	result.splice( endIndex, 0, removed );
	return result;
}

/**
 * PartOrderList component.
 *
 * @param {Object} props Component props.
 * @param {number} props.seriesId Active series term ID.
 * @param {number} props.currentPostId Current edited post ID.
 * @return {JSX.Element} Rendered draggable post list container.
 */
export default function PartOrderList( { seriesId, currentPostId, currentPostTitle } ) {
	const numericSeriesId = Number( seriesId );

	// Select state from SeriesCraft centralized store
	const { posts, isSaving, orderNotice } = useSelect(
		( select ) => {
			const store = select( STORE_NAME );
			return {
				posts: store.getSeriesPosts( numericSeriesId ) || [],
				isSaving: Boolean( store.isSavingOrder( numericSeriesId ) ),
				orderNotice: store.getOrderNotice( numericSeriesId ),
			};
		},
		[ numericSeriesId ]
	);

	const { reorderSeriesPosts } = useDispatch( STORE_NAME );

	const computePostList = ( fetchedSeriesPosts ) => {
		const rawPosts = Array.isArray( fetchedSeriesPosts ) ? fetchedSeriesPosts : [];
		if ( currentPostTitle === undefined ) {
			return rawPosts;
		}

		const displayTitle =
			typeof currentPostTitle === 'string' && currentPostTitle.trim() !== ''
				? currentPostTitle
				: '(Untitled)';

		const postItems = rawPosts.map( ( p ) => {
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

		if ( ! isCurrentPostInList && numericSeriesId ) {
			postItems.push( {
				id: currentPostId || 'temp-current-post',
				title: displayTitle,
				order: postItems.length + 1,
				part_order: postItems.length + 1,
				isCurrent: true,
			} );
		}

		return postItems;
	};

	// Local state for interactive drag reordering
	const [ localPosts, setLocalPosts ] = useState( () => computePostList( posts ) );
	const [ draggingIndex, setDraggingIndex ] = useState( null );
	const [ dragOverIndex, setDragOverIndex ] = useState( null );

	// Keep local posts synchronized when store posts or active post title update
	useEffect( () => {
		if ( draggingIndex === null ) {
			const nextList = computePostList( posts );
			setLocalPosts( ( prev ) => {
				if ( prev.length === nextList.length ) {
					const isSame = prev.every( ( p, i ) => {
						const n = nextList[ i ];
						const pTitle = typeof p?.title === 'object' ? p.title.rendered : p?.title;
						const nTitle = typeof n?.title === 'object' ? n.title.rendered : n?.title;
						return (
							p.id === n.id &&
							pTitle === nTitle &&
							Boolean( p.isCurrent ) === Boolean( n.isCurrent )
						);
					} );
					if ( isSame ) {
						return prev;
					}
				}
				return nextList;
			} );
		}
	}, [ posts, currentPostTitle, currentPostId, numericSeriesId, draggingIndex ] );

	// Auto-save reorder handler
	const persistNewOrder = ( reorderedPosts ) => {
		setLocalPosts( reorderedPosts );
		const orderedIds = reorderedPosts
			.map( ( post ) => Number( post.id ) )
			.filter( ( id ) => ! isNaN( id ) && id > 0 );
		if ( orderedIds.length > 0 ) {
			reorderSeriesPosts( numericSeriesId, orderedIds )
				.then( () => {
					if ( typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' ) {
						const eventPayload = {
							seriesId: numericSeriesId,
							termId: numericSeriesId,
							postIds: orderedIds,
							timestamp: Date.now(),
						};
						window.dispatchEvent( new CustomEvent( 'seriescraft:order-updated', { detail: eventPayload } ) );
						window.dispatchEvent( new CustomEvent( 'sc-series-preview-refresh', { detail: eventPayload } ) );
					}
				} )
				.catch( () => {
					// Rollback is managed by the store action
				} );
		}
	};

	// Drag-and-drop handlers
	const handleDragStart = ( event, index ) => {
		if ( isSaving ) {
			event.preventDefault();
			return;
		}
		setDraggingIndex( index );
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData( 'text/plain', String( index ) );
	};

	const handleDragOver = ( event, index ) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
		if ( dragOverIndex !== index ) {
			setDragOverIndex( index );
		}
	};

	const handleDragEnter = ( event, index ) => {
		event.preventDefault();
		setDragOverIndex( index );
	};

	const handleDragLeave = ( event, index ) => {
		if ( dragOverIndex === index ) {
			setDragOverIndex( null );
		}
	};

	const handleDrop = ( event, targetIndex ) => {
		event.preventDefault();
		if ( draggingIndex === null || draggingIndex === targetIndex || isSaving ) {
			setDraggingIndex( null );
			setDragOverIndex( null );
			return;
		}

		const updatedList = reorderArray( localPosts, draggingIndex, targetIndex );
		setDraggingIndex( null );
		setDragOverIndex( null );

		// Immediate optimistic auto-save to REST API
		persistNewOrder( updatedList );
	};

	const handleDragEnd = () => {
		setDraggingIndex( null );
		setDragOverIndex( null );
	};

	return (
		<div className="seriescraft-part-order-container" data-testid="seriescraft-part-order-container">
			<div className="seriescraft-part-order-header">
				<span className="seriescraft-part-order-title">
					{ __( 'Series Part Order', 'series-craft' ) }
				</span>
				{ isSaving && (
					<div className="seriescraft-saving-indicator" aria-live="polite">
						<Spinner />
						<span className="seriescraft-saving-text">
							{ __( 'Auto-saving...', 'series-craft' ) }
						</span>
					</div>
				) }
			</div>

			<p className="seriescraft-part-order-help">
				{ __( 'Drag handles to reorder posts sequentially. Changes auto-save instantly.', 'series-craft' ) }
			</p>

			{ orderNotice && (
				<Notice
					status={ orderNotice.status || 'info' }
					isDismissible={ false }
					className="seriescraft-order-notice"
				>
					{ orderNotice.message }
				</Notice>
			) }

			{ localPosts.length === 0 ? (
				<div className="seriescraft-no-posts-placeholder">
					{ __( 'No posts currently assigned to this series.', 'series-craft' ) }
				</div>
			) : (
				<ul
					className={ `seriescraft-part-order-list ${ isSaving ? 'is-list-saving' : '' }` }
					aria-label={ __( 'Series post order list', 'series-craft' ) }
				>
					{ localPosts.map( ( post, index ) => (
						<DraggableItem
							key={ post.id }
							post={ post }
							index={ index }
							isCurrent={ ( currentPostId && Number( post.id ) === Number( currentPostId ) ) || Boolean( post.isCurrent ) }
							isSaving={ isSaving }
							isDragging={ draggingIndex === index }
							isDragOver={ dragOverIndex === index }
							onDragStart={ handleDragStart }
							onDragOver={ handleDragOver }
							onDragEnter={ handleDragEnter }
							onDragLeave={ handleDragLeave }
							onDrop={ handleDrop }
							onDragEnd={ handleDragEnd }
						/>
					) ) }
				</ul>
			) }
		</div>
	);
}

