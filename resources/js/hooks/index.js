/**
 * SeriesCraft Custom React Hooks.
 *
 * Centralized hook abstractions for series taxonomy, post ordering,
 * and Gutenberg post-saving synchronization.
 *
 * @package SeriesCraft\Hooks
 */

export { useSeries, extractSeriesId } from './useSeries';
export { useSeriesPosts, computeDisplayPosts } from './useSeriesPosts';
export { useSeriesOrder } from './useSeriesOrder';
export {
	usePostSavingSync,
	findSeriesBlocks,
	findSeriesListBlocks,
	removeCoreTaxonomyPanel,
} from './usePostSavingSync';
export { useSeriesSettings } from './useSeriesSettings';
