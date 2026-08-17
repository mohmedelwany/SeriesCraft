import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration.
 *
 * @see https://playwright.dev/docs/test-configuration
 *
 * The WordPress test environment is started by `npx wp-env start` before
 * the E2E suite runs. The base URL matches wp-env's default port.
 */
export default defineConfig( {
	testDir: './tests/E2E',
	testMatch: '**/*.spec.js',

	// Increase test timeout to 60s for WordPress environment setup/navigation
	timeout: 60000,
	expect: {
		timeout: 10000,
	},

	// Fail fast in CI; keep running locally so you see all failures.
	fullyParallel: false,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,

	// Rich HTML report saved to playwright-report/; opened automatically locally.
	reporter: process.env.CI ? 'github' : 'html',

	use: {
		// wp-env default URL.
		baseURL: process.env.WP_BASE_URL ?? 'http://localhost:8888',

		// Increase default navigation timeout
		navigationTimeout: 30000,
		actionTimeout: 15000,

		// Capture trace on first retry so you always have evidence.
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ] },
		},
	],
} );
