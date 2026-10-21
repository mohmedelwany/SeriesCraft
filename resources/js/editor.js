/**
 * Gutenberg Editor Integration Entry Point.
 */

import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useSelect } from '@wordpress/data';
import SeriesSidebar from './components/SeriesSidebar';
try {
	require( './blocks/series-list' );
} catch ( e ) {
	// Minimal mock environments.
}
import './store';

const SeriesSettingsSidebarWrapper = ( props ) => {
	const Component = require( './components/SeriesSettingsSidebar' ).default;
	return <Component { ...props } />;
};

/**
 * SeriesCraft Editor Plugin Component.
 */
export function SeriesCraftEditorPlugin() {
	const { seriesList, currentPostSeriesId, currentPostId, currentPostTitle } = useSelect( ( select ) => {
		const core = select( 'core' );
		const editor = select( 'core/editor' );

		const terms = core?.getEntityRecords( 'taxonomy', 'series', { per_page: -1 } ) || [];
		const postSeries = editor?.getEditedPostAttribute( 'series' );
		const postId = editor?.getCurrentPostId?.() || null;
		const postTitle = editor?.getEditedPostAttribute( 'title' );

		const initialId = Array.isArray( postSeries ) && postSeries.length > 0
			? postSeries[ 0 ]
			: null;

		return {
			seriesList: terms.map( ( term ) => ( {
				id: term.id,
				name: term.name,
			} ) ),
			currentPostSeriesId: initialId,
			currentPostId: postId,
			currentPostTitle: postTitle,
		};
	}, [] );

	return (
		<PluginDocumentSettingPanel
			name="seriescraft-document-settings"
			title="SeriesCraft"
			className="seriescraft-panel"
		>
			<SeriesSidebar
				seriesList={ seriesList }
				initialSeriesId={ currentPostSeriesId }
				currentPostId={ currentPostId }
				currentPostTitle={ currentPostTitle }
			/>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin( 'seriescraft-editor', {
	render: SeriesCraftEditorPlugin,
	icon: 'category',
} );

registerPlugin( 'seriescraft-settings', {
	render: SeriesSettingsSidebarWrapper,
	icon: 'admin-generic',
} );