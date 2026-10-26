/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import * as wpData from '@wordpress/data';
import SeriesPreviewCard from '../../../../resources/js/blocks/series-list/components/SeriesPreviewCard';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
}));

jest.mock('@wordpress/components', () => ({
	Spinner: () => <span data-testid="mock-spinner">Loading...</span>,
}));

describe('SeriesPreviewCard Component', () => {
	let mockGetEntityRecords;
	let mockIsResolving;

	const sampleSeries = [
		{ id: 1, name: 'Series Alpha', count: 12 },
		{ id: 2, name: 'Series Beta', count: 8 },
		{ id: 3, name: 'Series Gamma', count: 5 },
		{ id: 4, name: 'Series Delta', count: 2 },
	];

	beforeEach(() => {
		jest.clearAllMocks();
		mockIsResolving = jest.fn(() => false);
		mockGetEntityRecords = jest.fn((kind, name, query) => {
			if (name === 'series') {
				if (query?.author === 999 || query?.topic === 'nonexistent') {
					return [];
				}
				return sampleSeries;
			}
			return [];
		});

		wpData.useSelect.mockImplementation((callback) => {
			const select = (store) => {
				if (store === 'core') {
					return {
						getEntityRecords: mockGetEntityRecords,
					};
				}
				if (store === 'core/data') {
					return {
						isResolving: mockIsResolving,
					};
				}
				return {};
			};
			return callback(select);
		});
	});

	test('Test 1: renders loading spinner when records are actively resolving', () => {
		mockIsResolving.mockReturnValue(true);

		render(<SeriesPreviewCard mode="all" />);

		expect(screen.getByTestId('series-preview-loading')).toBeDefined();
		expect(screen.getByTestId('mock-spinner')).toBeDefined();
	});

	test('Test 2: renders empty notice when zero series are returned', () => {
		mockGetEntityRecords.mockReturnValue([]);

		render(<SeriesPreviewCard mode="all" />);

		expect(screen.getByTestId('series-preview-empty')).toBeDefined();
		expect(screen.getByText('No series found.')).toBeDefined();
		expect(screen.getByTestId('series-count-badge').textContent).toContain('0 series');
	});

	test('Test 3: renders series count pill badge with total series count', () => {
		render(<SeriesPreviewCard mode="all" />);

		const badge = screen.getByTestId('series-count-badge');
		expect(badge.textContent).toContain('4 series');
		expect(screen.getByText('Series Alpha')).toBeDefined();
		expect(screen.getByText('(12)')).toBeDefined();
	});

	test('Test 4: slices displayed items by limit in "top" mode', () => {
		render(<SeriesPreviewCard mode="top" limit={2} />);

		const list = screen.getByTestId('series-preview-card-list');
		expect(list.children).toHaveLength(2);
		expect(screen.getByText('Series Alpha')).toBeDefined();
		expect(screen.getByText('Series Beta')).toBeDefined();
		expect(screen.queryByText('Series Gamma')).toBeNull();
	});

	test('Test 5: queries getEntityRecords with author filter in "user" mode and topic filter in "topics" mode', () => {
		const { rerender } = render(<SeriesPreviewCard mode="user" selectedUser={7} />);

		expect(mockGetEntityRecords).toHaveBeenCalledWith(
			'taxonomy',
			'series',
			expect.objectContaining({
				author: 7,
				hide_empty: false,
			})
		);

		rerender(<SeriesPreviewCard mode="topics" selectedTopic="tech" />);

		expect(mockGetEntityRecords).toHaveBeenCalledWith(
			'taxonomy',
			'series',
			expect.objectContaining({
				topic: 'tech',
				hide_empty: false,
			})
		);
	});

	test('Test 6: respects explicit series prop override', () => {
		const overrideSeries = [
			{ id: 99, name: 'Override Series 1', count: 100 },
		];

		render(<SeriesPreviewCard series={overrideSeries} />);

		expect(screen.getByTestId('series-count-badge').textContent).toContain('1 series');
		expect(screen.getByText('Override Series 1')).toBeDefined();
		expect(screen.getByText('(100)')).toBeDefined();
	});
});
