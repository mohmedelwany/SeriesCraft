/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StyleTab } from '../../../../resources/js/editor/settings-sidebar/StyleTab';

// Mock dependencies
jest.mock('@wordpress/block-editor', () => ({
	__experimentalPanelColorGradientSettings: ({ title, settings }) => (
		<div data-testid="mock-color-gradient-settings" data-title={title}>
			{settings.map((s, idx) => (
				<div key={idx}>
					<label htmlFor={`color-${idx}`}>{s.label}</label>
					<input
						id={`color-${idx}`}
						aria-label={s.label}
						value={s.colorValue || ''}
						onChange={(e) => s.onColorChange(e.target.value)}
					/>
				</div>
			))}
		</div>
	),
	__experimentalSpacingSizesControl: ({ label, values, onChange }) => (
		<div data-testid={`mock-spacing-${label.toLowerCase()}`}>
			<label htmlFor={`spacing-${label.toLowerCase()}`}>{label}</label>
			<input
				id={`spacing-${label.toLowerCase()}`}
				aria-label={label}
				value={values?.top || ''}
				onChange={(e) => onChange({ ...values, top: e.target.value })}
			/>
		</div>
	),
}));

jest.mock('@wordpress/components', () => ({
	PanelBody: ({ children, title }) => (
		<div data-testid="mock-panel-body" data-title={title}>
			<h3>{title}</h3>
			{children}
		</div>
	),
	Button: ({ children, onClick, disabled, isBusy, className }) => (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			data-is-busy={isBusy}
			className={className}
		>
			{children}
		</button>
	),
	__experimentalBorderControl: ({ label, value, onChange }) => (
		<div data-testid="mock-border-control">
			<label htmlFor="border-input">{label}</label>
			<input
				id="border-input"
				aria-label={label}
				value={value?.width || ''}
				onChange={(e) => onChange({ ...value, width: e.target.value })}
			/>
		</div>
	),
}));

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(() => []),
}));

describe('StyleTab Component', () => {
	const defaultStyle = {
		titleColor: '#2f3335',
		headerBackgroundColor: '#e8f0fe',
		buttonColor: '#0062a2',
		padding: { top: '5rem', bottom: '5rem', left: '1.5rem', right: '1.5rem' },
		margin: { top: '0px', bottom: '5rem', left: '0px', right: '0px' },
		border: { width: '1px', color: '#0062a2', style: 'solid' },
	};

	it('Test 1: renders all color, border, dimension controls, and reset button', () => {
		render(
			<StyleTab
				series={{ id: 5, name: 'React Series' }}
				style={defaultStyle}
				isSaving={false}
				onChangeStyle={jest.fn()}
				onChangeSpacing={jest.fn()}
				onReset={jest.fn()}
			/>
		);

		expect(screen.getByTestId('sm-tab-content-style')).toBeDefined();
		expect(screen.getByLabelText('Title')).toBeDefined();
		expect(screen.getByLabelText('Header Background')).toBeDefined();
		expect(screen.getByLabelText('Button')).toBeDefined();
		expect(screen.getByTestId('mock-border-control')).toBeDefined();
		expect(screen.getByTestId('mock-spacing-padding')).toBeDefined();
		expect(screen.getByTestId('mock-spacing-margin')).toBeDefined();

		const resetBtn = screen.getByText('Reset to default styles');
		expect(resetBtn).toBeDefined();
		expect(resetBtn.disabled).toBe(false);
	});

	it('Test 2: updates colors and invokes onChangeStyle', () => {
		const mockChangeStyle = jest.fn();
		render(
			<StyleTab
				series={{ id: 5, name: 'React Series' }}
				style={defaultStyle}
				isSaving={false}
				onChangeStyle={mockChangeStyle}
				onChangeSpacing={jest.fn()}
				onReset={jest.fn()}
			/>
		);

		const titleInput = screen.getByLabelText('Title');
		fireEvent.change(titleInput, { target: { value: '#112233' } });
		expect(mockChangeStyle).toHaveBeenCalledWith({ titleColor: '#112233' });

		const buttonInput = screen.getByLabelText('Button');
		fireEvent.change(buttonInput, { target: { value: '#445566' } });
		expect(mockChangeStyle).toHaveBeenCalledWith({ buttonColor: '#445566' });
	});

	it('Test 3: updates border and invokes onChangeStyle', () => {
		const mockChangeStyle = jest.fn();
		render(
			<StyleTab
				series={{ id: 5, name: 'React Series' }}
				style={defaultStyle}
				isSaving={false}
				onChangeStyle={mockChangeStyle}
				onChangeSpacing={jest.fn()}
				onReset={jest.fn()}
			/>
		);

		const borderInput = screen.getByLabelText('Border');
		fireEvent.change(borderInput, { target: { value: '2px' } });
		expect(mockChangeStyle).toHaveBeenCalledWith({
			border: expect.objectContaining({ width: '2px' }),
		});
	});

	it('Test 4: updates padding and margin and invokes onChangeSpacing', () => {
		const mockChangeSpacing = jest.fn();
		render(
			<StyleTab
				series={{ id: 5, name: 'React Series' }}
				style={defaultStyle}
				isSaving={false}
				onChangeStyle={jest.fn()}
				onChangeSpacing={mockChangeSpacing}
				onReset={jest.fn()}
			/>
		);

		const paddingInput = screen.getByLabelText('Padding');
		fireEvent.change(paddingInput, { target: { value: '3rem' } });
		expect(mockChangeSpacing).toHaveBeenCalledWith(
			'padding',
			expect.objectContaining({ top: '3rem' })
		);

		const marginInput = screen.getByLabelText('Margin');
		fireEvent.change(marginInput, { target: { value: '4rem' } });
		expect(mockChangeSpacing).toHaveBeenCalledWith(
			'margin',
			expect.objectContaining({ top: '4rem' })
		);
	});

	it('Test 5: clicking reset button calls onReset and disables button during saving', () => {
		const mockReset = jest.fn();
		const { rerender } = render(
			<StyleTab
				series={{ id: 5, name: 'React Series' }}
				style={defaultStyle}
				isSaving={false}
				onChangeStyle={jest.fn()}
				onChangeSpacing={jest.fn()}
				onReset={mockReset}
			/>
		);

		const resetBtn = screen.getByText('Reset to default styles');
		fireEvent.click(resetBtn);
		expect(mockReset).toHaveBeenCalledTimes(1);

		rerender(
			<StyleTab
				series={{ id: 5, name: 'React Series' }}
				style={defaultStyle}
				isSaving={true}
				onChangeStyle={jest.fn()}
				onChangeSpacing={jest.fn()}
				onReset={mockReset}
			/>
		);

		expect(screen.getByText('Reset to default styles').disabled).toBe(true);
	});
});
