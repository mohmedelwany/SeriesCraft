/**
 * SeriesCraft Centralized Data Store.
 *
 * Coordinates state for Series taxonomy, post ordering, and per-series styling settings.
 *
 * @package SeriesCraft\Store
 */

import { createReduxStore, register, registerStore, select } from '@wordpress/data';
import { STORE_NAME } from './constants';
import reducer from './reducer';
import * as actions from './actions';
import * as selectors from './selectors';
import * as resolvers from './resolvers';

/**
 * Store configuration descriptor.
 */
export const storeConfig = {
	reducer,
	actions,
	selectors,
	resolvers,
};

/**
 * Redux store instance for SeriesCraft.
 */
export const store = createReduxStore( STORE_NAME, storeConfig );

// Register the store if not already registered in the active data registry
if ( ! select( STORE_NAME ) ) {
	if ( typeof register === 'function' ) {
		register( store );
	} else if ( typeof registerStore === 'function' ) {
		registerStore( STORE_NAME, storeConfig );
	}
}

export { STORE_NAME };
export * from './constants';
export * from './actions';
export * from './selectors';
export { default as reducer } from './reducer';
export { default as resolvers } from './resolvers';
export default store;
