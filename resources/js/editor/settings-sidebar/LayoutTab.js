/**
 * LayoutTab Component.
 *
 * Tab 1 in Series Settings Sidebar for choosing visual layout variants.
 *
 * @package SeriesCraft\Editor\SettingsSidebar
 */

import React from 'react';
import { __, sprintf } from '@wordpress/i18n';
import LayoutVariantSelector from './LayoutVariantSelector';

/**
 * LayoutTab component.
 *
 * @param {Object} props Component props.
 * @param {Object} props.series Active series term object.
 * @param {string} props.layout Currently selected layout.
 * @param {Function} props.onChangeLayout Callback for layout updates.
 * @return {JSX.Element} Rendered tab content.
 */
export function LayoutTab( { series, layout = 'link-list', onChangeLayout } ) {
	const seriesName = series?.name || '';
	const label = seriesName
		? sprintf( __( 'Display variant for series: [%s]', 'series-craft' ), seriesName )
		: __( 'Display variant for series', 'series-craft' );

	return (
		<div className="sm-tab-content-layout" data-testid="sm-tab-content-layout">
			<LayoutVariantSelector
				label={ label }
				value={ layout }
				onChange={ onChangeLayout }
			/>
		</div>
	);
}

export default LayoutTab;
