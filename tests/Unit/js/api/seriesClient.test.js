import apiFetch from '@wordpress/api-fetch';
import {
	fetchSeriesSettings,
	updateSeriesSettings,
	updateSeriesOrder,
} from '../../../../resources/js/api/seriesClient';

jest.mock('@wordpress/api-fetch');

describe('seriesClient API Service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('fetchSeriesSettings', () => {
		it('should call GET endpoint with correct path for series settings', async () => {
			const mockResponse = {
				term_id: 12,
				layout: 'media-grid',
				custom_styles: { border_color: '#333333' },
			};
			apiFetch.mockResolvedValueOnce(mockResponse);

			const result = await fetchSeriesSettings(12);

			expect(apiFetch).toHaveBeenCalledTimes(1);
			expect(apiFetch).toHaveBeenCalledWith({
				path: '/series-craft/v1/series/12/settings',
				method: 'GET',
			});
			expect(result).toEqual(mockResponse);
		});

		it('should propagate errors when fetching settings fails', async () => {
			const mockError = new Error('Failed to fetch settings');
			apiFetch.mockRejectedValueOnce(mockError);

			await expect(fetchSeriesSettings(999)).rejects.toThrow('Failed to fetch settings');
		});
	});

	describe('updateSeriesSettings', () => {
		it('should call POST endpoint with payload to update settings', async () => {
			const payload = {
				layout: 'media-list',
				custom_styles: { border_color: '#000000' },
			};
			const mockResponse = {
				success: true,
				term_id: 15,
				settings: payload,
			};
			apiFetch.mockResolvedValueOnce(mockResponse);

			const result = await updateSeriesSettings(15, payload);

			expect(apiFetch).toHaveBeenCalledTimes(1);
			expect(apiFetch).toHaveBeenCalledWith({
				path: '/series-craft/v1/series/15/settings',
				method: 'POST',
				data: payload,
			});
			expect(result).toEqual(mockResponse);
		});

		it('should throw an error when termId is missing or invalid', async () => {
			await expect(updateSeriesSettings(null, {})).rejects.toThrow('Valid series term ID is required');
			expect(apiFetch).not.toHaveBeenCalled();
		});
	});

	describe('updateSeriesOrder', () => {
		it('should call POST endpoint with ordered post IDs array', async () => {
			const postIds = [105, 101, 108];
			const mockResponse = {
				success: true,
				term_id: 20,
				updated: 3,
			};
			apiFetch.mockResolvedValueOnce(mockResponse);

			const result = await updateSeriesOrder(20, postIds);

			expect(apiFetch).toHaveBeenCalledTimes(1);
			expect(apiFetch).toHaveBeenCalledWith({
				path: '/series-craft/v1/series/20/order',
				method: 'POST',
				data: { post_ids: postIds },
			});
			expect(result).toEqual(mockResponse);
		});

		it('should throw an error when postIds is not an array', async () => {
			await expect(updateSeriesOrder(20, 'invalid')).rejects.toThrow('postIds must be an array of integers');
			expect(apiFetch).not.toHaveBeenCalled();
		});
	});
});