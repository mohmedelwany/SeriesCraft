/**
 * SeriesSettingsSidebar Component.
 *
 * Places a gear/settings icon in the Gutenberg top header toolbar and provides
 * a panel to configure the selected series itself (NOT the post):
 * - 4 Layouts: Link List, Link Grid, Media List, Media Grid
 * - Per-Series visual styling: Title color, header background, button/icon colors, border, spacing
 * - Wired to modern SeriesCraft REST API endpoints and state store.
 */

import { useState, useEffect, useMemo, useCallback } from '@wordpress/element';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { PanelBody, Spinner, Notice, TabPanel } from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { __, sprintf } from '@wordpress/i18n';
import LayoutVariantSelector from './LayoutVariantSelector';
import SeriesStyleSettings from './SeriesStyleSettings';
import { updateSeriesSettings, fetchSeriesSettings } from '../api/seriesClient';
import { STORE_NAME } from '../store/constants';

/**
 * Series Settings Sidebar Component.
 *
 * @param {Object} props Component props.
 * @return {JSX.Element} Rendered plugin sidebar.
 */
export default function SeriesSettingsSidebar() {
	const { assignedSeries, isLoadingTerms, activePostSeriesIds } = useSelect( ( select ) => {
		const core = select( 'core' );
		const editor = select( 'core/editor' );

		const postSeries = editor?.getEditedPostAttribute( 'series' ) || [];
		const terms = core?.getEntityRecords( 'taxonomy', 'series', { per_page: -1 } ) || [];
		const isResolving = core?.isResolving?.( 'getEntityRecords', [ 'taxonomy', 'series', { per_page: -1 } ] ) || false;

		const normalizedIds = ( Array.isArray( postSeries ) ? postSeries : [ postSeries ] )
			.map( ( val ) => {
				if ( val == null ) return null;
				if ( typeof val === 'object' ) {
					return Number( val?.id ?? val?.term_id );
				}
				return Number( val );
			} )
			.filter( Boolean );

		const filtered = terms.filter( ( term ) => normalizedIds.includes( Number( term.id ) ) );

		return {
			assignedSeries: filtered,
			isLoadingTerms: isResolving,
			activePostSeriesIds: normalizedIds,
		};
	}, [] );

	const [ seriesSettingsMap, setSeriesSettingsMap ] = useState( {} );
	const [ savingTermId, setSavingTermId ] = useState( null );
	const [ error, setError ] = useState( null );

	const { updateSetting: dispatchUpdateSetting } = useDispatch( STORE_NAME );

	// Fetch initial settings for assigned series when they appear
	useEffect( () => {
		let isMounted = true;

		assignedSeries.forEach( async ( term ) => {
			if ( ! seriesSettingsMap[ term.id ] ) {
				try {
					const data = await fetchSeriesSettings( Number( term.id ) );
					if ( isMounted && data ) {
						setSeriesSettingsMap( ( prev ) => ( {
							...prev,
							[ term.id ]: {
								layout: data.layout || 'link-list',
								custom_styles: data.custom_styles || data.style || {},
							},
						} ) );
					}
				} catch ( err ) {
					// Fallback to local default if fetch fails
					if ( isMounted ) {
						setSeriesSettingsMap( ( prev ) => ( {
							...prev,
							[ term.id ]: {
								layout: 'link-list',
								custom_styles: {},
							},
						} ) );
					}
				}
			}
		} );

		return () => {
			isMounted = false;
		};
	}, [ assignedSeries, seriesSettingsMap ] );

	// Handler to update layout for a specific series term
	const handleLayoutChange = useCallback( async ( termId, newLayout ) => {
		setError( null );
		setSavingTermId( termId );

		const current = seriesSettingsMap[ termId ] || {};
		const updated = {
			...current,
			layout: newLayout,
		};

		setSeriesSettingsMap( ( prev ) => ( {
			...prev,
			[ termId ]: updated,
		} ) );

		try {
			await updateSeriesSettings( termId, {
				layout: newLayout,
				custom_styles: updated.custom_styles || {},
			} );

			if ( dispatchUpdateSetting ) {
				dispatchUpdateSetting( 'layout', newLayout );
			}
		} catch ( err ) {
			setError( err.message || __( 'Failed to update layout', 'series-craft' ) );
		} finally {
			setSavingTermId( null );
		}
	}, [ seriesSettingsMap, dispatchUpdateSetting ] );

	// Handler to update custom visual styling for a specific series term
	const handleStyleChange = useCallback( async ( termId, newStyles ) => {
		setError( null );
		setSavingTermId( termId );

		const current = seriesSettingsMap[ termId ] || {};
		const updated = {
			...current,
			custom_styles: newStyles,
		};

		setSeriesSettingsMap( ( prev ) => ( {
			...prev,
			[ termId ]: updated,
		} ) );

		try {
			await updateSeriesSettings( termId, {
				layout: current.layout || 'link-list',
				custom_styles: newStyles,
			} );

			if ( dispatchUpdateSetting ) {
				dispatchUpdateSetting( 'custom_styles', newStyles );
			}
		} catch ( err ) {
			setError( err.message || __( 'Failed to update styling', 'series-craft' ) );
		} finally {
			setSavingTermId( null );
		}
	}, [ seriesSettingsMap, dispatchUpdateSetting ] );

	// Handler to reset custom visual styling for a specific series term
	const handleResetStyles = useCallback( async ( termId ) => {
		setError( null );
		setSavingTermId( termId );

		const current = seriesSettingsMap[ termId ] || {};
		const updated = {
			...current,
			custom_styles: {},
		};

		setSeriesSettingsMap( ( prev ) => ( {
			...prev,
			[ termId ]: updated,
		} ) );

		try {
			await updateSeriesSettings( termId, {
				layout: current.layout || 'link-list',
				custom_styles: {},
			} );

			if ( dispatchUpdateSetting ) {
				dispatchUpdateSetting( 'custom_styles', {} );
			}
		} catch ( err ) {
			setError( err.message || __( 'Failed to reset styling', 'series-craft' ) );
		} finally {
			setSavingTermId( null );
		}
	}, [ seriesSettingsMap, dispatchUpdateSetting ] );

	return (
		<>
			<PluginSidebarMoreMenuItem
				target="seriescraft-series-settings"
				icon="admin-generic"
			>
				{ __( 'Series Settings', 'series-craft' ) }
			</PluginSidebarMoreMenuItem>

			<PluginSidebar
				name="seriescraft-series-settings"
				title={ __( 'Series Settings', 'series-craft' ) }
				icon="admin-generic"
			>
				<PanelBody title={ __( 'Series Settings', 'series-craft' ) } initialOpen={ true }>
					{ isLoadingTerms && <Spinner /> }

					{ error && (
						<Notice status="error" isDismissible={ false } className="mb-4">
							{ error }
						</Notice>
					) }

					{ ! isLoadingTerms && assignedSeries.length === 0 && (
						<p className="sc-series-no-selection">
							{ __( 'Select one or more series for this post first.', 'series-craft' ) }
						</p>
					) }

					{ ! isLoadingTerms && assignedSeries.map( ( series ) => {
						const currentSettings = seriesSettingsMap[ series.id ] || {};
						const layout = currentSettings.layout || 'link-list';
						const customStyles = currentSettings.custom_styles || {};
						const isSaving = savingTermId === series.id;

						return (
							<div
								key={ series.id }
								className="sc-series-layout-setting sm-series-layout-setting shadow-md mb-6 p-4 border rounded"
								data-testid={ `series-settings-card-${ series.id }` }
							>
								<h4 className="sc-series-title sm-series-title font-bold mb-3 text-base">
									{ sprintf( __( 'Series: %s', 'series-craft' ), series.name ) }
								</h4>

								<TabPanel
									className="sc-series-tabs sm-series-tabs"
									activeClass="is-active"
									tabs={ [
										{
											name: 'layout',
											title: __( 'Layout', 'series-craft' ),
											className: 'sc-tab-layout sm-tab-layout',
										},
										{
											name: 'style',
											title: __( 'Style', 'series-craft' ),
											className: 'sc-tab-style sm-tab-style',
										},
									] }
								>
									{ ( tab ) => {
										if ( tab.name === 'layout' ) {
											return (
												<div className="sc-tab-content-layout sm-tab-content-layout">
													<LayoutVariantSelector
														value={ layout }
														onChange={ ( nextLayout ) => handleLayoutChange( series.id, nextLayout ) }
														label={ sprintf(
															__( 'Display variant for series: [%s]', 'series-craft' ),
															series.name
														) }
													/>
												</div>
											);
										}
										if ( tab.name === 'style' ) {
											return (
												<SeriesStyleSettings
													series={ series }
													styles={ customStyles }
													onChangeStyle={ handleStyleChange }
													onResetStyles={ handleResetStyles }
													isSaving={ isSaving }
												/>
											);
										}
										return null;
									} }
								</TabPanel>

								{ isSaving && (
									<div className="sc-series-saving-status mt-3 text-sm text-gray-500 flex items-center gap-2">
										<Spinner /> { __( 'Saving...', 'series-craft' ) }
									</div>
								) }
							</div>
						);
					} ) }
				</PanelBody>
			</PluginSidebar>
		</>
	);
}
