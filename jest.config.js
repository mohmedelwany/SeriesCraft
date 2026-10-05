/** @type {import('jest').Config} */
module.exports = {
	// Pure Node environment — no DOM needed for utility / unit tests.
	// Swap to 'jsdom' (or '@wordpress/jest-preset-default') once block JS is written.
	testEnvironment: 'node',

	// Only pick up JS unit tests; E2E lives under tests/E2E and runs via Playwright.
	testMatch: [ '**/tests/Unit/js/**/*.test.js' ],

	// Show each individual test in the output (useful in CI logs).
	verbose: true,

	// Collect coverage when --coverage flag is passed.
	collectCoverageFrom: [ 'src/**/*.js', '!src/**/vendor/**' ],
};
