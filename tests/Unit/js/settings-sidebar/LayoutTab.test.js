/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutTab } from '../../../../resources/js/settings-sidebar/LayoutTab';

describe('LayoutTab Component', () => {
	test('Test 1: formats title label with series name when series object is provided', () => {
		const series = { id: 42, name: 'Advanced React Architecture' };
		render(
			<LayoutTab
				series={series}
				layout="link-list"
				onChangeLayout={jest.fn()}
			/>
		);

		expect(
			screen.getByText('Display variant for series: [Advanced React Architecture]')
		).toBeDefined();
		expect(screen.getByTestId('sm-tab-content-layout')).toBeDefined();
	});

	test('Test 2: falls back to generic title label when series is null or name is empty', () => {
		const { rerender } = render(
			<LayoutTab
				series={null}
				layout="link-list"
				onChangeLayout={jest.fn()}
			/>
		);

		expect(screen.getByText('Display variant for series')).toBeDefined();

		rerender(
			<LayoutTab
				series={{ id: 5, name: '' }}
				layout="link-list"
				onChangeLayout={jest.fn()}
			/>
		);
		expect(screen.getByText('Display variant for series')).toBeDefined();
	});

	test('Test 3: renders all 4 layout variant choices with active selection state', () => {
		render(
			<LayoutTab
				series={{ id: 10, name: 'DevOps' }}
				layout="media-grid"
				onChangeLayout={jest.fn()}
			/>
		);

		expect(screen.getByText('Media Grid')).toBeDefined();
		expect(screen.getByText('Link Grid')).toBeDefined();
		expect(screen.getByText('Media List')).toBeDefined();
		expect(screen.getByText('Link List')).toBeDefined();

		const mediaGridCard = screen.getByTestId('layout-card-media-grid');
		expect(mediaGridCard.classList.contains('is-selected')).toBe(true);

		const linkListCard = screen.getByTestId('layout-card-link-list');
		expect(linkListCard.classList.contains('is-selected')).toBe(false);
	});

	test('Test 4: dispatches chosen layout variant slug on card click', () => {
		const onChangeLayout = jest.fn();
		render(
			<LayoutTab
				series={{ id: 10, name: 'DevOps' }}
				layout="link-list"
				onChangeLayout={onChangeLayout}
			/>
		);

		const linkGridCard = screen.getByTestId('layout-card-link-grid');
		fireEvent.click(linkGridCard);

		expect(onChangeLayout).toHaveBeenCalledTimes(1);
		expect(onChangeLayout).toHaveBeenCalledWith('link-grid');

		const mediaListCard = screen.getByTestId('layout-card-media-list');
		fireEvent.click(mediaListCard);
		expect(onChangeLayout).toHaveBeenCalledWith('media-list');
	});
});
