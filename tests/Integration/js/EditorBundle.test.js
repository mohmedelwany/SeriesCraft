/**
 * @jest-environment jsdom
 */

const mockRegisterPlugin = jest.fn();
const mockRegisterBlockType = jest.fn();
const mockRegisterStore = jest.fn();
const mockRegister = jest.fn();
const mockSelect = jest.fn(() => null);

jest.mock('@wordpress/plugins', () => ({
	registerPlugin: mockRegisterPlugin,
}));

jest.mock('@wordpress/blocks', () => ({
	registerBlockType: mockRegisterBlockType,
	createBlock: jest.fn(),
}));

jest.mock('@wordpress/data', () => ({
	createReduxStore: jest.fn((name, config) => ({ name, ...config })),
	register: mockRegister,
	registerStore: mockRegisterStore,
	select: mockSelect,
	dispatch: jest.fn(() => ({})),
	useSelect: jest.fn(),
	useDispatch: jest.fn(() => ({})),
}));

jest.mock('@wordpress/dom-ready', () => jest.fn((cb) => cb && cb()));

jest.mock('@wordpress/editor', () => ({
	PluginDocumentSettingPanel: () => null,
	PluginSidebar: () => null,
	PluginSidebarMoreMenuItem: () => null,
}));

jest.mock('@wordpress/block-editor', () => ({
	useBlockProps: jest.fn(() => ({})),
	InspectorControls: () => null,
	BlockControls: () => null,
}));

jest.mock('@wordpress/components', () => ({
	PanelBody: () => null,
	Button: () => null,
	SelectControl: () => null,
	RangeControl: () => null,
	Spinner: () => null,
	ToolbarGroup: () => null,
	ToolbarButton: () => null,
	Modal: () => null,
}));

jest.mock('@wordpress/server-side-render', () => () => null);

describe('Editor Bundle Integration (resources/js/editor.js)', () => {
	beforeAll(() => {
		jest.isolateModules(() => {
			require('../../../resources/js/editor');
		});
	});

	test('Test 1: boots and executes entire editor bundle without throwing unhandled exceptions', () => {
		expect(mockRegisterBlockType).toHaveBeenCalled();
		expect(mockRegisterPlugin).toHaveBeenCalled();
	});

	test('Test 2: registers the seriescraft/series-list block with metadata, edit, and save', () => {
		expect(mockRegisterBlockType).toHaveBeenCalledWith(
			'seriescraft/series-list',
			expect.objectContaining({
				name: 'seriescraft/series-list',
				edit: expect.any(Function),
				save: expect.any(Function),
			})
		);
	});

	test('Test 3: registers the document settings sidebar plugin', () => {
		expect(mockRegisterPlugin).toHaveBeenCalledWith(
			'seriescraft-document-settings',
			expect.objectContaining({
				render: expect.any(Function),
				icon: 'list-view',
			})
		);
	});

	test('Test 4: registers the series settings sidebar plugin', () => {
		expect(mockRegisterPlugin).toHaveBeenCalledWith(
			'series-craft-settings',
			expect.objectContaining({
				render: expect.any(Function),
				icon: 'admin-generic',
			})
		);
	});

	test('Test 5: registers the centralized SeriesCraft Redux data store', () => {
		const isRegistered = mockRegister.mock.calls.length > 0 || mockRegisterStore.mock.calls.length > 0;
		expect(isRegistered).toBe(true);
	});
});
