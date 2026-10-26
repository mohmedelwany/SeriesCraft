/**
 * Edit component for 'seriescraft/series-list' Gutenberg block.
 *
 * Implements native InspectorControls for display mode selection,
 * BlockControls toolbar gear icon for per-series appearance settings modal/popover,
 * and stable ServerSideRender with instant CSS variable updates and smooth loading transition.
 *
 * @package SeriesCraft\Blocks
 */

import { useState, useEffect, useRef } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { InspectorControls, BlockControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	Spinner,
	ToolbarGroup,
	ToolbarButton,
	Modal,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import { __ } from '@wordpress/i18n';
import ModeSelector from './components/ModeSelector';
import UserSelector from './components/UserSelector';
import TopicSelector from './components/TopicSelector';
import SeriesPreviewCard from './components/SeriesPreviewCard';
import { applyStylePreview } from '../../settings-sidebar/constants';
import SeriesSettingsSidebar from '../../settings-sidebar/SeriesSettingsSidebar';

/**
 * Empty response placeholder component.
 *
 * @return {JSX.Element} Empty preview markup.
 */
function EmptyPlaceholder() {
	return (
		<div className="sc-series-block sc-series-empty-preview" data-testid="series-block-empty">
			{__(
				'Series block: add a series in the sidebar to see it rendered here.',
				'series-craft'
			)}
		</div>
	);
}

/**
 * Loading response placeholder component that retains previous markup
 * to prevent layout collapse and flickering during ServerSideRender fetching.
 *
 * @param {Object} props Component props.
 * @param {string} [props.lastMarkup] Previously rendered HTML string.
 * @return {JSX.Element} Loading indicator markup.
 */
function LoadingPlaceholder({ lastMarkup }) {
	if (lastMarkup) {
		return (
			<div
				className="sc-series-block sc-series-loading is-loading"
				data-testid="series-block-loading"
				style={{ position: 'relative', minHeight: '120px' }}
			>
				<div
					className="sc-series-loading-backdrop"
					style={{ opacity: 0.6, transition: 'opacity 0.2s ease-in-out' }}
					dangerouslySetInnerHTML={{ __html: lastMarkup }}
				/>
				<div
					className="sc-series-loading-overlay"
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						background: 'rgba(255, 255, 255, 0.4)',
						zIndex: 5,
					}}
				>
					<Spinner />
				</div>
			</div>
		);
	}

	return (
		<div className="sc-series-block sc-series-loading" data-testid="series-block-loading">
			<Spinner />
			<span>{__('Loading series block...', 'series-craft')}</span>
		</div>
	);
}

/**
 * Recursively find the first image URL in block editor blocks.
 *
 * @param {Array} blocks Array of editor blocks.
 * @return {string} First found image URL or empty string.
 */
export function findFirstImageInBlocks(blocks) {
	if (!Array.isArray(blocks) || blocks.length === 0) {
		return '';
	}

	for (const block of blocks) {
		if (!block) {
			continue;
		}

		if (block.name === 'core/image' || block.name === 'core/cover') {
			if (block.attributes?.url) {
				return block.attributes.url;
			}
		} else if (block.name === 'core/media-text') {
			if (block.attributes?.mediaUrl) {
				return block.attributes.mediaUrl;
			}
		} else if (block.name === 'core/html' && block.attributes?.content) {
			const match = /<img[^>]+src=["']([^"']+)["']/i.exec(block.attributes.content);
			if (match && match[1]) {
				return match[1];
			}
		}

		if (Array.isArray(block.innerBlocks) && block.innerBlocks.length > 0) {
			const nestedUrl = findFirstImageInBlocks(block.innerBlocks);
			if (nestedUrl) {
				return nestedUrl;
			}
		}
	}

	return '';
}

/**
 * Series List Block Edit Component.
 *
 * @param {Object} props Component props.
 * @param {Object} props.attributes Block attributes.
 * @param {Function} props.setAttributes Attribute update setter.
 * @return {JSX.Element} Rendered block edit UI.
 */
export default function Edit({ attributes = {}, setAttributes }) {
	const {
		mode = 'all',
		limit = 5,
		selectedUser = 0,
		selectedTopic = '',
		align = 'wide',
	} = attributes;

	const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
	const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
	const containerRef = useRef(null);
	const lastMarkupRef = useRef('');
	const [lastMarkup, setLastMarkup] = useState('');

	const blockProps = useBlockProps({
		ref: containerRef,
		className: 'sc-series-editor-root wp-block-seriescraft-series-list',
	});

	// Preserve rendered markup to prevent collapsing / blanking during ServerSideRender fetching
	useEffect(() => {
		const node = containerRef.current;
		if (!node) {
			return;
		}

		const observer = new MutationObserver(() => {
			const renderedHtml = node.querySelector(
				'.sc-series-box, .seriescraft-wrapper, .sm-series-layout, .wp-block-seriescraft-series-list'
			);
			if (renderedHtml && renderedHtml.outerHTML) {
				lastMarkupRef.current = renderedHtml.outerHTML;
				setLastMarkup(renderedHtml.outerHTML);
			}
		});

		observer.observe(node, {
			childList: true,
			subtree: true,
		});

		return () => {
			observer.disconnect();
		};
	}, []);

	// Retrieve current post ID, title, series assignment, image, and authors from core stores
	const { currentPostId, currentPostTitle, activeSeriesId, currentPostImage, users } = useSelect((select) => {
		const core = select('core');
		const editor = select('core/editor');
		const blockEditor = select('core/block-editor');

		const postId = editor?.getCurrentPostId?.() || 0;
		const postTitle = editor?.getEditedPostAttribute?.('title') || '';
		const rawSeries = editor?.getEditedPostAttribute?.('series');
		const authors = core?.getUsers?.({ per_page: -1 }) || [];

		const featuredMediaId = editor?.getEditedPostAttribute?.('featured_media');
		let featuredImageUrl = '';
		if (featuredMediaId && Number(featuredMediaId) > 0) {
			const media = core?.getMedia?.(Number(featuredMediaId));
			featuredImageUrl =
				media?.media_details?.sizes?.medium?.source_url ||
				media?.source_url ||
				'';
		}

		const editorBlocks = blockEditor?.getBlocks?.() || [];
		const blockImageUrl = findFirstImageInBlocks(editorBlocks);
		const resolvedImage = featuredImageUrl || blockImageUrl || '';

		let seriesId = 0;
		if (Array.isArray(rawSeries) && rawSeries.length > 0) {
			const first = rawSeries[0];
			const id =
				typeof first === 'object' && first !== null
					? Number(first.id || first.term_id)
					: Number(first);
			seriesId = isNaN(id) ? 0 : id;
		} else if (rawSeries) {
			const num = Number(rawSeries);
			seriesId = !isNaN(num) ? num : 0;
		}

		return {
			currentPostId: postId,
			currentPostTitle: postTitle,
			activeSeriesId: seriesId,
			currentPostImage: resolvedImage,
			users: authors,
		};
	}, []);

	// Listen to preview refresh events triggered from Settings Sidebar / Toolbar Gear Modal
	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		// Instant visual style resolution via CSS custom properties on container without triggering full server re-render
		const handleLivePreview = (event) => {
			const detail = event?.detail || {};
			const termId = detail.termId || activeSeriesId;
			const style = detail.style || detail.layoutStyles?.[termId];
			if (style) {
				applyStylePreview({ termId, style });
			}
			// NOTE: We intentionally do NOT increment previewRefreshKey on style updates.
			// Styling reflects instantly via CSS custom properties with zero unmounting or flicker.
		};

		// Full ServerSideRender refresh ONLY when layout variant, taxonomy, or post ordering changes
		const handleServerRefresh = (event) => {
			const detail = event?.detail || {};
			const termId = detail.termId || activeSeriesId;
			const style = detail.style || detail.layoutStyles?.[termId];
			if (style) {
				applyStylePreview({ termId, style });
			}
			setPreviewRefreshKey((prev) => prev + 1);
		};

		window.addEventListener('sc-series-preview-refresh', handleServerRefresh);
		window.addEventListener('sm-series-preview-refresh', handleServerRefresh);
		window.addEventListener('sm-series-live-preview', handleLivePreview);

		return () => {
			window.removeEventListener('sc-series-preview-refresh', handleServerRefresh);
			window.removeEventListener('sm-series-preview-refresh', handleServerRefresh);
			window.removeEventListener('sm-series-live-preview', handleLivePreview);
		};
	}, [activeSeriesId]);

	const handlePreviewClick = (event) => {
		const link = event.target.closest('a, button.sc-nav__btn');
		if (link) {
			event.preventDefault();
			event.stopPropagation();
		}
	};

	return (
		<>
			{ /* Block Toolbar Gear Icon for per-series appearance settings modal/popover */}
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						icon="admin-generic"
						label={__('Series Settings', 'series-craft')}
						title={__('Series Settings', 'series-craft')}
						onClick={() => setIsSettingsModalOpen(true)}
						isActive={isSettingsModalOpen}
					/>
				</ToolbarGroup>
			</BlockControls>

			{ /* Toolbar Settings Modal */}
			{isSettingsModalOpen && (
				<Modal
					title={__('Series Appearance & Settings', 'series-craft')}
					onRequestClose={() => setIsSettingsModalOpen(false)}
					className="sc-series-settings-modal"
					isDismissible={true}
				>
					<SeriesSettingsSidebar
						initialSeriesId={activeSeriesId}
						inModal={true}
					/>
				</Modal>
			)}

			{ /* Block Inspector Controls Sidebar (strictly for variant / display mode selection) */}
			<InspectorControls>
				<PanelBody
					title={__('Series Display Mode', 'series-craft')}
					initialOpen={true}
				>
					<ModeSelector
						mode={mode}
						onChange={(newMode) => setAttributes({ mode: newMode })}
					/>

					{mode === 'top' && (
						<RangeControl
							label={__('Limit', 'series-craft')}
							value={limit || 5}
							onChange={(newLimit) =>
								setAttributes({ limit: Number(newLimit) || 5 })
							}
							min={1}
							max={50}
							__nextHasNoMarginBottom={true}
						/>
					)}

					{mode === 'user' && (
						<UserSelector
							selectedUser={selectedUser}
							users={users}
							onChange={(newUser) =>
								setAttributes({ selectedUser: Number(newUser) || 0 })
							}
						/>
					)}

					{mode === 'topics' && (
						<TopicSelector
							selectedTopic={selectedTopic}
							onChange={(newTopic) =>
								setAttributes({ selectedTopic: newTopic || '' })
							}
						/>
					)}

					{ /* Stable Preview Card Container */}
					<SeriesPreviewCard
						mode={mode}
						limit={limit}
						selectedUser={selectedUser}
						selectedTopic={selectedTopic}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps} onClickCapture={handlePreviewClick}>
				<ServerSideRender
					key={`seriescraft-ssr-${activeSeriesId || 'all'}`}
					block="seriescraft/series-list"
					attributes={{
						mode,
						limit,
						selectedUser,
						selectedTopic,
						align,
					}}
					urlQueryArgs={{
						post_id: currentPostId,
						preview_series_id: activeSeriesId,
						preview_title: currentPostTitle,
						preview_image: currentPostImage,
						preview_key: currentPostImage
							? `${activeSeriesId}-${currentPostTitle}-${currentPostImage}-${previewRefreshKey}`
							: `${activeSeriesId}-${currentPostTitle}-${previewRefreshKey}`,
					}}
					EmptyResponsePlaceholder={EmptyPlaceholder}
					LoadingResponsePlaceholder={() => <LoadingPlaceholder lastMarkup={lastMarkup} />}
					ErrorResponsePlaceholder={EmptyPlaceholder}
				/>
			</div>
		</>
	);
}
