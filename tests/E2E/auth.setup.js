import { test as setup } from '@playwright/test';
import { loginToWordPress, activatePluginViaBrowser } from './helpers/wordpress.js';

const authFile = 'playwright/.auth/user.json';

setup( 'authenticate', async ( { page } ) => {
	await loginToWordPress( page );
	await activatePluginViaBrowser( page, 'Series Craft' );
	await page.context().storageState( { path: authFile } );
} );
