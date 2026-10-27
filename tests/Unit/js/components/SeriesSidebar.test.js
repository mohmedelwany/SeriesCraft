/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockEditPost = jest.fn();

jest.mock('@wordpress/data', () => ({
	useDispatch: jest.fn(() => ({
		editPost: mockEditPost,
	})),
	useSelect: jest.fn(),
}));

jest.mock('@wordpress/components', () => ({
	PanelBody: ({ title, children }) => (
		<div className="components-panel__body">
			<h2>{title}</h2>
			{children}
		</div>
	),
	Button: ({ children, onClick, isBusy, disabled, variant }) => (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || isBusy}
			data-variant={variant}
		>
			{isBusy ? 'Saving...' : children}
		</button>
	),
}));

jest.mock('../../../../resources/js/components/SeriesSelector', () => {
	return function MockSeriesSelector({ selectedSeriesId, onChange }) {
		return (
			<div data-testid="mock-series-selector">
				<select
					data-testid="series-dropdown"
					value={selectedSeriesId || ''}
					onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
				>
					<option value="">— Select a Series —</option>
					<option value="12">Laravel Architecture</option>
				</select>
			</div>
		);
	};
});

jest.mock('../../../../resources/js/components/PartOrderList', () => {
	return function MockPartOrderList({ seriesId, currentPostId }) {
		return (
			<div data-testid="mock-part-order-list">
				<span data-testid="part-order-series-id">{seriesId}</span>
				<span data-testid="part-order-post-id">{String(currentPostId)}</span>
			</div>
		);
	};
});

const mockSaveSettings = jest.fn();
const mockUpdateSetting = jest.fn();

jest.mock('../../../../resources/js/hooks/useSeries', () => {
	return jest.fn((seriesId) => ({
		settings: { layout: 'list' },
		isSaving: false,
		error: null,
		updateSetting: mockUpdateSetting,
		saveSettings: mockSaveSettings,
	}));
});

const mockMoveItem = jest.fn();
const mockSaveOrder = jest.fn();

jest.mock('../../../../resources/js/hooks/useSeriesOrder', () => {
	return jest.fn((seriesId) => ({
		orderedPostIds: [101, 102],
		isSaving: false,
		moveItem: mockMoveItem,
		saveOrder: mockSaveOrder,
	}));
});

import SeriesSidebar from '../../../../resources/js/components/SeriesSidebar';

describe('SeriesSidebar Component', () => {
	const mockSeriesList = [
		{ id: 12, name: 'Laravel Architecture' },
	];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders series selector but hides part order and save button when no series is selected', () => {
		const { container } = render(
			<SeriesSidebar
				seriesList={mockSeriesList}
				initialSeriesId={null}
			/>
		);

		expect(container.querySelector('[data-testid="mock-series-selector"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="mock-part-order-list"]')).toBeNull();
		expect(container.querySelector('button[data-variant="primary"]')).toBeNull();
	});

	it('renders part order list and save button when a series is selected', () => {
		const { container } = render(
			<SeriesSidebar
				seriesList={mockSeriesList}
				initialSeriesId={12}
				currentPostId={42}
			/>
		);

		expect(container.querySelector('[data-testid="mock-series-selector"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="mock-part-order-list"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="part-order-series-id"]').textContent).toBe('12');
		expect(container.querySelector('[data-testid="part-order-post-id"]').textContent).toBe('42');
		expect(screen.getByRole('button', { name: 'Save Settings' })).toBeDefined();
	});

	it('triggers saveSettings, saveOrder, and editPost on click save button', async () => {
		render(
			<SeriesSidebar
				seriesList={mockSeriesList}
				initialSeriesId={12}
			/>
		);

		const saveButton = screen.getByRole('button', { name: 'Save Settings' });
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(mockSaveSettings).toHaveBeenCalledTimes(1);
			expect(mockSaveOrder).toHaveBeenCalledTimes(1);
			expect(mockSaveOrder).toHaveBeenCalledWith([101, 102]);
			expect(mockEditPost).toHaveBeenCalledWith({ series: [12] });
		});
	});

	it('dispatches editPost with series taxonomy selection to core/editor when series changes', () => {
		render(
			<SeriesSidebar
				seriesList={mockSeriesList}
				initialSeriesId={null}
			/>
		);

		const selectDropdown = screen.getByTestId('series-dropdown');
		fireEvent.change(selectDropdown, { target: { value: '12' } });

		expect(mockEditPost).toHaveBeenCalledWith({ series: [12] });

		fireEvent.change(selectDropdown, { target: { value: '' } });
		expect(mockEditPost).toHaveBeenCalledWith({ series: [] });
	});
});