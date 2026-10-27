/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('@wordpress/editor', () => ({
	PluginSidebar: ({ name, title, children }) => (
		<div data-testid="plugin-sidebar" data-name={name}>
			<h2>{title}</h2>
			{children}
		</div>
	),
	PluginSidebarMoreMenuItem: ({ target, icon, children }) => (
		<button data-testid="more-menu-item" data-target={target} data-icon={icon}>
			{children}
		</button>
	),
}));

jest.mock('@wordpress/components', () => ({
	PanelBody: ({ title, children }) => (
		<div data-testid="panel-body">
			<h3>{title}</h3>
			{children}
		</div>
	),
	Icon: () => <span data-testid="icon" />,
	Spinner: () => <div data-testid="spinner">Loading...</div>,
	Notice: ({ children }) => <div data-testid="notice">{children}</div>,
	TabPanel: ({ tabs, children }) => {
		const ReactModule = require('react');
		const [activeTab, setActiveTab] = ReactModule.useState(tabs[0].name);
		return (
			<div data-testid="tab-panel">
				<div role="tablist">
					{tabs.map((tab) => (
						<button
							key={tab.name}
							role="tab"
							aria-selected={activeTab === tab.name}
							onClick={() => setActiveTab(tab.name)}
						>
							{tab.title}
						</button>
					))}
				</div>
				<div data-testid="tab-content">
					{children(tabs.find((t) => t.name === activeTab))}
				</div>
			</div>
		);
	},
	ColorPalette: ({ value, onChange }) => (
		<div data-testid="color-palette">
			<input
				type="text"
				data-testid="color-input"
				value={value || ''}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	),
	TextControl: ({ label, value, onChange, placeholder }) => (
		<div data-testid="text-control">
			<label>{label}</label>
			<input
				aria-label={label}
				placeholder={placeholder}
				value={value || ''}
				onChange={(e) => onChange(e.target.value)}
			/>
		</div>
	),
	SelectControl: ({ label, value, options = [], onChange }) => (
		<div data-testid="select-control">
			<label>{label}</label>
			<select
				aria-label={label}
				value={value}
				onChange={(e) => onChange(e.target.value)}
			>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
		</div>
	),
	Button: ({ children, onClick, disabled }) => (
		<button onClick={onClick} disabled={disabled}>
			{children}
		</button>
	),
}));

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

jest.mock('../../../../resources/js/api/seriesClient', () => ({
	fetchSeriesSettings: jest.fn(),
	updateSeriesSettings: jest.fn(),
}));

import * as wpData from '@wordpress/data';
import * as seriesClient from '../../../../resources/js/api/seriesClient';
import SeriesSettingsSidebar from '../../../../resources/js/components/SeriesSettingsSidebar';

describe('SeriesSettingsSidebar Component (Header Gear Panel)', () => {
	const mockDispatchUpdateSetting = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		wpData.useDispatch.mockReturnValue({
			updateSetting: mockDispatchUpdateSetting,
		});
	});

	it('renders gear trigger and empty state when no series assigned to current post', () => {
		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return {
						getEntityRecords: () => [],
						isResolving: () => false,
					};
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => [],
					};
				}
				return {};
			});
		});

		render(<SeriesSettingsSidebar />);

		const menuItem = screen.getByTestId('more-menu-item');
		expect(menuItem.getAttribute('data-icon')).toBe('admin-generic');
		expect(menuItem.getAttribute('data-target')).toBe('seriescraft-series-settings');

		expect(screen.getByText('Select one or more series for this post first.')).toBeDefined();
	});

	it('loads assigned series and allows selecting among 4 layout options', async () => {
		const assignedSeries = [
			{ id: 42, name: 'Deep Learning with PyTorch' },
		];

		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return {
						getEntityRecords: () => assignedSeries,
						isResolving: () => false,
					};
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => [42],
					};
				}
				return {};
			});
		});

		seriesClient.fetchSeriesSettings.mockResolvedValue({
			layout: 'link-list',
			custom_styles: {},
		});
		seriesClient.updateSeriesSettings.mockResolvedValue({ success: true });

		const { container } = render(<SeriesSettingsSidebar />);

		await waitFor(() => {
			expect(seriesClient.fetchSeriesSettings).toHaveBeenCalledWith(42);
		});

		expect(screen.getByText('Series: Deep Learning with PyTorch')).toBeDefined();

		// Verify 4 layout options are available (Link List, Link Grid, Media List, Media Grid)
		expect(container.querySelector('[data-layout="link-list"]')).not.toBeNull();
		expect(container.querySelector('[data-layout="link-grid"]')).not.toBeNull();
		expect(container.querySelector('[data-layout="media-list"]')).not.toBeNull();
		expect(container.querySelector('[data-layout="media-grid"]')).not.toBeNull();

		// Click Media Grid layout
		const mediaGridCard = container.querySelector('[data-layout="media-grid"]');
		fireEvent.click(mediaGridCard);

		await waitFor(() => {
			expect(seriesClient.updateSeriesSettings).toHaveBeenCalledWith(42, {
				layout: 'media-grid',
				custom_styles: {},
			});
		});

		expect(mockDispatchUpdateSetting).toHaveBeenCalledWith('layout', 'media-grid');
	});

	it('configures per-series visual styling (colors, border, spacing, reset)', async () => {
		const assignedSeries = [
			{ id: 42, name: 'Deep Learning with PyTorch' },
		];

		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return {
						getEntityRecords: () => assignedSeries,
						isResolving: () => false,
					};
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => [42],
					};
				}
				return {};
			});
		});

		seriesClient.fetchSeriesSettings.mockResolvedValue({
			layout: 'link-list',
			custom_styles: {
				titleColor: '#0073aa',
				border: { color: '#111111', width: '2px', style: 'solid' },
				padding: { top: '16px', bottom: '16px', left: '16px', right: '16px' },
			},
		});
		seriesClient.updateSeriesSettings.mockResolvedValue({ success: true });

		const { container } = render(<SeriesSettingsSidebar />);

		await waitFor(() => {
			expect(seriesClient.fetchSeriesSettings).toHaveBeenCalledWith(42);
		});

		// Switch to Style tab
		const styleTab = screen.getByRole('tab', { name: 'Style' });
		fireEvent.click(styleTab);

		expect(screen.getByTestId('series-style-settings')).toBeDefined();
		expect(screen.getByText('Color Settings')).toBeDefined();
		expect(screen.getByText('Border Settings')).toBeDefined();
		expect(screen.getByText('Spacing & Dimensions')).toBeDefined();

		// Change padding top
		const paddingTopInput = screen.getAllByLabelText('Top')[0];
		fireEvent.change(paddingTopInput, { target: { value: '24px' } });

		await waitFor(() => {
			expect(seriesClient.updateSeriesSettings).toHaveBeenCalledWith(42, expect.objectContaining({
				layout: 'link-list',
				custom_styles: expect.objectContaining({
					padding: expect.objectContaining({ top: '24px' }),
				}),
			}));
		});

		// Click Reset to default styles
		const resetBtn = screen.getByText('Reset to default styles');
		fireEvent.click(resetBtn);

		await waitFor(() => {
			expect(seriesClient.updateSeriesSettings).toHaveBeenCalledWith(42, {
				layout: 'link-list',
				custom_styles: {},
			});
		});

		expect(mockDispatchUpdateSetting).toHaveBeenCalledWith('custom_styles', {});
	});
});
