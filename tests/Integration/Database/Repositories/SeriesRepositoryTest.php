<?php

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Database\Repositories;

use SeriesCraft\Tests\Integration\IntegrationTestCase;
use SeriesCraft\Database\Repositories\SeriesRepository;
use SeriesCraft\Taxonomy\SeriesTaxonomy;

/**
 * Class SeriesRepositoryTest
 *
 * Integration test suite for SeriesRepository covering explicit post ordering and relationship retrieval.
 * Covers project requirement 3.2:
 * - Validates explicit numerical ordering of posts inside a series via term_order.
 * - Asserts synchronization with the legacy sm_series_order post meta.
 * - Confirms custom post sequence independent of publication dates.
 * - Tests retrieval of all series assigned to a specific post.
 *
 * @package SeriesCraft\Tests\Integration\Database
 */
class SeriesRepositoryTest extends IntegrationTestCase
{
    /**
     * Repository instance under test.
     */
    private SeriesRepository $repository;

    /**
     * Term ID of the test series.
     */
    private int $termId;

    /**
     * Post IDs generated for testing.
     *
     * @var array<int>
     */
    private array $postIds = [];

    /**
     * Set up fixture before each test.
     */
    protected function setUp(): void
    {
        parent::setUp();

        (new SeriesTaxonomy())->register();
        $this->repository = new SeriesRepository();

        $term = wp_insert_term('Test Architecture Series', SeriesTaxonomy::TAXONOMY);
        $this->assertIsArray($term);
        $this->termId = (int) $term['term_id'];

        // Create three published posts with distinct timestamps using core WordPress functions.
        $postA = (int) wp_insert_post([
            'post_title'  => 'Post A',
            'post_status' => 'publish',
            'post_date'   => '2026-01-01 10:00:00',
        ]);

        $postB = (int) wp_insert_post([
            'post_title'  => 'Post B',
            'post_status' => 'publish',
            'post_date'   => '2026-01-02 10:00:00',
        ]);

        $postC = (int) wp_insert_post([
            'post_title'  => 'Post C',
            'post_status' => 'publish',
            'post_date'   => '2026-01-03 10:00:00',
        ]);

        $this->postIds = [$postA, $postB, $postC];

        foreach ($this->postIds as $postId) {
            wp_set_object_terms($postId, [$this->termId], SeriesTaxonomy::TAXONOMY, true);
        }
    }

    /**
     * Clean up test posts after each run.
     */
    protected function tearDown(): void
    {
        foreach ($this->postIds as $postId) {
            wp_delete_post($postId, true);
        }

        wp_delete_term($this->termId, SeriesTaxonomy::TAXONOMY);

        parent::tearDown();
    }

    /**
     * Test 01: Verify updating and persisting an explicit custom post order (Post A -> Post C -> Post B).
     */
    public function test_01_it_updates_and_persists_explicit_post_order(): void
    {
        $customOrder = [
            $this->postIds[0], // Post A (Position 1)
            $this->postIds[2], // Post C (Position 2)
            $this->postIds[1], // Post B (Position 3)
        ];

        $updated = $this->repository->updateSeriesOrder($this->termId, $customOrder);
        $this->assertTrue($updated, 'Failed: updateSeriesOrder returned false.');

        $orderedPosts = $this->repository->getSeriesPosts($this->termId);
        $retrievedIds = array_map('intval', wp_list_pluck($orderedPosts, 'ID'));

        $this->assertSame($customOrder, $retrievedIds, 'Failed: Posts were not retrieved in the explicit numerical order.');
    }

    /**
     * Test 02: Verify synchronization of sm_series_order post meta on order update.
     */
    public function test_02_it_synchronizes_sm_series_order_meta(): void
    {
        $customOrder = [
            $this->postIds[2], // Post C -> position 1
            $this->postIds[0], // Post A -> position 2
            $this->postIds[1], // Post B -> position 3
        ];

        $this->repository->updateSeriesOrder($this->termId, $customOrder);

        $this->assertSame(1, (int) get_post_meta($this->postIds[2], 'sm_series_order', true));
        $this->assertSame(2, (int) get_post_meta($this->postIds[0], 'sm_series_order', true));
        $this->assertSame(3, (int) get_post_meta($this->postIds[1], 'sm_series_order', true));
    }

    /**
     * Test 03: Verify retrieval of all series assigned to a single post.
     */
    public function test_03_it_retrieves_series_assigned_to_post(): void
    {
        $secondTerm = wp_insert_term('Second Series', SeriesTaxonomy::TAXONOMY);
        $this->assertIsArray($secondTerm);
        $secondTermId = (int) $secondTerm['term_id'];

        wp_set_object_terms($this->postIds[0], [$secondTermId], SeriesTaxonomy::TAXONOMY, true);

        $assignedSeries = $this->repository->getPostSeries($this->postIds[0]);
        $seriesIds = wp_list_pluck($assignedSeries, 'term_id');

        $this->assertContains($this->termId, $seriesIds);
        $this->assertContains($secondTermId, $seriesIds);

        wp_delete_term($secondTermId, SeriesTaxonomy::TAXONOMY);
    }
}