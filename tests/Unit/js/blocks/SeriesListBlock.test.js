/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

jest.mock('@wordpress/block-editor', () => ({
	InspectorControls: ({ children }) => <div data-testid="inspector-controls">{children}</div>,
	useBlockProps: (props = {}) => ({
		'data-testid': 'series-list-block-root',
		className: props.className || '',
	}),
}));

jest.mock('@wordpress/components', () => ({
	PanelBody: ({ title, children }) => (
		<div data-testid="panel-body">
			<h3>{title}</h3>
			{children}
		</div>
	),
	RangeControl: ({ label, value, onChange, min, max }) => (
		<div data-testid="range-control">
			<label>{label}</label>
			<input
				type="range"
				aria-label={label}
				value={value}
				min={min}
				max={max}
				onChange={(e) => onChange(Number(e.target.value))}
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
	Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
}));

jest.mock('../../../../resources/js/api/seriesClient', () => ({
	fetchSeriesList: jest.fn(),
}));

import * as wpData from '@wordpress/data';
import * as seriesClient from '../../../../resources/js/api/seriesClient';
import Edit from '../../../../resources/js/blocks/series-list/edit';
import save from '../../../../resources/js/blocks/series-list/save';
import blockMetadata from '../../../../resources/js/blocks/series-list/block.json';

describe('Series List Gutenberg Block (seriescraft/series-list)', () => {
	const mockSetAttributes = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		wpData.useSelect.mockImplementation((callback) => {
			return callback(() => ({
				getUsers: () => [
					{ id: 1, name: 'Alice Admin' },
					{ id: 2, name: 'Bob Author' },
				],
			}));
		});
	});

	it('validates block.json metadata attributes and schema', () => {
		expect(blockMetadata.name).toBe('seriescraft/series-list');
		expect(blockMetadata.title).toBe('Series List');
		expect(blockMetadata.category).toBe('widgets');
		expect(blockMetadata.icon).toBe('list-view');
		expect(blockMetadata.attributes.mode.default).toBe('all');
		expect(blockMetadata.attributes.limit.default).toBe(5);
		expect(blockMetadata.attributes.userId.default).toBe('');
	});

	it('save function returns null for server-side dynamic rendering', () => {
		expect(save()).toBeNull();
	});

	it('fetches series data strictly using modern REST API endpoint and displays loading spinner', async () => {
		let resolvePromise;
		const delayedPromise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		seriesClient.fetchSeriesList.mockReturnValue(delayedPromise);

		render(
			<Edit
				attributes={{ mode: 'all', limit: 5, userId: '' }}
				setAttributes={mockSetAttributes}
			/>
		);

		expect(seriesClient.fetchSeriesList).toHaveBeenCalledWith({
			mode: 'all',
			limit: 100,
			userId: '',
		});

		// Loading indicator should be present while promise is pending
		const spinners = screen.getAllByTestId('spinner');
		expect(spinners.length).toBeGreaterThan(0);

		// Resolve data
		const mockSeries = [
			{ id: 1, name: 'PHP Mastery', count: 8 },
			{ id: 2, name: 'JavaScript Deep Dive', count: 12 },
		];
		act(() => {
			resolvePromise(mockSeries);
		});

		await waitFor(() => {
			expect(screen.queryByTestId('spinner')).toBeNull();
		});

		expect(screen.getAllByText('PHP Mastery').length).toBeGreaterThan(0);
		expect(screen.getAllByText('JavaScript Deep Dive').length).toBeGreaterThan(0);
		expect(screen.getAllByText('(8)').length).toBeGreaterThan(0);
		expect(screen.getAllByText('(12)').length).toBeGreaterThan(0);
	});

	it('supports Top display mode displaying the top 5 series with custom count badge', async () => {
		const top5Series = [
			{ id: 1, name: 'Python Basics', count: 25 },
			{ id: 2, name: 'React Architecture', count: 18 },
			{ id: 3, name: 'WordPress Blocks', count: 15 },
			{ id: 4, name: 'Docker Essentials', count: 11 },
			{ id: 5, name: 'Cloud Native', count: 9 },
		];

		seriesClient.fetchSeriesList.mockResolvedValue(top5Series);

		const { container } = render(
			<Edit
				attributes={{ mode: 'top', limit: 5, userId: '' }}
				setAttributes={mockSetAttributes}
			/>
		);

		expect(seriesClient.fetchSeriesList).toHaveBeenCalledWith({
			mode: 'top',
			limit: 5,
			userId: '',
		});

		await waitFor(() => {
			expect(screen.queryByTestId('spinner')).toBeNull();
		});

		// Check Top mode count badge
		const badges = container.querySelectorAll('[data-testid="series-count-badge"]');
		expect(badges.length).toBeGreaterThan(0);
		badges.forEach((badge) => {
			expect(badge.textContent).toBe('Top 5 series');
		});

		// Top 5 series items should render
		expect(screen.getAllByText('Python Basics').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Cloud Native').length).toBeGreaterThan(0);

		// Limit control should be visible in Top mode
		const rangeInput = screen.getByLabelText('Limit');
		expect(rangeInput).toBeDefined();

		fireEvent.change(rangeInput, { target: { value: '8' } });
		expect(mockSetAttributes).toHaveBeenCalledWith({ limit: 8 });
	});

	it('renders empty message when no series terms are returned', async () => {
		seriesClient.fetchSeriesList.mockResolvedValue([]);

		render(
			<Edit
				attributes={{ mode: 'all', limit: 5, userId: '' }}
				setAttributes={mockSetAttributes}
			/>
		);

		await waitFor(() => {
			expect(screen.queryByTestId('spinner')).toBeNull();
		});

		const emptyNotices = screen.getAllByTestId('series-preview-empty');
		expect(emptyNotices.length).toBeGreaterThan(0);
		emptyNotices.forEach((notice) => {
			expect(notice.textContent).toBe('No series found.');
		});
	});

	it('handles mode switching to user mode and displays UserSelector', async () => {
		seriesClient.fetchSeriesList.mockResolvedValue([]);

		render(
			<Edit
				attributes={{ mode: 'all', limit: 5, userId: '' }}
				setAttributes={mockSetAttributes}
			/>
		);

		await waitFor(() => {
			expect(screen.queryByTestId('spinner')).toBeNull();
		});

		// Mode selector should allow switching mode
		const modeSelect = screen.getByLabelText('Mode');
		fireEvent.change(modeSelect, { target: { value: 'user' } });
		expect(mockSetAttributes).toHaveBeenCalledWith({ mode: 'user' });
	});
});
