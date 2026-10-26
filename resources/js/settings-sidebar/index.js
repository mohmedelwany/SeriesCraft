/**
 * SeriesCraft Dedicated Series Settings Sidebar Plugin.
 *
 * Registers the dedicated PluginSidebar and PluginSidebarMoreMenuItem for per-series
 * visual customizations and layout variant selections.
 *
 * @package SeriesCraft\SettingsSidebar
 */

import React from 'react';
import { registerPlugin } from '@wordpress/plugins';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import SeriesSettingsSidebar from './SeriesSettingsSidebar';

/**
 * SettingsSidebarPlugin component.
 *
 * @return {JSX.Element} Plugin sidebar and menu item.
 */
export function SettingsSidebarPlugin() {
	return (
		<>
			<PluginSidebarMoreMenuItem
				target="series-craft-settings"
				icon="admin-generic"
			>
				{ __( 'Series Settings', 'series-craft' ) }
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="series-craft-settings"
				title={ __( 'Series Settings', 'series-craft' ) }
				icon="admin-generic"
			>
				<SeriesSettingsSidebar />
			</PluginSidebar>
		</>
	);
}

// Register sidebar extension with Gutenberg plugin system
registerPlugin( 'series-craft-settings', {
	render: SettingsSidebarPlugin,
	icon: 'admin-generic',
} );

export default SettingsSidebarPlugin;
