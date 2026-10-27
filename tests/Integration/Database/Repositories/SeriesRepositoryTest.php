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
use SeriesCraft\Database\SchemaManager;
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

		( new SchemaManager() )->create_tables();
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

	/**
	 * Test 4: Verify persisting post sequence directly to the custom series_craft_posts table with replace.
	 */
	public function test_04_it_persists_ordering_to_custom_table_with_replace(): void {
		global $wpdb;

		$custom_order = array(
			$this->post_ids[1], // Post B (Position 1).
			$this->post_ids[0], // Post A (Position 2).
			$this->post_ids[2], // Post C (Position 3).
		);

		$updated = $this->repository->update_series_order( $this->term_id, $custom_order );
		$this->assertTrue( $updated );

		$table_name = $this->repository->get_table_name();

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT post_id, sort_order, created_at FROM {$table_name} WHERE series_id = %d ORDER BY sort_order ASC",
				$this->term_id
			),
			ARRAY_A
		);

		$this->assertCount( 3, $rows );
		$this->assertSame( (int) $rows[0]['post_id'], $this->post_ids[1] );
		$this->assertSame( 1, (int) $rows[0]['sort_order'] );
		$this->assertNotEmpty( $rows[0]['created_at'] );

		$this->assertSame( (int) $rows[1]['post_id'], $this->post_ids[0] );
		$this->assertSame( 2, (int) $rows[1]['sort_order'] );

		$this->assertSame( (int) $rows[2]['post_id'], $this->post_ids[2] );
		$this->assertSame( 3, (int) $rows[2]['sort_order'] );
	}

	/**
	 * Test 5: Verify get_series_posts filters by custom post statuses and defaults to publish.
	 */
	public function test_05_it_filters_series_posts_by_custom_statuses(): void {
		$draft_post       = (int) wp_insert_post(
			array(
				'post_title'  => 'Draft Post',
				'post_status' => 'draft',
				'post_date'   => '2026-01-04 10:00:00',
			)
		);
		$this->post_ids[] = $draft_post;

		wp_set_object_terms( $draft_post, array( $this->term_id ), SeriesTaxonomy::TAXONOMY, true );

		$this->repository->update_series_order(
			$this->term_id,
			array(
				$draft_post,
				$this->post_ids[0],
				$this->post_ids[1],
				$this->post_ids[2],
			)
		);

		// Default behavior: only publish status is returned.
		$published_posts = $this->repository->get_series_posts( $this->term_id );
		$published_ids   = array_map( 'intval', wp_list_pluck( $published_posts, 'ID' ) );
		$this->assertNotContains( $draft_post, $published_ids );
		$this->assertCount( 3, $published_posts );

		// Custom status filter: include draft.
		$draft_posts = $this->repository->get_series_posts( $this->term_id, array( 'draft' ) );
		$draft_ids   = array_map( 'intval', wp_list_pluck( $draft_posts, 'ID' ) );
		$this->assertSame( array( $draft_post ), $draft_ids );

		// Multiple status filter: publish and draft.
		$all_status_posts = $this->repository->get_series_posts( $this->term_id, array( 'publish', 'draft' ) );
		$all_ids          = array_map( 'intval', wp_list_pluck( $all_status_posts, 'ID' ) );
		$this->assertCount( 4, $all_status_posts );
		$this->assertSame( $draft_post, $all_ids[0] );
	}
}
