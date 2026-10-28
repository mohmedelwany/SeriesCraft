/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DraggableItem from '../../../../resources/js/editor/components/DraggableItem';

describe('Sidebar DraggableItem Component', () => {
	const mockPost = {
		id: 105,
		title: { rendered: 'Deep Dive into Transformers' },
		status: 'publish',
		part_order: 2,
	};

	/**
	 * Test 1: Renders post title, order number, and drag handle.
	 */
	it('Test 1: renders post title, sequence number, and drag handle correctly', () => {
		render(
			<DraggableItem
				post={ mockPost }
				index={ 1 }
				isCurrent={ false }
			/>
		);

		expect( screen.getByText( 'Deep Dive into Transformers' ) ).toBeDefined();
		expect( screen.getByText( '2' ) ).toBeDefined();
		expect( screen.getByLabelText( 'Drag handle' ) ).toBeDefined();
		expect( screen.queryByText( 'Current Post' ) ).toBeNull();
	} );

	/**
	 * Test 2: Renders current post badge when isCurrent is true.
	 */
	it('Test 2: displays Current Post badge and applies highlight class when isCurrent is true', () => {
		const { container } = render(
			<DraggableItem
				post={ mockPost }
				index={ 0 }
				isCurrent={ true }
			/>
		);

		expect( screen.getByText( 'Current Post' ) ).toBeDefined();
		const item = container.querySelector( '.seriescraft-draggable-item' );
		expect( item.classList.contains( 'is-current-post' ) ).toBe( true );
	} );

	/**
	 * Test 3: Renders post status badge for non-published posts.
	 */
	it('Test 3: displays status badge when post is draft or pending', () => {
		const draftPost = { ...mockPost, status: 'draft' };
		render(
			<DraggableItem
				post={ draftPost }
				index={ 0 }
				isCurrent={ false }
			/>
		);

		expect( screen.getByText( 'draft' ) ).toBeDefined();
	} );

	/**
	 * Test 4: Triggers HTML5 drag events properly.
	 */
	it('Test 4: triggers onDragStart, onDragOver, and onDrop callbacks during drag', () => {
		const handleDragStart = jest.fn();
		const handleDragOver = jest.fn();
		const handleDrop = jest.fn();

		const { container } = render(
			<DraggableItem
				post={ mockPost }
				index={ 2 }
				onDragStart={ handleDragStart }
				onDragOver={ handleDragOver }
				onDrop={ handleDrop }
			/>
		);

		const item = container.querySelector( '.seriescraft-draggable-item' );

		fireEvent.dragStart( item );
		expect( handleDragStart ).toHaveBeenCalled();

		fireEvent.dragOver( item );
		expect( handleDragOver ).toHaveBeenCalled();

		fireEvent.drop( item );
		expect( handleDrop ).toHaveBeenCalled();
	} );

	/**
	 * Test 5: Disables dragging when isSaving is true.
	 */
	it('Test 5: disables dragging when isSaving is active', () => {
		const { container } = render(
			<DraggableItem
				post={ mockPost }
				index={ 1 }
				isSaving={ true }
			/>
		);

		const item = container.querySelector( '.seriescraft-draggable-item' );
		expect( item.getAttribute( 'draggable' ) ).toBe( 'false' );
		expect( item.classList.contains( 'is-disabled' ) ).toBe( true );
	} );

	/**
	 * Test 6: Verifies that up and down arrow buttons are not rendered.
	 */
	it('Test 6: does not render up and down arrow buttons', () => {
		render(
			<DraggableItem
				post={ mockPost }
				index={ 0 }
			/>
		);

		expect( screen.queryByLabelText( 'Move up in series' ) ).toBeNull();
		expect( screen.queryByLabelText( 'Move down in series' ) ).toBeNull();
	} );

	/**
	 * Test 7: Renders (Untitled) fallback title and sc-order-item classes when title is empty.
	 */
	it('Test 7: renders (Untitled) fallback title and sc-order-item classes when title is empty', () => {
		const emptyTitlePost = { id: 201, title: '', status: 'draft', part_order: 1 };
		const { container } = render(
			<DraggableItem
				post={ emptyTitlePost }
				index={ 0 }
				isCurrent={ true }
			/>
		);

		expect( screen.getByText( '(Untitled)' ) ).toBeDefined();
		expect( screen.getByText( 'Current Post' ) ).toBeDefined();
		expect( container.querySelector( '.sc-order-item__info' ) ).not.toBeNull();
		expect( container.querySelector( '.sc-order-item__title' ) ).not.toBeNull();
		expect( container.querySelector( '.sc-order-item__badge' ) ).not.toBeNull();
	} );
} );
