<?php

/**
 * Example Integration Test – smoke-test the WordPress environment.
 *
 * Runs against a real, already-installed WordPress site with the plugin
 * activated via wp-cli (see docker/integration/entrypoint.sh). Since there's
 * no per-test DB rollback here, tests that create data should clean up
 * after themselves.
 */

namespace SeriesCraft\Tests\Integration;

use PHPUnit\Framework\TestCase;

class SmokeTest extends TestCase
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
     * Verify the plugin was activated (via wp-cli in entrypoint.sh).
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
        $post_id = wp_insert_post([
            'post_title'  => 'Test Series Post',
            'post_status' => 'publish',
        ]);

        $this->assertIsInt($post_id);
        $this->assertGreaterThan(0, $post_id);

        $post = get_post($post_id);
        $this->assertEquals('Test Series Post', $post->post_title);

        // Clean up: no per-test DB rollback in this model.
        wp_delete_post($post_id, true);
    }
}
