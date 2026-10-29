/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UserSelector from '../../../../resources/js/blocks/series-list/components/UserSelector';

jest.mock('@wordpress/components', () => ({
	SelectControl: ({ label, value, options, onChange }) => (
		<div className="components-select-control">
			<label htmlFor="user-select">{label}</label>
			<select
				id="user-select"
				data-testid="user-select"
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

describe('UserSelector Component', () => {
	const sampleUsers = [
		{ id: 1, name: 'Alice Walker' },
		{ id: 2, slug: 'bob-smith' },
		{ id: 3 }, // Fallback to User #3
	];

	test('Test 1: renders default "— Select a User —" with value "0" when users array is empty or undefined', () => {
		render(<UserSelector onChange={jest.fn()} />);

		const select = screen.getByTestId('user-select');
		expect(select).toBeDefined();
		expect(select.value).toBe('0');

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(1);
		expect(options[0].textContent).toContain('Select a User');
		expect(options[0].value).toBe('0');
	});

	test('Test 2: maps users list with name, slug fallback, or User #{id} fallback label', () => {
		render(<UserSelector users={sampleUsers} onChange={jest.fn()} />);

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(4);
		expect(options[1].textContent).toBe('Alice Walker');
		expect(options[1].value).toBe('1');
		expect(options[2].textContent).toBe('bob-smith');
		expect(options[2].value).toBe('2');
		expect(options[3].textContent).toBe('User #3');
		expect(options[3].value).toBe('3');
	});

	test('Test 3: dispatches numeric casted ID to onChange callback when user is selected', () => {
		const onChange = jest.fn();
		render(<UserSelector users={sampleUsers} selectedUser={0} onChange={onChange} />);

		const select = screen.getByTestId('user-select');
		fireEvent.change(select, { target: { value: '2' } });

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(2);
		expect(typeof onChange.mock.calls[0][0]).toBe('number');
	});

	test('Test 4: dispatches numeric 0 when selecting default placeholder', () => {
		const onChange = jest.fn();
		render(<UserSelector users={sampleUsers} selectedUser={2} onChange={onChange} />);

		const select = screen.getByTestId('user-select');
		fireEvent.change(select, { target: { value: '0' } });

		expect(onChange).toHaveBeenCalledWith(0);
	});

	test('Test 5: reflects numeric or string selectedUser in select value', () => {
		const { rerender } = render(<UserSelector users={sampleUsers} selectedUser={1} onChange={jest.fn()} />);
		expect(screen.getByTestId('user-select').value).toBe('1');

		rerender(<UserSelector users={sampleUsers} selectedUser="2" onChange={jest.fn()} />);
		expect(screen.getByTestId('user-select').value).toBe('2');
	});
});
