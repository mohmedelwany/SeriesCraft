<?php
/**
 * Bootstrap for the Integration test suite.
 *
 * Requires the WordPress test library, which is installed inside the Docker
 * container by docker/integration/install-wp-tests.sh.
 *
 * Environment variables (set via docker-compose.yml):
 *   WP_TESTS_DIR – path to the downloaded wordpress-tests-lib
 *   WP_CORE_DIR  – path to the WordPress core source
 */

// ---------------------------------------------------------------------------
// 1. Composer autoloader (project classes)
// ---------------------------------------------------------------------------
// __DIR__ = tests/Integration  → dirname x2 = repo root
$autoloader = dirname( __DIR__, 2 ) . '/src/vendor/autoload.php';
if ( file_exists( $autoloader ) ) {
    require_once $autoloader;
}

// ---------------------------------------------------------------------------
// 2. WordPress test library
// ---------------------------------------------------------------------------
$wp_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $wp_tests_dir || ! is_dir( $wp_tests_dir ) ) {
    echo "\n";
    echo "ERROR: WP_TESTS_DIR is not set or does not exist.\n";
    echo "       Expected path: " . ( $wp_tests_dir ?: '(empty)' ) . "\n";
    echo "       Run the integration tests via:\n";
    echo "         ./bin/test-integration-matrix.sh\n";
    echo "       or set WP_TESTS_DIR manually if running outside Docker.\n\n";
    exit( 1 );
}

// Give the WP test bootstrap the plugin file to load automatically.
$GLOBALS['wp_tests_options'] = [
    'active_plugins' => [ 'series-craft/series-craft.php' ],
];

// Required since WP 6.2: tell the WP bootstrap where PHPUnit Polyfills live.
// The library is installed in /app/vendor (from docker/integration/composer.json).
if ( ! defined( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH' ) ) {
    define( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH', dirname( __DIR__, 2 ) . '/vendor/yoast/phpunit-polyfills' );
}

// Load the WP test bootstrap (this sets up the DB and loads WP core).
require_once rtrim( $wp_tests_dir, '/' ) . '/includes/bootstrap.php';
