import * as actions from '../../../../resources/js/store/actions';
import { ACTION_TYPES } from '../../../../resources/js/store/constants';
import * as seriesClient from '../../../../resources/js/api/seriesClient';

jest.mock('../../../../resources/js/api/seriesClient');

describe('Series Store Actions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Synchronous Action Creators', () => {
		it('setSeriesId should create SET_SERIES_ID action', () => {
			const action = actions.setSeriesId(15);
			expect(action).toEqual({
				type: ACTION_TYPES.SET_SERIES_ID,
				seriesId: 15,
			});
		});

		it('setSeriesSettings should create SET_SERIES_SETTINGS action', () => {
			const settings = { layout: 'grid' };
			const action = actions.setSeriesSettings(settings);
			expect(action).toEqual({
				type: ACTION_TYPES.SET_SERIES_SETTINGS,
				settings,
			});
		});

		it('updateSetting should create UPDATE_SETTING action', () => {
			const action = actions.updateSetting('layout', 'media-list');
			expect(action).toEqual({
				type: ACTION_TYPES.UPDATE_SETTING,
				key: 'layout',
				value: 'media-list',
			});
		});

		it('setPostsOrder should create SET_POSTS_ORDER action', () => {
			const postIds = [1, 2, 3];
			const action = actions.setPostsOrder(postIds);
			expect(action).toEqual({
				type: ACTION_TYPES.SET_POSTS_ORDER,
				postIds,
			});
		});
	});

	describe('Asynchronous Thunk Actions', () => {
		it('fetchSeries should call API and dispatch setSeriesSettings on success', async () => {
			const mockSettings = { layout: 'list' };
			seriesClient.fetchSeriesSettings.mockResolvedValueOnce(mockSettings);

			const dispatch = jest.fn();
			await actions.fetchSeries(10)({ dispatch });

			expect(seriesClient.fetchSeriesSettings).toHaveBeenCalledWith(10);
			expect(dispatch).toHaveBeenCalledWith({
				type: ACTION_TYPES.SET_SERIES_SETTINGS,
				settings: mockSettings,
			});
		});

		it('saveSettings should toggle isSaving flag and persist payload', async () => {
			const settings = { layout: 'grid' };
			seriesClient.updateSeriesSettings.mockResolvedValueOnce({ success: true });

			const dispatch = jest.fn();
			await actions.saveSettings(10, settings)({ dispatch });

			expect(dispatch).toHaveBeenCalledWith({
				type: ACTION_TYPES.SET_IS_SAVING,
				isSaving: true,
			});
			expect(seriesClient.updateSeriesSettings).toHaveBeenCalledWith(10, settings);
			expect(dispatch).toHaveBeenCalledWith({
				type: ACTION_TYPES.SET_IS_SAVING,
				isSaving: false,
			});
		});

		it('savePostsOrder should toggle isSaving flag and persist order', async () => {
			const postIds = [101, 102];
			seriesClient.updateSeriesOrder.mockResolvedValueOnce({ success: true });

			const dispatch = jest.fn();
			await actions.savePostsOrder(10, postIds)({ dispatch });

			expect(dispatch).toHaveBeenCalledWith({
				type: ACTION_TYPES.SET_IS_SAVING,
				isSaving: true,
			});
			expect(seriesClient.updateSeriesOrder).toHaveBeenCalledWith(10, postIds);
			expect(dispatch).toHaveBeenCalledWith({
				type: ACTION_TYPES.SET_IS_SAVING,
				isSaving: false,
			});
		});
	});
});