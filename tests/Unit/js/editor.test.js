/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('@wordpress/plugins', () => ({
	registerPlugin: jest.fn(),
}));

jest.mock('@wordpress/editor', () => ({
	PluginDocumentSettingPanel: ({ title, children }) => (
		<div data-testid="document-setting-panel">
			<h2>{title}</h2>
			{children}
		</div>
	),
}));

jest.mock('../../../resources/js/store', () => ({}));

jest.mock('../../../resources/js/components/SeriesSidebar', () => {
	return function MockSeriesSidebar({ seriesList, initialSeriesId, currentPostId }) {
		return (
			<div data-testid="mock-series-sidebar">
				<span data-testid="count">{seriesList.length}</span>
				<span data-testid="active-id">{String(initialSeriesId)}</span>
				<span data-testid="current-post-id">{String(currentPostId)}</span>
			</div>
		);
	};
});

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
}));

import * as wpPlugins from '@wordpress/plugins';
import * as wpData from '@wordpress/data';
import { SeriesCraftEditorPlugin } from '../../../resources/js/editor';

describe('Editor Entry Point Integration', () => {
	it('registers the editor plugin via registerPlugin', () => {
		expect(wpPlugins.registerPlugin).toHaveBeenCalledWith('seriescraft-editor', {
			render: SeriesCraftEditorPlugin,
			icon: 'category',
		});
	});

	it('renders PluginDocumentSettingPanel with mapped taxonomy terms and current post series ID', () => {
		wpData.useSelect.mockImplementation((callback) => {
			return callback((storeName) => {
				if (storeName === 'core') {
					return {
						getEntityRecords: () => [
							{ id: 5, name: 'Architecture 101' },
							{ id: 8, name: 'Testing Patterns' },
						],
					};
				}
				if (storeName === 'core/editor') {
					return {
						getEditedPostAttribute: () => [5],
						getCurrentPostId: () => 123,
					};
				}
				return {};
			});
		});

		const { container } = render(<SeriesCraftEditorPlugin />);

		const panel = container.querySelector('[data-testid="document-setting-panel"]');
		expect(panel).not.toBeNull();
		expect(panel.querySelector('h2').textContent).toBe('SeriesCraft');

		const countSpan = container.querySelector('[data-testid="count"]');
		expect(countSpan.textContent).toBe('2');

		const activeIdSpan = container.querySelector('[data-testid="active-id"]');
		expect(activeIdSpan.textContent).toBe('5');

		const postIdSpan = container.querySelector('[data-testid="current-post-id"]');
		expect(postIdSpan.textContent).toBe('123');
	});
});