/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
}));

import * as wpData from '@wordpress/data';
import PartOrderList from '../../../../resources/js/components/PartOrderList';

describe('PartOrderList Real-Time Title Sync & Dynamic Append', () => {
	const mockMoveItem = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('dynamically appends the current post as the last item when not present in seriesPosts', () => {
		const existingPosts = [
			{ id: 10, title: 'Existing Part 1' },
			{ id: 11, title: 'Existing Part 2' },
		];

		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return {
						getEntityRecords: () => existingPosts,
					};
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => 'Brand New Post',
						getCurrentPostId: () => 999,
					};
				}
				return {};
			});
		});

		const { container } = render(
			<PartOrderList
				seriesId={7}
				currentPostId={999}
				moveItem={mockMoveItem}
			/>
		);

		expect(screen.getByText('3 parts')).toBeDefined();

		// Check cards
		const cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards).toHaveLength(3);

		// The last card should be the dynamically appended current post
		const currentCard = container.querySelector('[data-testid="part-item-999"]');
		expect(currentCard).not.toBeNull();
		expect(currentCard.textContent).toContain('Part 3');
		expect(currentCard.textContent).toContain('Brand New Post');
		expect(currentCard.textContent).toContain('Current');
		expect(currentCard.classList.contains('is-current')).toBe(true);
	});

	it('shows (Draft) fallback label when current post title is empty or whitespace', () => {
		const existingPosts = [
			{ id: 10, title: 'Chapter 1' },
		];

		// Case 1: Empty string title from editor
		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return {
						getEntityRecords: () => existingPosts,
					};
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => '   ',
						getCurrentPostId: () => 200,
					};
				}
				return {};
			});
		});

		const { container, rerender } = render(
			<PartOrderList
				seriesId={7}
				currentPostId={200}
				moveItem={mockMoveItem}
			/>
		);

		let currentCard = container.querySelector('[data-testid="part-item-200"]');
		expect(currentCard.textContent).toContain('(Draft)');

		// Case 2: Empty prop title overrides
		rerender(
			<PartOrderList
				seriesId={7}
				currentPostId={200}
				currentPostTitle=""
				moveItem={mockMoveItem}
			/>
		);

		currentCard = container.querySelector('[data-testid="part-item-200"]');
		expect(currentCard.textContent).toContain('(Draft)');
	});

	it('updates the title in real time as the user types in the editor', () => {
		const existingPosts = [
			{ id: 10, title: 'Chapter 1' },
		];

		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return {
						getEntityRecords: () => existingPosts,
					};
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => '',
						getCurrentPostId: () => 300,
					};
				}
				return {};
			});
		});

		const { container, rerender } = render(
			<PartOrderList
				seriesId={7}
				currentPostId={300}
				currentPostTitle="Building a Modern Pl"
				moveItem={mockMoveItem}
			/>
		);

		let currentCard = container.querySelector('[data-testid="part-item-300"]');
		expect(currentCard.textContent).toContain('Building a Modern Pl');

		// User continues typing in the editor
		rerender(
			<PartOrderList
				seriesId={7}
				currentPostId={300}
				currentPostTitle="Building a Modern Plugin with SeriesCraft"
				moveItem={mockMoveItem}
			/>
		);

		currentCard = container.querySelector('[data-testid="part-item-300"]');
		expect(currentCard.textContent).toContain('Building a Modern Plugin with SeriesCraft');
	});

	it('keeps the dynamically appended current item fully draggable for reordering', () => {
		const existingPosts = [
			{ id: 10, title: 'Chapter 1' },
			{ id: 20, title: 'Chapter 2' },
		];

		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return {
						getEntityRecords: () => existingPosts,
					};
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => 'Chapter 3 (Draft)',
						getCurrentPostId: () => 30,
					};
				}
				return {};
			});
		});

		const { container } = render(
			<PartOrderList
				seriesId={7}
				currentPostId={30}
				moveItem={mockMoveItem}
			/>
		);

		let currentCard = container.querySelector('[data-testid="part-item-30"]');
		expect(currentCard.getAttribute('draggable')).toBe('true');

		// Verify move buttons on the current item initially (last item at index 2)
		let upBtn = currentCard.querySelector('button[aria-label="Move part up"]');
		let downBtn = currentCard.querySelector('button[aria-label="Move part down"]');

		expect(upBtn.disabled).toBe(false);
		expect(downBtn.disabled).toBe(true); // last item

		fireEvent.click(upBtn);
		expect(mockMoveItem).toHaveBeenCalledWith(2, 1);

		// Move it back down to index 2
		currentCard = container.querySelector('[data-testid="part-item-30"]');
		downBtn = currentCard.querySelector('button[aria-label="Move part down"]');
		fireEvent.click(downBtn);
		expect(mockMoveItem).toHaveBeenCalledWith(1, 2);

		// Simulate drag and drop events from index 2 onto index 0
		currentCard = container.querySelector('[data-testid="part-item-30"]');
		const dataTransfer = {
			setData: jest.fn(),
			effectAllowed: '',
			dropEffect: '',
		};

		fireEvent.dragStart(currentCard, { dataTransfer });
		expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '2');

		// Drag over item 0
		const firstCard = container.querySelector('[data-testid="part-item-10"]');
		fireEvent.dragOver(firstCard, { dataTransfer });

		// Drop onto item 0
		fireEvent.drop(firstCard, { dataTransfer });
		expect(mockMoveItem).toHaveBeenCalledWith(2, 0);
	});
});
