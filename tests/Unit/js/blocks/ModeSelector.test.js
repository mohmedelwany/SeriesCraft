/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeSelector from '../../../../resources/js/blocks/series-list/components/ModeSelector';

jest.mock('@wordpress/components', () => ({
	SelectControl: ({ label, value, options, onChange }) => (
		<div className="components-select-control">
			<label htmlFor="mode-select">{label}</label>
			<select
				id="mode-select"
				data-testid="mode-select"
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
}));

describe('ModeSelector Component', () => {
	test('Test 1: renders SELECT control with label and all 4 required mode options', () => {
		render(<ModeSelector mode="all" onChange={jest.fn()} />);

		const select = screen.getByTestId('mode-select');
		expect(select).toBeDefined();

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(4);
		expect(options[0].value).toBe('all');
		expect(options[1].value).toBe('top');
		expect(options[2].value).toBe('user');
		expect(options[3].value).toBe('topics');
	});

	test('Test 2: defaults to "all" mode when mode prop is undefined', () => {
		render(<ModeSelector onChange={jest.fn()} />);

		const select = screen.getByTestId('mode-select');
		expect(select.value).toBe('all');
	});

	test('Test 3: reflects the active mode prop in the select value', () => {
		const { rerender } = render(<ModeSelector mode="user" onChange={jest.fn()} />);
		expect(screen.getByTestId('mode-select').value).toBe('user');

		rerender(<ModeSelector mode="topics" onChange={jest.fn()} />);
		expect(screen.getByTestId('mode-select').value).toBe('topics');

		rerender(<ModeSelector mode="top" onChange={jest.fn()} />);
		expect(screen.getByTestId('mode-select').value).toBe('top');
	});

	test('Test 4: calls onChange callback with new mode string on user selection', () => {
		const onChange = jest.fn();
		render(<ModeSelector mode="all" onChange={onChange} />);

		const select = screen.getByTestId('mode-select');
		fireEvent.change(select, { target: { value: 'top' } });
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('top');

		fireEvent.change(select, { target: { value: 'topics' } });
		expect(onChange).toHaveBeenCalledWith('topics');
	});
});
