<?php
/**
 * SeriesRepositoryTest file.
 *
 * @package SeriesCraft\Tests\Integration\Database\Repositories
 */

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
 * @package SeriesCraft\Tests\Integration\Database\Repositories
 */
class SeriesRepositoryTest extends IntegrationTestCase {

	/**
	 * Repository instance under test.
	 *
	 * @var SeriesRepository
	 */
	private SeriesRepository $repository;

	/**
	 * Term ID of the test series.
	 *
	 * @var int
	 */
	private int $term_id;

	/**
	 * Post IDs generated for testing.
	 *
	 * @var array<int>
	 */
	private array $post_ids = array();

	/**
	 * Set up fixture before each test.
	 */
	protected function setUp(): void {
		parent::setUp();

		( new SeriesTaxonomy() )->register();
		$this->repository = new SeriesRepository();

		$term = wp_insert_term( 'Test Architecture Series', SeriesTaxonomy::TAXONOMY );
		$this->assertIsArray( $term );
		$this->term_id = (int) $term['term_id'];

		// Create three published posts with distinct timestamps using core WordPress functions.
		$post_a = (int) wp_insert_post(
			array(
				'post_title'  => 'Post A',
				'post_status' => 'publish',
				'post_date'   => '2026-01-01 10:00:00',
			)
		);

		$post_b = (int) wp_insert_post(
			array(
				'post_title'  => 'Post B',
				'post_status' => 'publish',
				'post_date'   => '2026-01-02 10:00:00',
			)
		);

		$post_c = (int) wp_insert_post(
			array(
				'post_title'  => 'Post C',
				'post_status' => 'publish',
				'post_date'   => '2026-01-03 10:00:00',
			)
		);

		$this->post_ids = array( $post_a, $post_b, $post_c );

		foreach ( $this->post_ids as $post_id ) {
			wp_set_object_terms( $post_id, array( $this->term_id ), SeriesTaxonomy::TAXONOMY, true );
		}
	}

	/**
	 * Clean up test posts after each run.
	 */
	protected function tearDown(): void {
		foreach ( $this->post_ids as $post_id ) {
			wp_delete_post( $post_id, true );
		}

		wp_delete_term( $this->term_id, SeriesTaxonomy::TAXONOMY );

		parent::tearDown();
	}

	/**
	 * Test 1: Verify updating and persisting an explicit custom post order (Post A -> Post C -> Post B).
	 */
	public function test_01_it_updates_and_persists_explicit_post_order(): void {
		$custom_order = array(
			$this->post_ids[0], // Post A (Position 1).
			$this->post_ids[2], // Post C (Position 2).
			$this->post_ids[1], // Post B (Position 3).
		);

		$updated = $this->repository->update_series_order( $this->term_id, $custom_order );
		$this->assertTrue( $updated, 'Failed: update_series_order returned false.' );

		$ordered_posts = $this->repository->get_series_posts( $this->term_id );
		$retrieved_ids = array_map( 'intval', wp_list_pluck( $ordered_posts, 'ID' ) );

		$this->assertSame( $custom_order, $retrieved_ids, 'Failed: Posts were not retrieved in the explicit numerical order.' );
	}

	/**
	 * Test 2: Verify synchronization of sm_series_order post meta on order update.
	 */
	public function test_02_it_synchronizes_sm_series_order_meta(): void {
		$custom_order = array(
			$this->post_ids[2], // Post C -> position 1.
			$this->post_ids[0], // Post A -> position 2.
			$this->post_ids[1], // Post B -> position 3.
		);

		$this->repository->update_series_order( $this->term_id, $custom_order );

		$this->assertSame( 1, (int) get_post_meta( $this->post_ids[2], 'sm_series_order', true ) );
		$this->assertSame( 2, (int) get_post_meta( $this->post_ids[0], 'sm_series_order', true ) );
		$this->assertSame( 3, (int) get_post_meta( $this->post_ids[1], 'sm_series_order', true ) );
	}

	/**
	 * Test 3: Verify retrieval of all series assigned to a single post.
	 */
	public function test_03_it_retrieves_series_assigned_to_post(): void {
		$second_term = wp_insert_term( 'Second Series', SeriesTaxonomy::TAXONOMY );
		$this->assertIsArray( $second_term );
		$second_term_id = (int) $second_term['term_id'];

		wp_set_object_terms( $this->post_ids[0], array( $second_term_id ), SeriesTaxonomy::TAXONOMY, true );

		$assigned_series = $this->repository->get_post_series( $this->post_ids[0] );
		$series_ids      = wp_list_pluck( $assigned_series, 'term_id' );

		$this->assertContains( $this->term_id, $series_ids );
		$this->assertContains( $second_term_id, $series_ids );

		wp_delete_term( $second_term_id, SeriesTaxonomy::TAXONOMY );
	}
}
