/**
 * @jest-environment jsdom
 *
 * Tests for Editor Components and Sidebar Exports.
 */

jest.mock('@wordpress/plugins', () => ({
	registerPlugin: jest.fn(),
}));

jest.mock('@wordpress/dom-ready', () => jest.fn((cb) => cb && cb()));

jest.mock('@wordpress/blocks', () => ({
	createBlock: jest.fn(),
}));

jest.mock('@wordpress/editor', () => ({
	PluginDocumentSettingPanel: () => null,
}));

jest.mock('@wordpress/components', () => ({
	Button: () => null,
	SelectControl: () => null,
}));

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
	useDispatch: jest.fn(),
	dispatch: jest.fn(),
}));

import SeriesSelector from '../../../../resources/js/editor/components/SeriesSelector';
import DraggableItem from '../../../../resources/js/editor/components/DraggableItem';
import LayoutVariantSelector from '../../../../resources/js/editor/components/LayoutVariantSelector';
import * as EditorComponents from '../../../../resources/js/editor/components';

import ActualDefaultSidebar, {
	SeriesDocumentSettingsPanel,
	removeCoreTaxonomyPanel,
	findSeriesBlocks,
	findSeriesListBlocks,
} from '../../../../resources/js/editor/sidebar';

describe('Editor Components & Sidebar Exports', () => {
	describe('Editor Components barrel exports', () => {
		test('exports DraggableItem, LayoutVariantSelector, and SeriesSelector', () => {
			expect(EditorComponents.DraggableItem).toBe(DraggableItem);
			expect(EditorComponents.LayoutVariantSelector).toBe(LayoutVariantSelector);
			expect(EditorComponents.SeriesSelector).toBe(SeriesSelector);
		});
	});

	describe('Editor Sidebar canonical exports', () => {
		test('exports SeriesDocumentSettingsPanel as default and named export', () => {
			expect(ActualDefaultSidebar).toBeDefined();
			expect(ActualDefaultSidebar).toBe(SeriesDocumentSettingsPanel);
		});

		test('exports block finding and panel removal helpers', () => {
			expect(typeof removeCoreTaxonomyPanel).toBe('function');
			expect(typeof findSeriesBlocks).toBe('function');
			expect(findSeriesListBlocks).toBe(findSeriesBlocks);
		});
	});
});
