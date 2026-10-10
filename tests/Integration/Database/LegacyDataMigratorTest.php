<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Database;

use SeriesCraft\Database\LegacyDataMigrator;
use SeriesCraft\Database\SchemaManager;
use SeriesCraft\Tests\Integration\IntegrationTestCase;
use wpdb;

/**
 * Integration test suite for LegacyDataMigrator.
 *
 * Verifies that legacy term meta ordering ('series_post_order')
 * is correctly, non-destructively, and idempotently migrated
 * into the {$wpdb->prefix}series_craft_posts table.
 */
class LegacyDataMigratorTest extends IntegrationTestCase
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
     * Helper to create a dummy post for tests.
     */
    private function create_dummy_post(string $title = 'Dummy Post'): int
    {
        return method_exists($this, 'factory')
            ? (int) self::factory()->post->create(['post_title' => $title])
            : (int) wp_insert_post([
                'post_title'  => $title,
                'post_status' => 'publish',
            ]);
    }

    /**
     * Helper to create a dummy taxonomy term in 'series'.
     */
    private function create_dummy_term(string $name = 'Test Series'): int
    {
        $term = wp_insert_term($name . ' ' . uniqid(), 'series');
        return is_array($term) && isset($term['term_id']) ? (int) $term['term_id'] : 5;
    }

    /**
     * Test 1: Verifies that legacy term meta ordering is migrated into the custom database table.
     */
    public function test_migrates_legacy_term_meta_order_to_custom_table(): void
    {
        $p1 = $this->create_dummy_post('Series Part 1');
        $p2 = $this->create_dummy_post('Series Part 2');
        $p3 = $this->create_dummy_post('Series Part 3');

        $term_id = $this->create_dummy_term('Migrated Series');

        // Store legacy comma-separated post IDs in term meta
        update_term_meta($term_id, 'series_post_order', "{$p1},{$p2},{$p3}");

        $migrator = new LegacyDataMigrator();
        $migrator->migrate();

        $rows = $this->wpdb->get_results(
            $this->wpdb->prepare(
                "SELECT post_id, sort_order FROM {$this->table_name} WHERE series_id = %d ORDER BY sort_order ASC",
                $term_id
            ),
            ARRAY_A
        );

        $this->assertCount(3, $rows, 'All 3 posts should be migrated into the custom table.');

        $this->assertSame($p1, (int) $rows[0]['post_id']);
        $this->assertSame(0, (int) $rows[0]['sort_order']);

        $this->assertSame($p2, (int) $rows[1]['post_id']);
        $this->assertSame(1, (int) $rows[1]['sort_order']);

        $this->assertSame($p3, (int) $rows[2]['post_id']);
        $this->assertSame(2, (int) $rows[2]['sort_order']);
    }

    /**
     * Test 2: Verifies that running the migration multiple times is idempotent and produces no duplicates.
     */
    public function test_migration_is_idempotent(): void
    {
        $p1 = $this->create_dummy_post('Idempotent Post 1');
        $p2 = $this->create_dummy_post('Idempotent Post 2');
        $term_id = $this->create_dummy_term('Idempotent Series');

        update_term_meta($term_id, 'series_post_order', "{$p1},{$p2}");

        $migrator = new LegacyDataMigrator();

        // First run
        $migrator->migrate();

        $count_first = (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE series_id = %d",
                $term_id
            )
        );
        $this->assertSame(2, $count_first, 'First run should insert exactly 2 records.');

        // Second run on the same state
        $migrator->migrate();

        $count_second = (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE series_id = %d",
                $term_id
            )
        );
        $this->assertSame(2, $count_second, 'Row count must remain unchanged after subsequent migration run.');
        $this->assertEmpty($this->wpdb->last_error, 'Repeated migration runs should execute without SQL errors.');
    }

    /**
     * Test 3: Verifies that empty or malformed legacy meta values are handled gracefully without errors.
     */
    public function test_handles_empty_or_malformed_legacy_data_gracefully(): void
    {
        $term_empty   = $this->create_dummy_term('Empty Series');
        $term_invalid = $this->create_dummy_term('Invalid Series');

        update_term_meta($term_empty, 'series_post_order', '');
        update_term_meta($term_invalid, 'series_post_order', 'not_a_number,,invalid,0');

        $migrator = new LegacyDataMigrator();
        $migrator->migrate();

        $count_empty = (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE series_id = %d",
                $term_empty
            )
        );
        $this->assertSame(0, $count_empty, 'Empty legacy meta should not produce table entries.');

        $count_invalid = (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE series_id = %d",
                $term_invalid
            )
        );
        $this->assertSame(0, $count_invalid, 'Malformed non-numeric legacy meta should not insert invalid rows.');
        $this->assertEmpty($this->wpdb->last_error, 'Malformed data should be skipped safely without SQL errors.');
    }

    /**
     * Test 4: Verifies that original legacy term meta is preserved post-migration as a non-destructive fallback.
     */
    public function test_legacy_data_is_preserved_post_migration(): void
    {
        $p1 = $this->create_dummy_post('Preserved Post 1');
        $p2 = $this->create_dummy_post('Preserved Post 2');
        $term_id = $this->create_dummy_term('Preserved Series');

        $original_meta = "{$p1},{$p2}";
        update_term_meta($term_id, 'series_post_order', $original_meta);

        $migrator = new LegacyDataMigrator();
        $migrator->migrate();

        $current_meta = get_term_meta($term_id, 'series_post_order', true);
        $this->assertSame(
            $original_meta,
            $current_meta,
            'Original legacy term meta must remain intact for non-destructive backwards compatibility.'
        );
    }
}
