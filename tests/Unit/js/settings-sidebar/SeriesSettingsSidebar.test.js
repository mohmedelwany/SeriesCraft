/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as wpData from '@wordpress/data';
import {
	SPACING_PREVIEW_EVENT,
	LIVE_PREVIEW_EVENT,
	PREVIEW_REFRESH_EVENT,
	DEFAULT_STYLE,
} from '../../../../resources/js/settings-sidebar/constants';

// Mock components
jest.mock('@wordpress/components', () => {
	const mockReact = require('react');
	return {
		PanelBody: ({ children, title }) => (
			<div data-testid="mock-panel-body" data-title={title}>
				<h3>{title}</h3>
				{children}
			</div>
		),
		SelectControl: ({ label, value, options, onChange }) => (
			<div className="components-select-control">
				<label htmlFor="target-series-select">{label}</label>
				<select
					id="target-series-select"
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
		TabPanel: ({ tabs, children }) => {
			const [activeTab, setActiveTab] = mockReact.useState(tabs[0].name);
			const current = tabs.find((t) => t.name === activeTab) || tabs[0];
			return (
				<div data-testid="mock-tab-panel">
					<div role="tablist">
						{tabs.map((t) => (
							<button
								key={t.name}
								type="button"
								onClick={() => setActiveTab(t.name)}
							>
								{t.title}
							</button>
						))}
					</div>
					{children(current)}
				</div>
			);
		},
		Spinner: () => <span data-testid="mock-spinner">Saving...</span>,
		Notice: ({ children, status }) => (
			<div data-testid="mock-notice" data-status={status}>
				{children}
			</div>
		),
		Button: ({ children, onClick, disabled, className }) => (
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				className={className}
			>
				{children}
			</button>
		),
		__experimentalBorderControl: () => <div data-testid="mock-border-ctrl" />,
	};
});

jest.mock('../../../../resources/js/settings-sidebar/StyleTab', () => ({
	__esModule: true,
	default: ({ onReset, onChangeStyle, onChangeSpacing, style }) => (
		<div data-testid="mock-style-tab">
			<button onClick={() => onChangeStyle({ buttonColor: '#123456' })}>
				Change Color
			</button>
			<button onClick={() => onChangeSpacing('padding', { top: '3rem' })}>
				Change Spacing
			</button>
			<button onClick={onReset}>Reset to default styles</button>
		</div>
	),
}));

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

import { SeriesSettingsSidebar } from '../../../../resources/js/settings-sidebar/SeriesSettingsSidebar';

describe('SeriesSettingsSidebar Component', () => {
	const mockUpdateSeriesMeta = jest.fn();
	const mockAvailableSeries = [
		{ id: 10, name: 'Architecture 101', count: 3 },
		{ id: 20, name: 'React Mastery', count: 5 },
	];

	beforeEach(() => {
		mockUpdateSeriesMeta.mockClear();
		mockUpdateSeriesMeta.mockResolvedValue({ success: true });

		wpData.useDispatch.mockReturnValue({
			updateSeriesMeta: mockUpdateSeriesMeta,
		});
	});

	it('Test 1: defaults to assigned series from current post', () => {
		wpData.useSelect.mockImplementation((callback) =>
			callback((storeName) => {
				if (storeName === 'core/editor') {
					return {
						getCurrentPostId: () => 101,
						getEditedPostAttribute: (attr) => (attr === 'series' ? [20] : null),
					};
				}
				return {
					getSeries: () => mockAvailableSeries,
					getSeriesMeta: (id) =>
						id === 20 ? { layout: 'link-grid', style: DEFAULT_STYLE } : null,
				};
			})
		);

		render(<SeriesSettingsSidebar />);

		expect(screen.getByText('Target Series')).toBeDefined();
		const select = screen.getByLabelText('Target Series');
		expect(select.value).toBe('20');
		expect(screen.getByText('series: React Mastery')).toBeDefined();
	});

	it('Test 2: displays message when no series is available', () => {
		wpData.useSelect.mockImplementation((callback) =>
			callback((storeName) => {
				if (storeName === 'core/editor') {
					return {
						getCurrentPostId: () => 101,
						getEditedPostAttribute: () => [],
					};
				}
				return {
					getSeries: () => [],
					getSeriesMeta: () => null,
				};
			})
		);

		render(<SeriesSettingsSidebar />);

		expect(
			screen.getByText('No series found. Create a series first in Document Settings.')
		).toBeDefined();
	});

	it('Test 3: switches target series from dropdown switcher', () => {
		wpData.useSelect.mockImplementation((callback) =>
			callback((storeName) => {
				if (storeName === 'core/editor') {
					return {
						getCurrentPostId: () => 101,
						getEditedPostAttribute: () => [10],
					};
				}
				return {
					getSeries: () => mockAvailableSeries,
					getSeriesMeta: () => null,
				};
			})
		);

		render(<SeriesSettingsSidebar />);

		const select = screen.getByLabelText('Target Series');
		expect(select.value).toBe('10');
		expect(screen.getByText('series: Architecture 101')).toBeDefined();

		fireEvent.change(select, { target: { value: '20' } });
		expect(screen.getByText('series: React Mastery')).toBeDefined();
	});

	it('Test 4: dispatches updateSeriesMeta and live preview events on layout change', async () => {
		const previewRefreshListener = jest.fn();
		const livePreviewListener = jest.fn();
		window.addEventListener(PREVIEW_REFRESH_EVENT, previewRefreshListener);
		window.addEventListener(LIVE_PREVIEW_EVENT, livePreviewListener);

		wpData.useSelect.mockImplementation((callback) =>
			callback((storeName) => {
				if (storeName === 'core/editor') {
					return {
						getCurrentPostId: () => 101,
						getEditedPostAttribute: () => [10],
					};
				}
				return {
					getSeries: () => mockAvailableSeries,
					getSeriesMeta: () => ({ layout: 'link-list', style: DEFAULT_STYLE }),
				};
			})
		);

		render(<SeriesSettingsSidebar />);

		const mediaGridCard = screen.getByTestId('layout-card-media-grid');
		fireEvent.click(mediaGridCard);

		await waitFor(() => {
			expect(mockUpdateSeriesMeta).toHaveBeenCalledWith(
				10,
				expect.objectContaining({
					layout: 'media-grid',
					style: DEFAULT_STYLE,
					custom_styles: DEFAULT_STYLE,
				})
			);
		});

		expect(previewRefreshListener).toHaveBeenCalled();
		expect(livePreviewListener).toHaveBeenCalled();

		window.removeEventListener(PREVIEW_REFRESH_EVENT, previewRefreshListener);
		window.removeEventListener(LIVE_PREVIEW_EVENT, livePreviewListener);
	});

	it('Test 5: dispatches sm-series-spacing-preview on spacing change and resets styles', async () => {
		const spacingListener = jest.fn();
		window.addEventListener(SPACING_PREVIEW_EVENT, spacingListener);

		wpData.useSelect.mockImplementation((callback) =>
			callback((storeName) => {
				if (storeName === 'core/editor') {
					return {
						getCurrentPostId: () => 101,
						getEditedPostAttribute: () => [10],
					};
				}
				return {
					getSeries: () => mockAvailableSeries,
					getSeriesMeta: () => ({ layout: 'link-list', style: DEFAULT_STYLE }),
				};
			})
		);

		render(<SeriesSettingsSidebar />);

		// Switch to Style tab
		const styleTabBtn = screen.getByText('Style');
		fireEvent.click(styleTabBtn);

		// Trigger spacing update
		const spacingBtn = screen.getByText('Change Spacing');
		fireEvent.click(spacingBtn);

		expect(spacingListener).toHaveBeenCalledWith(
			expect.objectContaining({
				detail: expect.objectContaining({
					termId: 10,
					changedKeys: ['padding'],
				}),
			})
		);

		// Trigger reset to default styles
		const resetBtn = screen.getByText('Reset to default styles');
		fireEvent.click(resetBtn);

		await waitFor(() => {
			expect(mockUpdateSeriesMeta).toHaveBeenCalledWith(
				10,
				expect.objectContaining({
					style: DEFAULT_STYLE,
					custom_styles: DEFAULT_STYLE,
				})
			);
		});

		window.removeEventListener(SPACING_PREVIEW_EVENT, spacingListener);
	});

	it('Test 6: displays Notice error when updateSeriesMeta fails', async () => {
		mockUpdateSeriesMeta.mockRejectedValueOnce(
			new Error('Network error saving settings')
		);

		wpData.useSelect.mockImplementation((callback) =>
			callback((storeName) => {
				if (storeName === 'core/editor') {
					return {
						getCurrentPostId: () => 101,
						getEditedPostAttribute: () => [10],
					};
				}
				return {
					getSeries: () => mockAvailableSeries,
					getSeriesMeta: () => ({ layout: 'link-list', style: DEFAULT_STYLE }),
				};
			})
		);

		render(<SeriesSettingsSidebar />);

		const mediaGridCard = screen.getByTestId('layout-card-media-grid');
		fireEvent.click(mediaGridCard);

		await waitFor(() => {
			expect(screen.getByTestId('mock-notice')).toBeDefined();
			expect(screen.getByText('Network error saving settings')).toBeDefined();
		});
	});
});
