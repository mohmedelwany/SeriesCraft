<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Database;

use SeriesCraft\Database\LifecycleSubscriber;
use SeriesCraft\Database\SchemaManager;
use SeriesCraft\Tests\Integration\IntegrationTestCase;
use wpdb;

/**
 * Integration test suite for LifecycleSubscriber.
 *
 * Verifies that WordPress entity deletions (posts and taxonomy terms)
 * trigger automatic cleanups in the custom {$wpdb->prefix}series_craft_posts table.
 */
class LifecycleSubscriberTest extends IntegrationTestCase
{
    private wpdb $wpdb;
    private string $table_name;
    private SchemaManager $schema_manager;

    /**
     * Set up test fixtures before each test execution.
     */
    protected function setUp(): void
    {
        parent::setUp();

        global $wpdb;
        $this->wpdb           = $wpdb;
        $this->table_name     = $this->wpdb->prefix . 'series_craft_posts';
        $this->schema_manager = new SchemaManager();

        // Ensure table exists with fresh state
        $this->schema_manager->create_tables();

        // Ensure 'series' taxonomy exists in WordPress test environment
        if (! taxonomy_exists('series')) {
            register_taxonomy('series', 'post');
        }
    }

    /**
     * Clean up database state after each test.
     */
    protected function tearDown(): void
    {
        if (isset($this->schema_manager)) {
            $this->schema_manager->drop_tables();
        }

        parent::tearDown();
    }

    /**
     * Test 1: Verifies that permanently deleting a WordPress post automatically removes
     * its corresponding relationship record from the custom table.
     */
    public function test_post_deletion_removes_relationship_from_custom_table(): void
    {
        // 1. Create a dummy post
        $post_id = method_exists($this, 'factory')
            ? (int) self::factory()->post->create()
            : (int) wp_insert_post([
                'post_title'  => 'Test Post for Lifecycle Cleanup',
                'post_status' => 'publish',
            ]);

        $this->assertGreaterThan(0, $post_id, 'Dummy post should be created successfully.');

        $series_id = 101;

        // 2. Insert relationship into {$wpdb->prefix}series_craft_posts
        $inserted = $this->wpdb->insert(
            $this->table_name,
            [
                'series_id'  => $series_id,
                'post_id'    => $post_id,
                'sort_order' => 1,
                'created_at' => current_time('mysql'),
            ],
            ['%d', '%d', '%d', '%s']
        );
        $this->assertSame(1, $inserted, 'Relationship record should be inserted into custom table.');

        // 3. Instantiate and register LifecycleSubscriber
        $subscriber = new LifecycleSubscriber();
        if (method_exists($subscriber, 'register')) {
            $subscriber->register();
        }

        // 4. Trigger permanent post deletion (bypass trash)
        wp_delete_post($post_id, true);

        // 5. Assert that no records exist for this post_id in the custom table
        $remaining = (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE post_id = %d",
                $post_id
            )
        );

        $this->assertSame(
            0,
            $remaining,
            "Custom table record for post_id {$post_id} should be deleted upon permanent post deletion."
        );
    }

    /**
     * Test 2: Verifies that deleting a taxonomy term in the 'series' taxonomy automatically
     * removes all associated post relationships from the custom table.
     */
    public function test_term_deletion_removes_all_associated_series_posts(): void
    {
        // 1. Create a dummy term in 'series' taxonomy
        $term_result = wp_insert_term('Test Series ' . uniqid(), 'series');
        $series_id   = is_array($term_result) && isset($term_result['term_id'])
            ? (int) $term_result['term_id']
            : 202;

        $this->assertGreaterThan(0, $series_id, 'Term ID must be greater than zero.');

        // 2. Insert multiple relationship records for this series_id
        for ($order = 1; $order <= 3; $order++) {
            $post_id = method_exists($this, 'factory')
                ? (int) self::factory()->post->create()
                : (int) wp_insert_post([
                    'post_title'  => "Series Item Post {$order}",
                    'post_status' => 'publish',
                ]);

            $this->assertGreaterThan(0, $post_id);

            $this->wpdb->insert(
                $this->table_name,
                [
                    'series_id'  => $series_id,
                    'post_id'    => $post_id,
                    'sort_order' => $order,
                    'created_at' => current_time('mysql'),
                ],
                ['%d', '%d', '%d', '%s']
            );
        }

        $count_before = (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE series_id = %d",
                $series_id
            )
        );
        $this->assertSame(3, $count_before, 'Custom table must have 3 records associated with series_id before deletion.');

        // 3. Ensure subscriber hooks are registered and active
        $subscriber = new LifecycleSubscriber();
        if (method_exists($subscriber, 'register')) {
            $subscriber->register();
        }

        // 4. Delete the term
        wp_delete_term($series_id, 'series');

        // 5. Assert that all records matching series_id are completely removed
        $count_after = (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE series_id = %d",
                $series_id
            )
        );

        $this->assertSame(
            0,
            $count_after,
            "All custom table records for series_id {$series_id} must be removed upon term deletion."
        );
    }
}
