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

describe('PartOrderList Component', () => {
	const mockMoveItem = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns null when seriesId is null or missing', () => {
		const { container } = render(
			<PartOrderList
				seriesId={null}
				moveItem={mockMoveItem}
			/>
		);

		expect(container.firstChild).toBeNull();
	});

	it('renders empty message when no posts belong to series', () => {
		wpData.useSelect.mockImplementation((callback) => {
			return callback(() => ({
				getEntityRecords: () => [],
			}));
		});

		render(
			<PartOrderList
				seriesId={5}
				moveItem={mockMoveItem}
			/>
		);

		expect(screen.getByText('Part Order')).toBeDefined();
		expect(screen.getByText('No posts in this series yet.')).toBeDefined();
	});

	it('renders parts list in order and highlights current post', () => {
		const mockPosts = [
			{ id: 101, title: 'Chapter 1: Fundamentals' },
			{ id: 102, title: { rendered: 'Chapter 2: Advanced' } },
		];

		wpData.useSelect.mockImplementation((callback) => {
			return callback(() => ({
				getEntityRecords: () => mockPosts,
			}));
		});

		const { container } = render(
			<PartOrderList
				seriesId={5}
				currentPostId={102}
				orderedPostIds={[101, 102]}
				moveItem={mockMoveItem}
			/>
		);

		expect(screen.getByText('2 parts')).toBeDefined();

		const card1 = container.querySelector('[data-testid="part-item-101"]');
		const card2 = container.querySelector('[data-testid="part-item-102"]');

		expect(card1).not.toBeNull();
		expect(card2).not.toBeNull();

		expect(card1.textContent).toContain('Part 1');
		expect(card1.textContent).toContain('Chapter 1: Fundamentals');
		expect(card1.classList.contains('is-current')).toBe(false);

		expect(card2.textContent).toContain('Part 2');
		expect(card2.textContent).toContain('Chapter 2: Advanced');
		expect(card2.classList.contains('is-current')).toBe(true);
		expect(card2.textContent).toContain('Current');
	});

	it('triggers moveItem and reactively swaps items in DOM when clicking move buttons', () => {
		const mockPosts = [
			{ id: 101, title: 'Part One' },
			{ id: 102, title: 'Part Two' },
			{ id: 103, title: 'Part Three' },
		];
		const mockOnOrderChange = jest.fn();

		wpData.useSelect.mockImplementation((callback) => {
			return callback(() => ({
				getEntityRecords: () => mockPosts,
			}));
		});

		const { container } = render(
			<PartOrderList
				seriesId={5}
				currentPostId={101}
				orderedPostIds={[101, 102, 103]}
				moveItem={mockMoveItem}
				onOrderChange={mockOnOrderChange}
			/>
		);

		// Initial assertions
		let cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards).toHaveLength(3);
		expect(cards[0].getAttribute('data-testid')).toBe('part-item-101');
		expect(cards[0].textContent).toContain('Part 1');
		expect(cards[1].getAttribute('data-testid')).toBe('part-item-102');
		expect(cards[1].textContent).toContain('Part 2');
		expect(cards[2].getAttribute('data-testid')).toBe('part-item-103');
		expect(cards[2].textContent).toContain('Part 3');

		const firstUpBtn = cards[0].querySelector('button[aria-label="Move part up"]');
		const firstDownBtn = cards[0].querySelector('button[aria-label="Move part down"]');
		const lastUpBtn = cards[2].querySelector('button[aria-label="Move part up"]');
		const lastDownBtn = cards[2].querySelector('button[aria-label="Move part down"]');

		// Up is disabled for first item; Down is disabled for last item
		expect(firstUpBtn.disabled).toBe(true);
		expect(firstDownBtn.disabled).toBe(false);
		expect(lastUpBtn.disabled).toBe(false);
		expect(lastDownBtn.disabled).toBe(true);

		// Click down on Part 101 (moves index 0 -> 1)
		fireEvent.click(firstDownBtn);
		expect(mockMoveItem).toHaveBeenCalledWith(0, 1);
		expect(mockOnOrderChange).toHaveBeenCalledWith([102, 101, 103]);

		// Verify DOM reactively updated immediately
		cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards[0].getAttribute('data-testid')).toBe('part-item-102');
		expect(cards[0].textContent).toContain('Part 1');
		expect(cards[0].querySelector('button[aria-label="Move part up"]').disabled).toBe(true);

		expect(cards[1].getAttribute('data-testid')).toBe('part-item-101');
		expect(cards[1].textContent).toContain('Part 2');
		expect(cards[1].querySelector('button[aria-label="Move part up"]').disabled).toBe(false);
		expect(cards[1].querySelector('button[aria-label="Move part down"]').disabled).toBe(false);

		// Click up on Part 101 (moves index 1 -> 0)
		const movedUpBtn = cards[1].querySelector('button[aria-label="Move part up"]');
		fireEvent.click(movedUpBtn);
		expect(mockMoveItem).toHaveBeenCalledWith(1, 0);
		expect(mockOnOrderChange).toHaveBeenCalledWith([101, 102, 103]);

		// Verify DOM reactively returned Part 101 to first position
		cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards[0].getAttribute('data-testid')).toBe('part-item-101');
		expect(cards[0].textContent).toContain('Part 1');
		expect(cards[1].getAttribute('data-testid')).toBe('part-item-102');
		expect(cards[1].textContent).toContain('Part 2');
	});

	it('handles HTML5 drag and drop with draggable={true} and event.preventDefault on dragOver', () => {
		const mockPosts = [
			{ id: 101, title: 'Chapter 1' },
			{ id: 102, title: 'Chapter 2' },
			{ id: 103, title: 'Chapter 3' },
		];
		const mockOnOrderChange = jest.fn();

		wpData.useSelect.mockImplementation((callback) => {
			return callback(() => ({
				getEntityRecords: () => mockPosts,
			}));
		});

		const { container } = render(
			<PartOrderList
				seriesId={5}
				orderedPostIds={[101, 102, 103]}
				moveItem={mockMoveItem}
				onOrderChange={mockOnOrderChange}
			/>
		);

		let cards = container.querySelectorAll('.sc-draggable-card');

		// 1. Ensure list items have draggable={true} explicitly set
		cards.forEach((card) => {
			expect(card.getAttribute('draggable')).toBe('true');
		});

		const dataTransfer = {
			setData: jest.fn(),
			getData: jest.fn().mockReturnValue('2'),
			effectAllowed: '',
			dropEffect: '',
		};

		// 2. Drag start on third item (index 2)
		fireEvent.dragStart(cards[2], { dataTransfer });
		expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '2');
		expect(cards[2].classList.contains('is-dragging')).toBe(true);

		// 3. Drag over first item (index 0) - check preventDefault is called
		const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
		const preventDefaultSpy = jest.spyOn(dragOverEvent, 'preventDefault');
		cards[0].dispatchEvent(dragOverEvent);
		expect(preventDefaultSpy).toHaveBeenCalled();

		// 4. Drop onto first item (index 0)
		fireEvent.drop(cards[0], { dataTransfer });
		expect(mockMoveItem).toHaveBeenCalledWith(2, 0);
		expect(mockOnOrderChange).toHaveBeenCalledWith([103, 101, 102]);

		// 5. Verify reactive DOM reordering
		cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards[0].getAttribute('data-testid')).toBe('part-item-103');
		expect(cards[0].textContent).toContain('Part 1');
		expect(cards[1].getAttribute('data-testid')).toBe('part-item-101');
		expect(cards[1].textContent).toContain('Part 2');
		expect(cards[2].getAttribute('data-testid')).toBe('part-item-102');
		expect(cards[2].textContent).toContain('Part 3');
	});

	it('seamlessly reorders dynamically appended current post with draft ID and dataTransfer fallback', () => {
		const existingPosts = [
			{ id: 201, title: 'Post A' },
			{ id: 202, title: 'Post B' },
		];
		const mockOnOrderChange = jest.fn();

		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return { getEntityRecords: () => existingPosts };
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => 'Unsaved Draft Post',
						getCurrentPostId: () => 'draft-temp-99',
					};
				}
				return {};
			});
		});

		const { container } = render(
			<PartOrderList
				seriesId={8}
				currentPostId="draft-temp-99"
				currentPostTitle="Unsaved Draft Post"
				moveItem={mockMoveItem}
				onOrderChange={mockOnOrderChange}
			/>
		);

		let cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards).toHaveLength(3);

		// Draft item is at index 2 (Part 3)
		const draftCard = container.querySelector('[data-testid="part-item-draft-temp-99"]');
		expect(draftCard).not.toBeNull();
		expect(draftCard.textContent).toContain('Part 3');
		expect(draftCard.textContent).toContain('Current');

		// Test move up button on draft item
		const upBtn = draftCard.querySelector('button[aria-label="Move part up"]');
		fireEvent.click(upBtn);
		expect(mockMoveItem).toHaveBeenCalledWith(2, 1);
		expect(mockOnOrderChange).toHaveBeenCalledWith([201, 'draft-temp-99', 202]);

		// Verify draft is now at index 1 (Part 2)
		cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards[1].getAttribute('data-testid')).toBe('part-item-draft-temp-99');
		expect(cards[1].textContent).toContain('Part 2');

		// Test drag and drop using dataTransfer fallback (when draggedIndex is cleared)
		const dataTransfer = {
			setData: jest.fn(),
			getData: jest.fn((format) => (format === 'text/plain' ? '1' : null)),
			effectAllowed: '',
			dropEffect: '',
		};

		// Drop item 1 onto item 0
		fireEvent.drop(cards[0], { dataTransfer });
		expect(mockMoveItem).toHaveBeenCalledWith(1, 0);
		expect(mockOnOrderChange).toHaveBeenCalledWith(['draft-temp-99', 201, 202]);

		// Verify draft is now at index 0 (Part 1)
		cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards[0].getAttribute('data-testid')).toBe('part-item-draft-temp-99');
		expect(cards[0].textContent).toContain('Part 1');
	});

	it('resets local order when seriesId changes', () => {
		const series1Posts = [
			{ id: 1, title: 'S1 Post 1' },
			{ id: 2, title: 'S1 Post 2' },
		];
		const series2Posts = [
			{ id: 10, title: 'S2 Post 1' },
			{ id: 20, title: 'S2 Post 2' },
		];

		wpData.useSelect.mockImplementation((callback) => {
			return callback(() => ({
				getEntityRecords: () => series1Posts,
			}));
		});

		const { container, rerender } = render(
			<PartOrderList
				seriesId={1}
				orderedPostIds={[1, 2]}
				moveItem={mockMoveItem}
			/>
		);

		// Reorder series 1 items
		let cards = container.querySelectorAll('.sc-draggable-card');
		const downBtn = cards[0].querySelector('button[aria-label="Move part down"]');
		fireEvent.click(downBtn);

		cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards[0].getAttribute('data-testid')).toBe('part-item-2');

		// Switch to series 2
		wpData.useSelect.mockImplementation((callback) => {
			return callback(() => ({
				getEntityRecords: () => series2Posts,
			}));
		});

		rerender(
			<PartOrderList
				seriesId={2}
				orderedPostIds={[10, 20]}
				moveItem={mockMoveItem}
			/>
		);

		cards = container.querySelectorAll('.sc-draggable-card');
		expect(cards[0].getAttribute('data-testid')).toBe('part-item-10');
		expect(cards[1].getAttribute('data-testid')).toBe('part-item-20');
	});
});
