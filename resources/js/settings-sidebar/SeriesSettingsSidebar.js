/**
 * SeriesSettingsSidebar Component.
 *
 * Main container coordinating series selection switcher, layout/style tabs,
 * optimistic updates, REST persistence, and real-time live preview canvas event dispatching.
 *
 * @package SeriesCraft\SettingsSidebar
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { __ } from '@wordpress/i18n';
import { useSelect, useDispatch } from '@wordpress/data';
import { PanelBody, SelectControl, TabPanel, Spinner, Notice } from '@wordpress/components';
import {
	STORE_NAME,
	DEFAULT_SETTINGS,
	DEFAULT_STYLE,
	SPACING_PREVIEW_EVENT,
	LIVE_PREVIEW_EVENT,
	PREVIEW_REFRESH_EVENT,
	normalizeSeriesSettings,
	applySpacingPreview,
	applyStylePreview,
} from './constants';
import LayoutTab from './LayoutTab';
import StyleTab from './StyleTab';

/**
 * SeriesSettingsSidebar component.
 *
 * @return {JSX.Element} Rendered settings sidebar panel contents.
 */
export function SeriesSettingsSidebar({ initialSeriesId = 0, inModal = false } = {}) {
	// Query current post ID, assigned series, and all available series terms
	const { currentPostId, assignedSeriesId, availableSeries } = useSelect((select) => {
		const editor = select('core/editor');
		const store = select(STORE_NAME);

		const postId = editor?.getCurrentPostId?.() || 0;
		const rawSeries = editor?.getEditedPostAttribute?.('series');

		let firstId = 0;
		if (Array.isArray(rawSeries) && rawSeries.length > 0) {
			const first = rawSeries[0];
			firstId = typeof first === 'object' && first !== null ? Number(first.id || first.term_id) : Number(first);
		} else if (rawSeries) {
			firstId = Number(rawSeries);
		}

		return {
			currentPostId: postId,
			assignedSeriesId: isNaN(firstId) ? 0 : firstId,
			availableSeries: store?.getSeries?.() || [],
		};
	}, []);

	// Local state for actively inspected series
	const [targetSeriesId, setTargetSeriesId] = useState(initialSeriesId || 0);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (initialSeriesId && initialSeriesId > 0) {
			setTargetSeriesId(initialSeriesId);
		}
	}, [initialSeriesId]);

	// Determine effective active series ID (fallback to assignedSeriesId or first available)
	const activeSeriesId = useMemo(() => {
		if (targetSeriesId > 0 && availableSeries.some((s) => Number(s.id) === Number(targetSeriesId))) {
			return Number(targetSeriesId);
		}
		if (assignedSeriesId > 0 && availableSeries.some((s) => Number(s.id) === Number(assignedSeriesId))) {
			return Number(assignedSeriesId);
		}
		return availableSeries.length > 0 ? Number(availableSeries[0].id) : 0;
	}, [targetSeriesId, assignedSeriesId, availableSeries]);

	// Active series term entity
	const activeSeries = useMemo(() => {
		return availableSeries.find((s) => Number(s.id) === Number(activeSeriesId)) || null;
	}, [availableSeries, activeSeriesId]);

	// Query settings for active series term from store (triggers resolver if not loaded)
	const storeMeta = useSelect(
		(select) => {
			if (!activeSeriesId) {
				return null;
			}
			return select(STORE_NAME)?.getSeriesMeta?.(activeSeriesId) || null;
		},
		[activeSeriesId]
	);

	const storeMetaKey = useMemo(() => {
		return storeMeta ? JSON.stringify(storeMeta) : '';
	}, [storeMeta]);

	// Normalized local settings mirror
	const [localSettings, setLocalSettings] = useState(() => normalizeSeriesSettings(storeMeta));
	const settingsRef = useRef(localSettings);
	settingsRef.current = localSettings;
	const saveDebounceTimerRef = useRef(null);

	useEffect(() => {
		return () => {
			if (saveDebounceTimerRef.current) {
				clearTimeout(saveDebounceTimerRef.current);
			}
		};
	}, []);

	// Synchronize local settings when store meta updates
	useEffect(() => {
		if (storeMeta) {
			const normalized = normalizeSeriesSettings(storeMeta);
			setLocalSettings(normalized);
			if (activeSeriesId && normalized?.style) {
				applyStylePreview({
					termId: activeSeriesId,
					style: normalized.style,
				});
			}
		}
	}, [storeMetaKey, activeSeriesId]);

	// Register canvas listener for visual spacing preview overlay
	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const handleSpacingPreview = (event) => {
			applySpacingPreview(event.detail || {});
		};

		window.addEventListener(SPACING_PREVIEW_EVENT, handleSpacingPreview);
		return () => {
			window.removeEventListener(SPACING_PREVIEW_EVENT, handleSpacingPreview);
		};
	}, []);

	// Store dispatcher
	const { updateSeriesMeta } = useDispatch(STORE_NAME);

	/**
	 * Dispatches window event helpers for live canvas and SSR updates.
	 *
	 * @param {number} termId Term ID.
	 * @param {Object} nextSettings Complete settings object.
	 */
	const dispatchLiveEvents = (termId, nextSettings) => {
		if (typeof window === 'undefined' || !window.dispatchEvent) {
			return;
		}

		// 1. Live preview event for instant canvas re-render
		window.dispatchEvent(
			new CustomEvent(LIVE_PREVIEW_EVENT, {
				detail: {
					series: [activeSeries],
					layoutVariants: { [termId]: nextSettings.layout },
					layoutStyles: { [termId]: nextSettings.style },
					postId: currentPostId,
				},
			})
		);

		// 2. Trigger ServerSideRender / canvas block refresh
		window.dispatchEvent(
			new CustomEvent(PREVIEW_REFRESH_EVENT, {
				detail: { termId },
			})
		);
		window.dispatchEvent(
			new CustomEvent('sc-series-preview-refresh', {
				detail: { termId },
			})
		);
	};

	/**
	 * Persists settings changes to REST and triggers events.
	 *
	 * @param {Object} updatedSettings Merged settings.
	 */
	const saveSettings = async (updatedSettings) => {
		if (!activeSeriesId) {
			return;
		}

		setError('');
		setLocalSettings(updatedSettings);
		setIsSaving(true);

		const payload = {
			position: updatedSettings.position || DEFAULT_SETTINGS.position,
			layout: updatedSettings.layout || DEFAULT_SETTINGS.layout,
			style: updatedSettings.style || DEFAULT_STYLE,
			custom_styles: updatedSettings.style || DEFAULT_STYLE,
		};

		try {
			await updateSeriesMeta(activeSeriesId, payload);
			dispatchLiveEvents(activeSeriesId, updatedSettings);
		} catch (err) {
			setError(err?.message || __('Failed to update series settings.', 'series-craft'));
		} finally {
			setIsSaving(false);
		}
	};

	/**
	 * Handles layout variant updates from LayoutTab.
	 *
	 * @param {string} nextLayout Layout slug.
	 */
	const handleLayoutChange = (nextLayout) => {
		const next = {
			...settingsRef.current,
			layout: nextLayout,
		};
		saveSettings(next);
	};

	/**
	 * Handles individual style updates from StyleTab.
	 *
	 * @param {Object} styleUpdates Partial style object.
	 */
	const handleStyleChange = (styleUpdates) => {
		const nextStyle = {
			...settingsRef.current.style,
			...styleUpdates,
		};
		const next = {
			...settingsRef.current,
			style: nextStyle,
		};

		// 1. Immediately apply visual style custom properties to canvas DOM elements for instant feedback
		applyStylePreview({
			termId: activeSeriesId,
			style: nextStyle,
		});

		// 2. Dispatch live preview event immediately so all canvas listeners update
		if (typeof window !== 'undefined' && window.dispatchEvent) {
			window.dispatchEvent(
				new CustomEvent(LIVE_PREVIEW_EVENT, {
					detail: {
						series: [activeSeries],
						termId: activeSeriesId,
						layoutVariants: { [activeSeriesId]: next.layout },
						layoutStyles: { [activeSeriesId]: nextStyle },
						style: nextStyle,
						postId: currentPostId,
					},
				})
			);
		}

		setLocalSettings(next);

		// 3. Debounce the REST API persistence to prevent flooding server requests during continuous color picking
		if (saveDebounceTimerRef.current) {
			clearTimeout(saveDebounceTimerRef.current);
		}
		saveDebounceTimerRef.current = setTimeout(() => {
			saveSettings(next);
		}, 300);
	};

	/**
	 * Handles spacing dimension updates and triggers the spacing visualizer overlay.
	 *
	 * @param {string} type 'padding' | 'margin'
	 * @param {Object} nextValues Spacing values object.
	 */
	const handleSpacingChange = (type, nextValues) => {
		const nextStyle = {
			...settingsRef.current.style,
			[type]: nextValues,
		};

		// Dispatch visual spacing overlay immediately
		if (typeof window !== 'undefined' && window.dispatchEvent) {
			window.dispatchEvent(
				new CustomEvent(SPACING_PREVIEW_EVENT, {
					detail: {
						termId: activeSeriesId,
						style: nextStyle,
						changedKeys: [type],
					},
				})
			);
		}

		handleStyleChange({ [type]: nextValues });
	};

	/**
	 * Resets custom styles back to design system defaults.
	 */
	const handleResetStyles = () => {
		const next = {
			...settingsRef.current,
			style: { ...DEFAULT_STYLE },
		};

		applyStylePreview({
			termId: activeSeriesId,
			style: DEFAULT_STYLE,
		});

		if (typeof window !== 'undefined' && window.dispatchEvent) {
			window.dispatchEvent(
				new CustomEvent(LIVE_PREVIEW_EVENT, {
					detail: {
						series: [activeSeries],
						termId: activeSeriesId,
						layoutVariants: { [activeSeriesId]: next.layout },
						layoutStyles: { [activeSeriesId]: DEFAULT_STYLE },
						style: DEFAULT_STYLE,
						postId: currentPostId,
					},
				})
			);
		}

		saveSettings(next);
	};

	// Options for Series switcher dropdown
	const seriesOptions = [
		{ label: __('— Select a Series —', 'series-craft'), value: '' },
		...availableSeries.map((s) => ({
			label: `${s.name} (${s.count || 0})`,
			value: String(s.id),
		})),
	];

	return (
		<div className={`seriescraft-settings-sidebar ${inModal ? 'is-in-modal' : ''}`} data-testid="seriescraft-settings-sidebar">
			<PanelBody title={__('Series Settings', 'series-craft')} initialOpen={true}>
				{ /* Series Switcher Dropdown */}
				<div className="sc-series-switcher seriescraft-series-switcher">
					<SelectControl
						__next40pxDefaultSize={true}
						__nextHasNoMarginBottom={true}
						label={__('Target Series', 'series-craft')}
						value={activeSeriesId ? String(activeSeriesId) : ''}
						options={seriesOptions}
						onChange={(val) => setTargetSeriesId(val ? Number(val) : 0)}
						help={__(
							'Switch between available series terms to configure per-series visual appearance.',
							'series-craft'
						)}
					/>
				</div>

				{error && (
					<Notice status="error" isDismissible={false} className="sc-notice seriescraft-notice">
						{error}
					</Notice>
				)}

				{!activeSeries ? (
					<p className="seriescraft-no-series-notice">
						{availableSeries.length === 0
							? __('No series found. Create a series first in Document Settings.', 'series-craft')
							: __('Select one or more series for this post first.', 'series-craft')}
					</p>
				) : (
					<div
						className="sc-series-layout-setting sm-series-layout-setting"
						key={activeSeries.id}
						data-testid="sm-series-layout-setting"
					>
						<h4 className="sc-series-title sm-series-title">series: {activeSeries.name}</h4>

						<TabPanel
							className="sm-series-tabs"
							activeClass="is-active"
							tabs={[
								{
									name: 'layout',
									title: __('Layout', 'series-craft'),
									className: 'sm-tab-layout',
								},
								{
									name: 'style',
									title: __('Style', 'series-craft'),
									className: 'sm-tab-style',
								},
							]}
						>
							{(tab) => {
								if (tab.name === 'layout') {
									return (
										<LayoutTab
											series={activeSeries}
											layout={localSettings.layout}
											onChangeLayout={handleLayoutChange}
										/>
									);
								}
								if (tab.name === 'style') {
									return (
										<StyleTab
											series={activeSeries}
											style={localSettings.style}
											isSaving={isSaving}
											onChangeStyle={handleStyleChange}
											onChangeSpacing={handleSpacingChange}
											onReset={handleResetStyles}
										/>
									);
								}
								return null;
							}}
						</TabPanel>

						{isSaving && (
							<div className="sc-series-layout-saving sm-series-layout-saving">
								<Spinner /> {__('Saving...', 'series-craft')}
							</div>
						)}
					</div>
				)}
			</PanelBody>
		</div>
	);
}

export default SeriesSettingsSidebar;
