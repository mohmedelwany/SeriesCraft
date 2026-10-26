/**
 * @jest-environment jsdom
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

import CompatSeriesSelector from '../../../../resources/js/components/SeriesSelector';
import ActualSeriesSelector from '../../../../resources/js/sidebar/SeriesSelector';

import CompatDefaultSidebar, {
	SeriesDocumentSettingsPanel as CompatSettingsPanel,
	removeCoreTaxonomyPanel as CompatRemovePanel,
	findSeriesBlocks as CompatFindBlocks,
	findSeriesListBlocks as CompatFindListBlocks,
} from '../../../../resources/js/components/SeriesSidebar';

import ActualDefaultSidebar, {
	SeriesDocumentSettingsPanel as ActualSettingsPanel,
	removeCoreTaxonomyPanel as ActualRemovePanel,
	findSeriesBlocks as ActualFindBlocks,
	findSeriesListBlocks as ActualFindListBlocks,
} from '../../../../resources/js/sidebar';

describe('Compatibility Exports', () => {
	describe('SeriesSelector compatibility facade', () => {
		test('re-exports the identical default component from resources/js/sidebar/SeriesSelector', () => {
			expect(CompatSeriesSelector).toBeDefined();
			expect(CompatSeriesSelector).toBe(ActualSeriesSelector);
		});
	});

	describe('SeriesSidebar compatibility facade', () => {
		test('re-exports the identical default export from resources/js/sidebar', () => {
			expect(CompatDefaultSidebar).toBeDefined();
			expect(CompatDefaultSidebar).toBe(ActualDefaultSidebar);
			expect(CompatDefaultSidebar).toBe(ActualSettingsPanel);
		});

		test('re-exports identical named symbols with strict reference equality', () => {
			expect(CompatSettingsPanel).toBe(ActualSettingsPanel);
			expect(CompatRemovePanel).toBe(ActualRemovePanel);
			expect(CompatFindBlocks).toBe(ActualFindBlocks);
			expect(CompatFindListBlocks).toBe(ActualFindListBlocks);
		});

		test('findSeriesListBlocks alias matches findSeriesBlocks', () => {
			expect(CompatFindListBlocks).toBe(CompatFindBlocks);
		});
	});
});
