<?php

/**
 * Bootstrap for the Integration test suite.
 *
 * Loads a real, already-installed WordPress site (installed and had the
 * plugin activated via wp-cli in docker/integration/entrypoint.sh). Tests
 * run against that live install rather than a per-run WP_UnitTestCase
 * fixture install.
 *
 * Environment variables (set via docker-compose.yml):
 *   WP_CORE_DIR – path to the installed WordPress core
 */

// ---------------------------------------------------------------------------
// 1. Composer autoloader (project classes)
// ---------------------------------------------------------------------------
// __DIR__ = tests/Integration  → dirname x2 = repo root
$autoloader = dirname(__DIR__, 2) . '/src/vendor/autoload.php';
if (file_exists($autoloader)) {
    require_once $autoloader;
}

// ---------------------------------------------------------------------------
// 2. Live WordPress install
// ---------------------------------------------------------------------------
$wp_core_dir = rtrim(getenv('WP_CORE_DIR') ?: '/tmp/wordpress', '/');

if (! file_exists($wp_core_dir . '/wp-load.php')) {
    echo "\n";
    echo "ERROR: WordPress core not found at {$wp_core_dir}.\n";
    echo "       Expected wp-load.php there.\n";
    echo "       Did entrypoint.sh run `wp core install` and\n";
    echo "       `wp plugin activate series-craft`?\n";
    echo "       Run the integration tests via:\n";
    echo "         ./bin/test-integration-matrix.sh\n";
    echo "       or set WP_CORE_DIR manually if running outside Docker.\n\n";
    exit(1);
}

// Loading wp-load.php boots WordPress fully, including any already-active
// plugins (series-craft was activated via wp-cli before PHPUnit started).
require_once $wp_core_dir . '/wp-load.php';
