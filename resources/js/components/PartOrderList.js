/**
 * PartOrderList Component for displaying and reordering parts in a series.
 */

import { useState, useEffect } from '@wordpress/element';
import { useSelect } from '@wordpress/data';

/**
 * Helper to find index of an ID in the order list (supporting numeric or string IDs).
 *
 * @param {number|string} id       Post ID.
 * @param {Array}         orderIds Ordered IDs array.
 * @return {number} Index in order list or -1 if not found.
 */
function getIndexInOrder( id, orderIds ) {
	if ( ! Array.isArray( orderIds ) || orderIds.length === 0 ) {
		return -1;
	}
	const directIdx = orderIds.indexOf( id );
	if ( directIdx !== -1 ) {
		return directIdx;
	}
	return orderIds.findIndex( ( orderId ) => String( orderId ) === String( id ) );
}

/**
 * Renders the sequence of posts within the assigned series.
 *
 * @param {Object}   props                  Component props.
 * @param {number}   props.seriesId         Active series ID.
 * @param {number}   [props.currentPostId]  Current post ID being edited.
 * @param {string}   [props.currentPostTitle] Real-time title for the current post.
 * @param {Array}    [props.orderedPostIds] Explicitly ordered post IDs from store.
 * @param {Function} [props.moveItem]       Callback to reorder items in store.
 * @param {Function} [props.onOrderChange]  Callback when post order changes.
 * @return {JSX.Element|null} Rendered part order list.
 */
export default function PartOrderList( {
	seriesId,
	currentPostId = null,
	currentPostTitle = null,
	orderedPostIds = [],
	moveItem,
	onOrderChange,
} ) {
	const [ draggedIndex, setDraggedIndex ] = useState( null );
	const [ localOrderedIds, setLocalOrderedIds ] = useState( [] );

	// Reset local ordering when switching active series
	useEffect( () => {
		setLocalOrderedIds( [] );
	}, [ seriesId ] );

	const selectResult = useSelect(
		( select ) => {
			if ( ! seriesId ) {
				return { seriesPosts: [], currentEditedTitle: undefined, currentEditorPostId: null };
			}
			const core = select( 'core' );
			const editor = select( 'core/editor' );
			return {
				seriesPosts: core?.getEntityRecords?.( 'postType', 'post', {
					series: seriesId,
					per_page: -1,
					_fields: 'id,title,status',
					status: 'publish,draft,pending',
				} ) || [],
				currentEditedTitle: editor?.getEditedPostAttribute?.( 'title' ),
				currentEditorPostId: editor?.getCurrentPostId?.() ?? null,
			};
		},
		[ seriesId ]
	) || {};

	if ( ! seriesId ) {
		return null;
	}

	const {
		seriesPosts = [],
		currentEditedTitle = undefined,
		currentEditorPostId = null,
	} = selectResult;

	const effectiveCurrentId = currentPostId !== null && currentPostId !== undefined
		? currentPostId
		: currentEditorPostId;

	// Resolve the real-time title for the current post:
	// Priority: currentPostTitle prop -> currentEditedTitle from store
	const hasPropTitle = currentPostTitle !== null && currentPostTitle !== undefined;
	const hasStoreTitle = typeof currentEditedTitle === 'string';

	const draftFallback = '(Draft)';
	let activeCurrentTitle = null;

	if ( hasPropTitle ) {
		activeCurrentTitle = currentPostTitle.trim().length > 0 ? currentPostTitle.trim() : draftFallback;
	} else if ( hasStoreTitle ) {
		activeCurrentTitle = currentEditedTitle.trim().length > 0 ? currentEditedTitle.trim() : draftFallback;
	}

	// Build the complete list of posts, dynamically appending the current post if assigned and not present
	let combinedPosts = [ ...seriesPosts ];
	const existsInSeries = effectiveCurrentId && combinedPosts.some( ( p ) => p.id === effectiveCurrentId );

	if ( effectiveCurrentId && ! existsInSeries ) {
		combinedPosts.push( {
			id: effectiveCurrentId,
			title: activeCurrentTitle || draftFallback,
			isCurrent: true,
		} );
	} else if ( effectiveCurrentId && existsInSeries ) {
		combinedPosts = combinedPosts.map( ( p ) => {
			if ( p.id === effectiveCurrentId ) {
				const existingTitle = typeof p.title === 'object' ? p.title?.rendered : p.title;
				const resolved = activeCurrentTitle !== null ? activeCurrentTitle : ( existingTitle || draftFallback );
				return {
					...p,
					title: resolved,
					isCurrent: true,
				};
			}
			return p;
		} );
	}

	// Active ordered IDs prioritize local user interactions, falling back to orderedPostIds prop
	const activeOrderIds = localOrderedIds.length > 0 ? localOrderedIds : orderedPostIds;

	// Sort posts according to activeOrderIds if available, preserving combinedPosts natural order otherwise
	const sortedPosts = [ ...combinedPosts ].sort( ( a, b ) => {
		const indexA = getIndexInOrder( a.id, activeOrderIds );
		const indexB = getIndexInOrder( b.id, activeOrderIds );
		if ( indexA !== -1 && indexB !== -1 ) {
			return indexA - indexB;
		}
		if ( indexA !== -1 ) {
			return -1;
		}
		if ( indexB !== -1 ) {
			return 1;
		}
		const idxA = combinedPosts.findIndex( ( p ) => p.id === a.id );
		const idxB = combinedPosts.findIndex( ( p ) => p.id === b.id );
		return idxA - idxB;
	} );

	/**
	 * Reorders items in local state and notifies external callbacks.
	 *
	 * @param {number} fromIndex Source position in sortedPosts.
	 * @param {number} toIndex   Target position in sortedPosts.
	 */
	const handleMove = ( fromIndex, toIndex ) => {
		if (
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= sortedPosts.length ||
			toIndex >= sortedPosts.length ||
			fromIndex === toIndex
		) {
			return;
		}

		const updatedPosts = [ ...sortedPosts ];
		const [ movedItem ] = updatedPosts.splice( fromIndex, 1 );
		updatedPosts.splice( toIndex, 0, movedItem );

		const newOrderIds = updatedPosts.map( ( p ) => p.id );
		setLocalOrderedIds( newOrderIds );

		if ( typeof moveItem === 'function' ) {
			moveItem( fromIndex, toIndex );
		}

		if ( typeof onOrderChange === 'function' ) {
			onOrderChange( newOrderIds );
		}
	};

	// Drag and drop event handlers
	const handleDragStart = ( e, index ) => {
		setDraggedIndex( index );
		if ( e.dataTransfer ) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData( 'text/plain', String( index ) );
		}
	};

	const handleDragOver = ( e ) => {
		e.preventDefault();
		if ( e.dataTransfer ) {
			e.dataTransfer.dropEffect = 'move';
		}
	};

	const handleDrop = ( e, targetIndex ) => {
		e.preventDefault();
		e.stopPropagation();

		let sourceIndex = draggedIndex;
		if ( sourceIndex === null || sourceIndex === undefined ) {
			const data = e.dataTransfer ? e.dataTransfer.getData( 'text/plain' ) : null;
			if ( data !== null && data !== '' ) {
				const parsed = parseInt( data, 10 );
				if ( ! isNaN( parsed ) ) {
					sourceIndex = parsed;
				}
			}
		}

		if (
			sourceIndex !== null &&
			sourceIndex !== undefined &&
			sourceIndex !== targetIndex &&
			sourceIndex >= 0 &&
			sourceIndex < sortedPosts.length &&
			targetIndex >= 0 &&
			targetIndex < sortedPosts.length
		) {
			handleMove( sourceIndex, targetIndex );
		}

		setDraggedIndex( null );
	};

	const handleDragEnd = () => {
		setDraggedIndex( null );
	};

	return (
		<div className="sc-part-order-section" data-testid="part-order-section">
			<div className="sc-part-order-header">
				<span className="sc-part-order-title">Part Order</span>
				{ sortedPosts.length > 0 && (
					<span className="sc-part-order-count">
						{ sortedPosts.length } { sortedPosts.length === 1 ? 'part' : 'parts' }
					</span>
				) }
			</div>

			{ sortedPosts.length === 0 ? (
				<p className="sc-part-order-empty">No posts in this series yet.</p>
			) : (
				<ul
					className="sc-draggable-list"
					data-testid="part-order-list"
					onDragOver={ handleDragOver }
				>
					{ sortedPosts.map( ( post, index ) => {
						const isCurrent = post.id === effectiveCurrentId;
						const rawTitle = typeof post.title === 'object'
							? post.title?.rendered
							: post.title;
						const title = ( typeof rawTitle === 'string' && rawTitle.trim() )
							? rawTitle
							: ( isCurrent ? draftFallback : 'Untitled' );

						return (
							<li
								key={ post.id }
								className={ `sc-draggable-card${ isCurrent ? ' is-current' : '' }${ draggedIndex === index ? ' is-dragging' : '' }` }
								data-testid={ `part-item-${ post.id }` }
								draggable={ true }
								onDragStart={ ( e ) => handleDragStart( e, index ) }
								onDragOver={ handleDragOver }
								onDrop={ ( e ) => handleDrop( e, index ) }
								onDragEnd={ handleDragEnd }
							>
								<span className="sc-draggable-card__handle dashicons dashicons-menu" aria-hidden="true" />
								<span className="sc-draggable-card__badge">Part { index + 1 }</span>
								<span className="sc-draggable-card__title" title={ title }>
									{ title }
								</span>
								{ isCurrent && (
									<span className="sc-draggable-card__tag">Current</span>
								) }
								<div className="sc-draggable-card__actions">
									<button
										type="button"
										className="sc-move-btn"
										aria-label="Move part up"
										disabled={ index === 0 }
										onClick={ ( e ) => {
											e.stopPropagation();
											handleMove( index, index - 1 );
										} }
									>
										<span className="dashicons dashicons-arrow-up-alt2" aria-hidden="true" />
									</button>
									<button
										type="button"
										className="sc-move-btn"
										aria-label="Move part down"
										disabled={ index === sortedPosts.length - 1 }
										onClick={ ( e ) => {
											e.stopPropagation();
											handleMove( index, index + 1 );
										} }
									>
										<span className="dashicons dashicons-arrow-down-alt2" aria-hidden="true" />
									</button>
								</div>
							</li>
						);
					} ) }
				</ul>
			) }
		</div>
	);
}
