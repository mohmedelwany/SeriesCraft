<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Database;

use SeriesCraft\Database\SchemaManager;
use SeriesCraft\Tests\Integration\IntegrationTestCase;
use wpdb;

/**
 * Integration test suite for SchemaManager.
 *
 * Verifies table creation, physical column definitions,
 * index registrations, and composite primary key constraint enforcement.
 */
class SchemaManagerTest extends IntegrationTestCase
{
    private wpdb $wpdb;
    private string $table_name;
    private SchemaManager $schema_manager;

    /**
     * Set up each test fixture with a clean database state.
     */
    protected function setUp(): void
    {
        parent::setUp();

        global $wpdb;
        $this->wpdb           = $wpdb;
        $this->table_name     = $this->wpdb->prefix . 'series_craft_posts';
        $this->schema_manager = new SchemaManager();

        // Ensure table does not exist prior to test execution
        $this->schema_manager->drop_tables();
    }

    /**
     * Clean up and drop the test table after each test to ensure isolation.
     */
    protected function tearDown(): void
    {
        if (isset($this->schema_manager)) {
            $this->schema_manager->drop_tables();
        }

        parent::tearDown();
    }

    /**
     * Test 1: Verifies that creating tables executes successfully and creates the expected database table.
     */
    public function test_creates_table_successfully(): void
    {
        $this->schema_manager->create_tables();

        $table = $this->wpdb->get_var(
            $this->wpdb->prepare('SHOW TABLES LIKE %s', $this->table_name)
        );

        $this->assertSame(
            $this->table_name,
            $table,
            "Table {$this->table_name} should exist in the database."
        );
    }

    /**
     * Test 2: Verifies that table columns match physical schema specifications:
     * - series_id: bigint unsigned
     * - post_id: bigint unsigned
     * - sort_order: int
     * - created_at: datetime
     */
    public function test_table_has_expected_column_structure(): void
    {
        $this->schema_manager->create_tables();

        $raw_columns = $this->wpdb->get_results("DESCRIBE {$this->table_name}", ARRAY_A);
        $this->assertNotEmpty($raw_columns, "DESCRIBE {$this->table_name} must return column definitions.");

        $columns = [];
        foreach ($raw_columns as $column) {
            $columns[$column['Field']] = $column;
        }

        // Verify column presence
        $this->assertArrayHasKey('series_id', $columns, "Column 'series_id' is missing.");
        $this->assertArrayHasKey('post_id', $columns, "Column 'post_id' is missing.");
        $this->assertArrayHasKey('sort_order', $columns, "Column 'sort_order' is missing.");
        $this->assertArrayHasKey('created_at', $columns, "Column 'created_at' is missing.");

        // series_id (bigint unsigned)
        $series_id_type = strtolower((string) $columns['series_id']['Type']);
        $this->assertStringContainsString('bigint', $series_id_type, "'series_id' must be bigint.");
        $this->assertStringContainsString('unsigned', $series_id_type, "'series_id' must be unsigned.");

        // post_id (bigint unsigned)
        $post_id_type = strtolower((string) $columns['post_id']['Type']);
        $this->assertStringContainsString('bigint', $post_id_type, "'post_id' must be bigint.");
        $this->assertStringContainsString('unsigned', $post_id_type, "'post_id' must be unsigned.");

        // sort_order (int)
        $sort_order_type = strtolower((string) $columns['sort_order']['Type']);
        $this->assertMatchesRegularExpression(
            '/^int(\(\d+\))?$/',
            $sort_order_type,
            "'sort_order' must be int."
        );
        $this->assertStringNotContainsString('unsigned', $sort_order_type, "'sort_order' should be signed int.");

        // created_at (datetime)
        $created_at_type = strtolower((string) $columns['created_at']['Type']);
        $this->assertSame('datetime', $created_at_type, "'created_at' must be datetime.");
    }

    /**
     * Test 3: Verifies that expected constraints and indexes are registered:
     * - Composite PRIMARY KEY on (series_id, post_id)
     * - Key index series_order on (series_id, sort_order)
     * - Key index post_series on (post_id, series_id)
     */
    public function test_indexes_are_registered_correctly(): void
    {
        $this->schema_manager->create_tables();

        $raw_indexes = $this->wpdb->get_results("SHOW INDEX FROM {$this->table_name}", ARRAY_A);
        $this->assertNotEmpty($raw_indexes, "SHOW INDEX FROM {$this->table_name} must return index rows.");

        $indexes = [];
        foreach ($raw_indexes as $index) {
            $key_name = (string) $index['Key_name'];
            $seq      = (int) $index['Seq_in_index'];
            $column   = (string) $index['Column_name'];

            $indexes[$key_name][$seq] = $column;
        }

        // Composite PRIMARY KEY on (series_id, post_id)
        $this->assertArrayHasKey('PRIMARY', $indexes, 'PRIMARY key must exist.');
        $this->assertSame(
            [1 => 'series_id', 2 => 'post_id'],
            $indexes['PRIMARY'],
            'PRIMARY key must be composite on (series_id, post_id).'
        );

        // series_order index on (series_id, sort_order)
        $this->assertArrayHasKey('series_order', $indexes, "Index 'series_order' must exist.");
        $this->assertSame(
            [1 => 'series_id', 2 => 'sort_order'],
            $indexes['series_order'],
            "Index 'series_order' must cover (series_id, sort_order)."
        );

        // post_series index on (post_id, series_id)
        $this->assertArrayHasKey('post_series', $indexes, "Index 'post_series' must exist.");
        $this->assertSame(
            [1 => 'post_id', 2 => 'series_id'],
            $indexes['post_series'],
            "Index 'post_series' must cover (post_id, series_id)."
        );
    }

    /**
     * Test 4: Verifies that composite primary key constraint prevents duplicate post entries in the same series.
     */
    public function test_composite_primary_key_prevents_duplicate_post_in_same_series(): void
    {
        $this->schema_manager->create_tables();

        $first_insert = $this->wpdb->insert(
            $this->table_name,
            [
                'series_id'  => 1,
                'post_id'    => 10,
                'sort_order' => 0,
                'created_at' => current_time('mysql'),
            ],
            ['%d', '%d', '%d', '%s']
        );

        $this->assertSame(1, $first_insert, 'First insert must succeed.');

        // Suppress MySQL error output for the expected violation
        $this->wpdb->suppress_errors(true);
        $duplicate_insert = $this->wpdb->insert(
            $this->table_name,
            [
                'series_id'  => 1,
                'post_id'    => 10,
                'sort_order' => 1,
                'created_at' => current_time('mysql'),
            ],
            ['%d', '%d', '%d', '%s']
        );
        $last_error = $this->wpdb->last_error;
        $this->wpdb->suppress_errors(false);

        $this->assertFalse(
            $duplicate_insert,
            'Duplicate insertion with identical (series_id, post_id) must return false.'
        );
        $this->assertNotEmpty(
            $last_error,
            'Database error must be set on duplicate primary key collision.'
        );
        $this->assertStringContainsStringIgnoringCase(
            'duplicate',
            $last_error,
            "Error message must indicate duplicate key violation: {$last_error}"
        );

        // Verify that only the original row exists in the database
        $count = (int) $this->wpdb->get_var(
            $this->wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->table_name} WHERE series_id = %d AND post_id = %d",
                1,
                10
            )
        );
        $this->assertSame(1, $count, 'Exactly one row must exist for the composite key pair.');
    }
}
