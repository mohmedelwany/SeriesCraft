<?php
/**
 * Hello-World unit test — PHP tier.
 *
 * Verifies the test pipeline is wired correctly WITHOUT requiring a WordPress
 * environment. Uses only the Composer autoloader (src/vendor/autoload.php).
 *
 * Add real unit tests for individual classes here as the plugin grows.
 */

namespace SeriesCraft\Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Plugin bootstrap sanity checks.
 */
class PluginBootstrapTest extends TestCase {

    /**
     * Confirms the main plugin file exists at the expected path.
     */
    public function test_plugin_entry_file_exists(): void {
        $plugin_file = dirname( __DIR__, 3 ) . '/src/series-craft.php';
        self::assertFileExists( $plugin_file, 'series-craft.php must exist in src/' );
    }

    /**
     * Confirms the Composer autoloader was generated for the plugin.
     */
    public function test_composer_autoloader_exists(): void {
        $autoloader = dirname( __DIR__, 3 ) . '/src/vendor/autoload.php';
        self::assertFileExists( $autoloader, 'src/vendor/autoload.php must exist (run composer install inside src/)' );
    }

    /**
     * Confirms we are running on a supported PHP version.
     */
    public function test_php_version_is_supported(): void {
        self::assertTrue(
            version_compare( PHP_VERSION, '7.4', '>=' ),
            'PHP 7.4 or higher is required. Running: ' . PHP_VERSION
        );
    }
}
