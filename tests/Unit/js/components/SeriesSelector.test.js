/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@wordpress/components', () => ({
	SelectControl: ({ label, value, options, onChange, disabled, className }) => (
		<div className={className}>
			<label htmlFor="series-selector-mock">{label}</label>
			<select
				id="series-selector-mock"
				value={value}
				disabled={disabled}
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
}));

import SeriesSelector from '../../../../resources/js/components/SeriesSelector';

describe('SeriesSelector Component', () => {
	const mockSeriesList = [
		{ id: 10, name: 'Python Basics Series' },
		{ id: 25, name: 'Gutenberg Deep Dive' },
	];

	it('renders select dropdown with default placeholder option', () => {
		const { container } = render(
			<SeriesSelector
				seriesList={mockSeriesList}
				selectedSeriesId={null}
				onChange={jest.fn()}
			/>
		);

		const selectElement = container.querySelector('select');
		expect(selectElement).not.toBeNull();

		const labelElement = container.querySelector('label');
		expect(labelElement.textContent).toBe('Assign to Series');

		const options = container.querySelectorAll('option');
		expect(options).toHaveLength(3);
		expect(options[0].textContent).toBe('— Select a Series —');
		expect(options[1].textContent).toBe('Python Basics Series');
		expect(options[2].textContent).toBe('Gutenberg Deep Dive');
	});

	it('triggers onChange with numeric ID when selection changes', () => {
		const handleChange = jest.fn();
		const { container } = render(
			<SeriesSelector
				seriesList={mockSeriesList}
				selectedSeriesId={null}
				onChange={handleChange}
			/>
		);

		const selectElement = container.querySelector('select');
		fireEvent.change(selectElement, {
			target: { value: '25' },
		});

		expect(handleChange).toHaveBeenCalledTimes(1);
		expect(handleChange).toHaveBeenCalledWith(25);
	});

	it('triggers onChange with null when selecting the placeholder option', () => {
		const handleChange = jest.fn();
		const { container } = render(
			<SeriesSelector
				seriesList={mockSeriesList}
				selectedSeriesId={10}
				onChange={handleChange}
			/>
		);

		const selectElement = container.querySelector('select');
		fireEvent.change(selectElement, {
			target: { value: '' },
		});

		expect(handleChange).toHaveBeenCalledWith(null);
	});

	it('disables the dropdown when isDisabled is true', () => {
		const { container } = render(
			<SeriesSelector
				seriesList={mockSeriesList}
				selectedSeriesId={null}
				onChange={jest.fn()}
				isDisabled={true}
			/>
		);

		const selectElement = container.querySelector('select');
		expect(selectElement.disabled).toBe(true);
	});
});