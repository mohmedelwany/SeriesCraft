import { registerStore } from '@wordpress/data';
import { STORE_NAME, storeConfig } from '../../../../resources/js/store';

jest.mock('@wordpress/data', () => ({
	registerStore: jest.fn(),
	createReduxStore: jest.fn((name, config) => ({ name, ...config })),
}));

describe('Series Store Registration', () => {
	it('should register store with correct store name and configuration', () => {
		expect(STORE_NAME).toBe('series-craft/series');
		expect(storeConfig).toBeDefined();
		expect(typeof storeConfig.reducer).toBe('function');
		expect(storeConfig.actions).toBeDefined();
		expect(storeConfig.selectors).toBeDefined();
	});
});