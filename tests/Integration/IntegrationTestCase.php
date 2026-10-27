<?php

/**
 * Base test case for Integration tests.
 *
 * Wraps every test in a DB transaction that's automatically rolled back
 * afterward, so tests don't need to manually clean up data they create.
 */

namespace SeriesCraft\Tests\Integration;

use PHPUnit\Framework\TestCase;

abstract class IntegrationTestCase extends TestCase
{
    private static bool $schema_initialized = false;

    protected function setUp(): void
    {
        parent::setUp();

        if ( ! self::$schema_initialized && class_exists( \SeriesCraft\Database\SchemaManager::class ) ) {
            ( new \SeriesCraft\Database\SchemaManager() )->create_tables();
            self::$schema_initialized = true;
        }

        global $wpdb;
        if ($wpdb instanceof \wpdb || (is_object($wpdb) && method_exists($wpdb, 'query'))) {
            $wpdb->query('START TRANSACTION');
        }
    }

    protected function tearDown(): void
    {
        global $wpdb;
        if ($wpdb instanceof \wpdb || (is_object($wpdb) && method_exists($wpdb, 'query'))) {
            $wpdb->query('ROLLBACK');
        }

        parent::tearDown();
    }
}