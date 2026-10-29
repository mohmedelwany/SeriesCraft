/**
 * SeriesCraft Store Constants & Action Types.
 *
 * @package SeriesCraft\Store
 */

/**
 * Store namespace identifier.
 */
export const STORE_NAME = "series-craft/store";

/**
 * Action type constants.
 */
export const SET_SERIES = "SET_SERIES";
export const RECEIVE_SERIES_POSTS = "RECEIVE_SERIES_POSTS";
export const UPDATE_POST_ORDER = "UPDATE_POST_ORDER";
export const SET_SAVING_ORDER = "SET_SAVING_ORDER";
export const SET_SERIES_META = "SET_SERIES_META";
export const SET_ACTIVE_SERIES_ID = "SET_ACTIVE_SERIES_ID";
export const SET_NOTICE = "SET_NOTICE";
export const CLEAR_NOTICE = "CLEAR_NOTICE";

/**
 * Action types grouping map.
 */
export const ACTION_TYPES = {
  SET_SERIES,
  RECEIVE_SERIES_POSTS,
  UPDATE_POST_ORDER,
  SET_SAVING_ORDER,
  SET_SERIES_META,
  SET_ACTIVE_SERIES_ID,
  SET_NOTICE,
  CLEAR_NOTICE,
};

/**
 * Base REST API namespace.
 */
export const REST_BASE = "/series-craft/v1";

/**
 * REST API Route endpoints and builders matching Phase 3 controllers.
 */
export const API_ROUTES = {
  SERIES: `${REST_BASE}/series`,
  SERIES_CREATE: `${REST_BASE}/series`,
  SERIES_WP_TERMS: "/wp/v2/series",
  SERIES_ITEM: (id) => `${REST_BASE}/series/${id}`,
  SERIES_POSTS: (id) => `${REST_BASE}/series/${id}/posts`,
  SERIES_ORDER: (id) => `${REST_BASE}/series/${id}/order`,
  SERIES_SETTINGS: (id) => `${REST_BASE}/series/${id}/settings`,
};

/**
 * REST route helper functions for external consumption.
 *
 * @return {string} Endpoint URL.
 */
export const getSeriesRoute = () => API_ROUTES.SERIES;
export const getSeriesPostsRoute = (id) => API_ROUTES.SERIES_POSTS(id);
export const getSeriesOrderRoute = (id) => API_ROUTES.SERIES_ORDER(id);
export const getSeriesSettingsRoute = (id) => API_ROUTES.SERIES_SETTINGS(id);

export default {
  STORE_NAME,
  ACTION_TYPES,
  API_ROUTES,
  getSeriesRoute,
  getSeriesPostsRoute,
  getSeriesOrderRoute,
  getSeriesSettingsRoute,
};
