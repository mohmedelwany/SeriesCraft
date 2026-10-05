import { test as setup } from '@playwright/test';
import { loginToWordPress } from './helpers/wordpress.js';

const authFile = 'playwright/.auth/user.json';

setup( 'authenticate', async ( { page } ) => {
	await loginToWordPress( page );
	await page.context().storageState( { path: authFile } );
} );
