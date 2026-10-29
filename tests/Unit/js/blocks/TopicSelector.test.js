/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as wpData from '@wordpress/data';
import TopicSelector from '../../../../resources/js/blocks/series-list/components/TopicSelector';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
}));

jest.mock('@wordpress/components', () => ({
	SelectControl: ({ label, value, options, onChange }) => (
		<div className="components-select-control">
			<label htmlFor="topic-select">{label}</label>
			<select
				id="topic-select"
				data-testid="topic-select"
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

describe('TopicSelector Component', () => {
	const mockGetEntityRecords = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockGetEntityRecords.mockReturnValue([
			{ id: 10, name: 'Web Development', slug: 'web-dev' },
			{ id: 20, name: 'Cloud Infrastructure', slug: 'cloud' },
		]);

		wpData.useSelect.mockImplementation((callback) => {
			const select = (store) => {
				if (store === 'core') {
					return {
						getEntityRecords: mockGetEntityRecords,
					};
				}
				return {};
			};
			return callback(select);
		});
	});

	test('Test 1: renders default empty topic option with value ""', () => {
		render(<TopicSelector onChange={jest.fn()} />);

		const select = screen.getByTestId('topic-select');
		expect(select).toBeDefined();
		expect(select.value).toBe('');

		const options = screen.getAllByRole('option');
		expect(options[0].textContent).toContain('Select a Topic');
		expect(options[0].value).toBe('');
	});

	test('Test 2: renders explicit topics array when passed via prop', () => {
		const customTopics = [
			{ id: 101, name: 'TypeScript', slug: 'typescript' },
			{ id: 102, slug: 'graphql' },
			{ id: 103 },
		];

		render(<TopicSelector topics={customTopics} onChange={jest.fn()} />);

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(4);
		expect(options[1].textContent).toBe('TypeScript');
		expect(options[1].value).toBe('typescript');
		expect(options[2].textContent).toBe('graphql');
		expect(options[2].value).toBe('graphql');
		expect(options[3].textContent).toBe('Topic #103');
		expect(options[3].value).toBe('103');

		expect(mockGetEntityRecords).not.toHaveBeenCalled();
	});

	test('Test 3: queries core getEntityRecords for taxonomy/category when topics prop is omitted', () => {
		render(<TopicSelector onChange={jest.fn()} />);

		expect(mockGetEntityRecords).toHaveBeenCalledWith(
			'taxonomy',
			'category',
			expect.objectContaining({
				per_page: -1,
				hide_empty: false,
			})
		);

		const options = screen.getAllByRole('option');
		expect(options).toHaveLength(3);
		expect(options[1].textContent).toBe('Web Development');
		expect(options[1].value).toBe('web-dev');
		expect(options[2].textContent).toBe('Cloud Infrastructure');
		expect(options[2].value).toBe('cloud');
	});

	test('Test 4: invokes onChange callback with selected topic value', () => {
		const onChange = jest.fn();
		render(<TopicSelector onChange={onChange} />);

		const select = screen.getByTestId('topic-select');
		fireEvent.change(select, { target: { value: 'cloud' } });

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith('cloud');
	});

	test('Test 5: reflects selectedTopic prop value', () => {
		render(<TopicSelector selectedTopic="web-dev" onChange={jest.fn()} />);
		expect(screen.getByTestId('topic-select').value).toBe('web-dev');
	});
});
