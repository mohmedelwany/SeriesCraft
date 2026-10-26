/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import * as wpPlugins from '@wordpress/plugins';

// Mock Gutenberg plugins and editor
jest.mock('@wordpress/plugins', () => ({
	registerPlugin: jest.fn(),
}));

jest.mock('@wordpress/editor', () => ({
	PluginSidebar: ({ children, name, title, icon }) => (
		<div
			data-testid="mock-plugin-sidebar"
			data-name={name}
			data-title={title}
			data-icon={icon}
		>
			<h2>{title}</h2>
			{children}
		</div>
	),
	PluginSidebarMoreMenuItem: ({ children, target, icon }) => (
		<div
			data-testid="mock-plugin-sidebar-menu-item"
			data-target={target}
			data-icon={icon}
		>
			{children}
		</div>
	),
}));

jest.mock(
	'../../../../resources/js/settings-sidebar/SeriesSettingsSidebar',
	() => () => (
		<div data-testid="mock-series-settings-sidebar">
			Series Settings Sidebar Content
		</div>
	)
);

import { SettingsSidebarPlugin } from '../../../../resources/js/settings-sidebar';

describe('Settings Sidebar Plugin Registration', () => {
	it('Test 1: registers series-craft-settings plugin with registerPlugin', () => {
		expect(wpPlugins.registerPlugin).toHaveBeenCalledWith(
			'series-craft-settings',
			expect.objectContaining({
				render: SettingsSidebarPlugin,
				icon: 'admin-generic',
			})
		);
	});

	it('Test 2: renders PluginSidebar and PluginSidebarMoreMenuItem with correct parameters', () => {
		render(<SettingsSidebarPlugin />);

		const sidebar = screen.getByTestId('mock-plugin-sidebar');
		expect(sidebar.getAttribute('data-name')).toBe('series-craft-settings');
		expect(sidebar.getAttribute('data-title')).toBe('Series Settings');
		expect(sidebar.getAttribute('data-icon')).toBe('admin-generic');

		const menuItem = screen.getByTestId('mock-plugin-sidebar-menu-item');
		expect(menuItem.getAttribute('data-target')).toBe('series-craft-settings');
		expect(menuItem.getAttribute('data-icon')).toBe('admin-generic');
		expect(screen.getAllByText('Series Settings')).toHaveLength(2);
		expect(screen.getByTestId('mock-series-settings-sidebar')).toBeDefined();
	});
});
