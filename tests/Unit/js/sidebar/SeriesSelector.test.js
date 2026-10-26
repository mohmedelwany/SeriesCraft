/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as wpData from '@wordpress/data';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
}));

jest.mock('@wordpress/components', () => ({
	Button: ( { children, onClick, disabled, variant, isBusy, className, ...props } ) => (
		<button
			type="button"
			onClick={ onClick }
			disabled={ disabled }
			className={ className }
			data-variant={ variant }
			{ ...props }
		>
			{ children }
		</button>
	),
	SelectControl: ( { label, value, options, onChange, help } ) => (
		<div className="components-select-control">
			<label htmlFor="mock-select-control">{ label }</label>
			<select
				id="mock-select-control"
				value={ value }
				onChange={ ( e ) => onChange( e.target.value ) }
			>
				{ options.map( ( opt ) => (
					<option key={ opt.value } value={ opt.value }>
						{ opt.label }
					</option>
				) ) }
			</select>
			{ help && <span>{ help }</span> }
		</div>
	),
	TextControl: ( { value, onChange, placeholder, disabled, className } ) => (
		<input
			type="text"
			value={ value }
			onChange={ ( e ) => onChange( e.target.value ) }
			placeholder={ placeholder }
			disabled={ disabled }
			className={ className }
		/>
	),
	Notice: ( { children, status, className } ) => (
		<div data-testid="mock-notice" data-status={ status } className={ className }>
			{ children }
		</div>
	),
}));

import SeriesSelector from '../../../../resources/js/sidebar/SeriesSelector';

describe('Sidebar SeriesSelector Component', () => {
	const mockSeriesList = [
		{ id: 10, name: 'Machine Learning Basics', count: 3 },
		{ id: 20, name: 'Neural Networks', count: 5 },
	];
	const mockCreateSeries = jest.fn();
	const mockOnSelectSeries = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		wpData.useSelect.mockImplementation( ( callback ) => {
			return callback( () => ( {
				getSeries: () => mockSeriesList,
			} ) );
		} );
		wpData.useDispatch.mockReturnValue( {
			createSeries: mockCreateSeries,
		} );
	} );

	/**
	 * Test 1: Renders dropdown options populated from store series list.
	 */
	it('Test 1: renders dropdown populated with available series from store', () => {
		render(
			<SeriesSelector
				currentSeriesId={ 10 }
				onSelectSeries={ mockOnSelectSeries }
			/>
		);

		expect( screen.getByLabelText( 'Assign Series' ) ).toBeDefined();
		expect( screen.getByText( 'Machine Learning Basics (3)' ) ).toBeDefined();
		expect( screen.getByText( 'Neural Networks (5)' ) ).toBeDefined();
	} );

	/**
	 * Test 2: Invokes onSelectSeries when user changes dropdown selection.
	 */
	it('Test 2: calls onSelectSeries with selected series ID on change', () => {
		render(
			<SeriesSelector
				currentSeriesId={ 10 }
				onSelectSeries={ mockOnSelectSeries }
			/>
		);

		const selectElement = screen.getByLabelText( 'Assign Series' );
		fireEvent.change( selectElement, { target: { value: '20' } } );

		expect( mockOnSelectSeries ).toHaveBeenCalledWith( 20 );
	} );

	/**
	 * Test 3: Toggles inline series creation form when Add New Series is clicked.
	 */
	it('Test 3: displays inline creation input form when "+ Add New Series" is clicked', () => {
		render(
			<SeriesSelector
				currentSeriesId={ 0 }
				onSelectSeries={ mockOnSelectSeries }
			/>
		);

		const toggleBtn = screen.getByText( '+ Add New Series' );
		fireEvent.click( toggleBtn );

		expect( screen.getByPlaceholderText( 'Series name...' ) ).toBeDefined();
		expect( screen.getByRole( 'button', { name: 'Add' } ) ).toBeDefined();
		expect( screen.getByRole( 'button', { name: 'Cancel' } ) ).toBeDefined();
	} );

	/**
	 * Test 4: Dispatches createSeries and calls onSelectSeries with new series ID.
	 */
	it('Test 4: dispatches createSeries and automatically selects newly created series', async () => {
		mockCreateSeries.mockResolvedValueOnce( {
			id: 35,
			name: 'Reinforcement Learning',
			count: 0,
		} );

		render(
			<SeriesSelector
				currentSeriesId={ 0 }
				onSelectSeries={ mockOnSelectSeries }
			/>
		);

		// Open inline form
		fireEvent.click( screen.getByText( '+ Add New Series' ) );

		const input = screen.getByPlaceholderText( 'Series name...' );
		fireEvent.change( input, { target: { value: 'Reinforcement Learning' } } );

		const submitBtn = screen.getByRole( 'button', { name: 'Add' } );
		fireEvent.click( submitBtn );

		await waitFor( () => {
			expect( mockCreateSeries ).toHaveBeenCalledWith( 'Reinforcement Learning' );
			expect( mockOnSelectSeries ).toHaveBeenCalledWith( 35 );
		} );
	} );

	/**
	 * Test 5: Displays error notice when inline series creation rejects.
	 */
	it('Test 5: renders error message if inline series creation fails', async () => {
		mockCreateSeries.mockRejectedValueOnce( new Error( 'Duplicate series name exists.' ) );

		render(
			<SeriesSelector
				currentSeriesId={ 0 }
				onSelectSeries={ mockOnSelectSeries }
			/>
		);

		fireEvent.click( screen.getByText( '+ Add New Series' ) );

		const input = screen.getByPlaceholderText( 'Series name...' );
		fireEvent.change( input, { target: { value: 'Duplicate Series' } } );

		const submitBtn = screen.getByRole( 'button', { name: 'Add' } );
		fireEvent.click( submitBtn );

		await waitFor( () => {
			expect( screen.getByText( 'Duplicate series name exists.' ) ).toBeDefined();
		} );
	} );
} );
