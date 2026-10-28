/**
 * Gutenberg Document Settings Sidebar Panel for SeriesCraft.
 *
 * Integrates directly into the post settings document sidebar panel via PluginDocumentSettingPanel.
 * Provides lifecycle auto-synchronization and manual block addition with strict post hydration guards.
 *
 * @package SeriesCraft\Editor\Sidebar
 */

import domReady from '@wordpress/dom-ready';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import SeriesSelector from '../components/SeriesSelector';
import PartOrderList from './PartOrderList';
import {
	usePostSavingSync,
	findSeriesBlocks,
	findSeriesListBlocks,
	removeCoreTaxonomyPanel,
} from '../../hooks/usePostSavingSync';

export { removeCoreTaxonomyPanel, findSeriesBlocks, findSeriesListBlocks };

// Remove default core taxonomy panel when editor DOM is ready
if ( typeof domReady === 'function' ) {
	domReady( removeCoreTaxonomyPanel );
} else if ( typeof window !== 'undefined' && window.wp?.domReady ) {
	window.wp.domReady( removeCoreTaxonomyPanel );
}

/**
 * SeriesDocumentSettingsPanel component.
 *
 * @return {JSX.Element} Rendered plugin document setting panel.
 */
export function SeriesDocumentSettingsPanel() {
	const {
		currentPostId,
		currentPostTitle,
		assignedSeriesId,
		hasSeriesBlock,
		handleAddBlockManual,
		handleSelectSeries,
	} = usePostSavingSync();

	return (
		<PluginDocumentSettingPanel
			name="seriescraft-series-panel"
			title={ __( 'Series', 'series-craft' ) }
			className="seriescraft-document-settings-panel"
			icon="list-view"
		>
			<SeriesSelector
				currentSeriesId={ assignedSeriesId }
				onSelectSeries={ handleSelectSeries }
			/>

			{ assignedSeriesId > 0 && (
				<div className="seriescraft-sidebar-block-action">
					<Button
						variant="secondary"
						disabled={ hasSeriesBlock }
						onClick={ handleAddBlockManual }
						className="seriescraft-add-block-btn"
					>
						{ hasSeriesBlock
							? __( 'Series List block already added', 'series-craft' )
							: __( 'Add Series List block', 'series-craft' ) }
					</Button>
				</div>
			) }

			{ assignedSeriesId > 0 ? (
				<PartOrderList
					seriesId={ assignedSeriesId }
					currentPostId={ currentPostId }
					currentPostTitle={ currentPostTitle }
				/>
			) : (
				<p className="seriescraft-empty-sidebar-notice">
					{ __(
						'Select or create a series to manage sequential post ordering and table of contents display.',
						'series-craft'
					) }
				</p>
			) }
		</PluginDocumentSettingPanel>
	);
}

// Register sidebar extension with Gutenberg plugin system
registerPlugin( 'seriescraft-document-settings', {
	render: SeriesDocumentSettingsPanel,
	icon: 'list-view',
} );

export default SeriesDocumentSettingsPanel;
