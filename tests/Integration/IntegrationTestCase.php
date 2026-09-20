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
    protected function setUp(): void
    {
        parent::setUp();

        global $wpdb;
        $wpdb->query('START TRANSACTION');
    }

    protected function tearDown(): void
    {
        global $wpdb;
        $wpdb->query('ROLLBACK');

        parent::tearDown();
    }
}