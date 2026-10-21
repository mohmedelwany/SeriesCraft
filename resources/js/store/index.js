/**
 * SeriesCraft WordPress Data Store Registration.
 */

import { registerStore, createReduxStore } from '@wordpress/data';
import { STORE_NAME } from './constants';
import reducer from './reducer';
import * as actions from './actions';
import * as selectors from './selectors';

/**
 * Redux store definition object.
 */
export const storeConfig = {
	reducer,
	actions,
	selectors,
};

export const store = createReduxStore ? createReduxStore( STORE_NAME, storeConfig ) : null;

// Register with WordPress data registry
if ( registerStore ) {
	registerStore( STORE_NAME, storeConfig );
}

export { STORE_NAME };
export default store;