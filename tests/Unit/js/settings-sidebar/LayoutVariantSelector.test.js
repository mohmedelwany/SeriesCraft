/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutVariantSelector } from '../../../../resources/js/editor/settings-sidebar/LayoutVariantSelector';
import { LayoutTab } from '../../../../resources/js/editor/settings-sidebar/LayoutTab';

describe('LayoutVariantSelector & LayoutTab Components', () => {
	it('Test 1: renders all 4 layout variant cards with correct markup and classes', () => {
		const handleChange = jest.fn();
		render(
			<LayoutVariantSelector
				value="link-list"
				onChange={handleChange}
				label="Select Layout"
			/>
		);

		expect(screen.getByText('Select Layout')).toBeDefined();
		expect(screen.getByTestId('sm-layout-selector')).toBeDefined();

		expect(screen.getByText('Media Grid')).toBeDefined();
		expect(screen.getByText('Link Grid')).toBeDefined();
		expect(screen.getByText('Media List')).toBeDefined();
		expect(screen.getByText('Link List')).toBeDefined();

		const linkListCard = screen.getByTestId('layout-card-link-list');
		expect(linkListCard.classList.contains('is-selected')).toBe(true);
		expect(linkListCard.getAttribute('aria-pressed')).toBe('true');

		const mediaGridCard = screen.getByTestId('layout-card-media-grid');
		expect(mediaGridCard.classList.contains('is-selected')).toBe(false);
	});

	it('Test 2: triggers onChange with correct variant slug when a card is clicked', () => {
		const handleChange = jest.fn();
		render(
			<LayoutVariantSelector
				value="link-list"
				onChange={handleChange}
			/>
		);

		const mediaGridCard = screen.getByTestId('layout-card-media-grid');
		fireEvent.click(mediaGridCard);
		expect(handleChange).toHaveBeenCalledWith('media-grid');

		const linkGridCard = screen.getByTestId('layout-card-link-grid');
		fireEvent.click(linkGridCard);
		expect(handleChange).toHaveBeenCalledWith('link-grid');
	});

	it('Test 3: LayoutTab renders LayoutVariantSelector with series-specific label', () => {
		const handleChange = jest.fn();
		const series = { id: 7, name: 'Web Dev 101' };

		render(
			<LayoutTab
				series={series}
				layout="media-list"
				onChangeLayout={handleChange}
			/>
		);

		expect(screen.getByTestId('sm-tab-content-layout')).toBeDefined();
		expect(
			screen.getByText('Display variant for series: [Web Dev 101]')
		).toBeDefined();

		const mediaListCard = screen.getByTestId('layout-card-media-list');
		expect(mediaListCard.classList.contains('is-selected')).toBe(true);
	});
});
