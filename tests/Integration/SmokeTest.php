<?php

/**
 * Example Integration Test – smoke-test the WordPress environment.
 *
 * Every class in tests/Integration/ that extends WP_UnitTestCase has full
 * access to a real WordPress installation backed by a test database.
 */

namespace SeriesCraft\Tests\Integration;

require_once __DIR__ . '/wordpress-test-stubs.php';

/**
 * WP_UnitTestCase is provided by the WordPress test library bootstrap.
 */
class SmokeTest extends \WP_UnitTestCase
{

    /**
     * Verify that WordPress core is loaded correctly in the test environment.
     */
    public function test_wordpress_is_loaded(): void
    {
        $this->assertTrue(function_exists('add_action'), 'WordPress add_action() should be available.');
        $this->assertTrue(function_exists('get_post'), 'WordPress get_post() should be available.');
    }

    /**
     * Verify the plugin was loaded (it is registered in the bootstrap via
     * `active_plugins`).
     */
    public function test_plugin_constants_are_defined(): void
    {
        $this->assertTrue(defined('SCFT_PLUGIN_VERSION'), 'SCFT_PLUGIN_VERSION should be defined.');
        $this->assertTrue(defined('SCFT_PLUGIN_DIR'), 'SCFT_PLUGIN_DIR should be defined.');
    }

    /**
     * Verify that the plugin can create a post successfully.
     */
    public function test_can_create_post(): void
    {
        $post_id = $this->factory()->post->create(['post_title' => 'Test Series Post']);

        $this->assertIsInt($post_id);
        $this->assertGreaterThan(0, $post_id);

        $post = get_post($post_id);
        $this->assertEquals('Test Series Post', $post->post_title);
    }
}
