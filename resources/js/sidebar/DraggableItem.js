/**
 * Draggable Item Component for Series Post List.
 *
 * Renders an individual post card within the series sequence, complete with
 * drag handles and current post badge for drag-and-drop reordering.
 *
 * @package SeriesCraft\Sidebar
 */

import { __ } from '@wordpress/i18n';

/**
 * DraggableItem component.
 *
 * @param {Object} props Component props.
 * @param {Object} props.post Post object ({ id, title, part_order, status }).
 * @param {number} props.index 0-based sequence index.
 * @param {boolean} props.isCurrent True if this post is currently open in the editor.
 * @param {boolean} props.isSaving True if an order update is currently in flight.
 * @param {boolean} props.isDragging True if this item is being dragged.
 * @param {boolean} props.isDragOver True if another item is dragged over this slot.
 * @param {Function} props.onDragStart HTML5 drag start handler.
 * @param {Function} props.onDragOver HTML5 drag over handler.
 * @param {Function} props.onDragEnter HTML5 drag enter handler.
 * @param {Function} props.onDragLeave HTML5 drag leave handler.
 * @param {Function} props.onDrop HTML5 drop handler.
 * @param {Function} props.onDragEnd HTML5 drag end handler.
 * @return {JSX.Element} Rendered draggable post list item.
 */
export default function DraggableItem({
	post,
	index,
	isCurrent = false,
	isSaving = false,
	isDragging = false,
	isDragOver = false,
	onDragStart,
	onDragOver,
	onDragEnter,
	onDragLeave,
	onDrop,
	onDragEnd,
}) {
	const rawTitle = typeof post?.title === 'object' ? post?.title?.rendered : post?.title;
	const displayTitle = rawTitle && rawTitle.trim() ? rawTitle : __('(Untitled)', 'series-craft');
	const isDraft = post?.status && post.status !== 'publish';
	const isCurrentPost = Boolean(isCurrent || post?.isCurrent);

	const itemClassNames = [
		'seriescraft-draggable-item',
		isCurrentPost ? 'is-current-post' : '',
		isDragging ? 'is-dragging' : '',
		isDragOver ? 'is-drag-over' : '',
		isSaving ? 'is-disabled' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<li
			className={itemClassNames}
			draggable={!isSaving}
			onDragStart={(e) => onDragStart && onDragStart(e, index)}
			onDragOver={(e) => onDragOver && onDragOver(e, index)}
			onDragEnter={(e) => onDragEnter && onDragEnter(e, index)}
			onDragLeave={(e) => onDragLeave && onDragLeave(e, index)}
			onDrop={(e) => onDrop && onDrop(e, index)}
			onDragEnd={onDragEnd}
			data-testid={`draggable-post-${post.id}`}
			data-index={index}
		>
			<div className="seriescraft-item-left">
				<span
					className="seriescraft-drag-handle"
					title={__('Drag to reorder', 'series-craft')}
					aria-label={__('Drag handle', 'series-craft')}
				>
					<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<circle cx="9" cy="6" r="2" />
						<circle cx="15" cy="6" r="2" />
						<circle cx="9" cy="12" r="2" />
						<circle cx="15" cy="12" r="2" />
						<circle cx="9" cy="18" r="2" />
						<circle cx="15" cy="18" r="2" />
					</svg>
				</span>
				<span className="seriescraft-item-order">{index + 1}</span>
				<div className="sc-order-item__info seriescraft-item-details">
					<span className="sc-order-item__title seriescraft-item-title" title={displayTitle}>
						{displayTitle}
					</span>
					{isCurrentPost && (
						<span className="sc-order-item__badge seriescraft-badge seriescraft-badge-current bg-primary">
							{__('Current Post', 'series-craft')}
						</span>
					)}
					{isDraft && (
						<span className="seriescraft-badge seriescraft-badge-draft">
							{post.status}
						</span>
					)}
				</div>
			</div>
		</li>
	);
}
