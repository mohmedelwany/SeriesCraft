<?php
/**
 * SeriesOrderRepositoryTest integration test suite.
 *
 * @package SeriesCraft\Tests\Integration\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Database\Repositories;

use SeriesCraft\Database\Repositories\SeriesOrderRepository;
use SeriesCraft\Tests\Integration\IntegrationTestCase;

/**
 * Class SeriesOrderRepositoryTest
 *
 * Integration tests for batch order persistence in term relationships.
 */
class SeriesOrderRepositoryTest extends IntegrationTestCase {

	/**
	 * Repository instance under test.
	 *
	 * @var SeriesOrderRepository
	 */
	private SeriesOrderRepository $order_repository;

	/**
	 * Test series taxonomy term ID.
	 *
	 * @var int
	 */
	private int $term_id = 0;

	/**
	 * Test taxonomy slug.
	 */
	private const TAXONOMY = 'series';

	/**
	 * Setup before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();

		$this->order_repository = new SeriesOrderRepository();

		if ( ! taxonomy_exists( self::TAXONOMY ) ) {
			register_taxonomy( self::TAXONOMY, array( 'post' ) );
		}

		$term = wp_insert_term( 'Test Series ' . wp_generate_password( 6, false ), self::TAXONOMY );
		if ( ! is_wp_error( $term ) && isset( $term['term_id'] ) ) {
			$this->term_id = (int) $term['term_id'];
		}
	}

	/**
	 * Clean up state after each test.
	 */
	protected function tearDown(): void {
		if ( $this->term_id > 0 ) {
			wp_delete_term( $this->term_id, self::TAXONOMY );
		}

		parent::tearDown();
	}

	/**
	 * Helper to create a post without using $this->factory.
	 *
	 * @return int
	 */
	private function create_test_post(): int {
		return (int) wp_insert_post(
			array(
				'post_title'   => 'Test Post ' . wp_generate_password( 6, false ),
				'post_status'  => 'publish',
				'post_type'    => 'post',
			)
		);
	}

	/**
	 * Test 1: Verifies updating order for an empty array returns true without modifications.
	 */
	public function test_01_update_order_with_empty_items_returns_true(): void {
		$result = $this->order_repository->update_series_posts_order( $this->term_id, array() );
		$this->assertTrue( $result, 'Expected empty items batch update to return true.' );
	}

	/**
	 * Test 2: Verifies persistence of explicit order in term relationships.
	 */
	public function test_02_persists_explicit_term_order_for_series_posts(): void {
		$post_a = $this->create_test_post();
		$post_b = $this->create_test_post();
		$post_c = $this->create_test_post();

		wp_set_object_terms( $post_a, $this->term_id, self::TAXONOMY );
		wp_set_object_terms( $post_b, $this->term_id, self::TAXONOMY );
		wp_set_object_terms( $post_c, $this->term_id, self::TAXONOMY );

		$items = array(
			array( 'post_id' => $post_c, 'order' => 1 ),
			array( 'post_id' => $post_a, 'order' => 2 ),
			array( 'post_id' => $post_b, 'order' => 3 ),
		);

		$saved = $this->order_repository->update_series_posts_order( $this->term_id, $items );
		$this->assertTrue( $saved, 'Failed: Batch update returned false.' );

		$retrieved_order = $this->order_repository->get_ordered_post_ids( $this->term_id );
		$this->assertSame(
			array( $post_c, $post_a, $post_b ),
			$retrieved_order,
			'Failed: Post IDs did not match expected explicit order.'
		);
	}

	/**
	 * Test 3: Verifies synchronization updates post meta fallback for legacy compatibility.
	 */
	public function test_03_synchronizes_meta_order_fallback(): void {
		$post_id = $this->create_test_post();
		wp_set_object_terms( $post_id, $this->term_id, self::TAXONOMY );

		$items = array(
			array( 'post_id' => $post_id, 'order' => 5 ),
		);

		$this->order_repository->update_series_posts_order( $this->term_id, $items );

		$meta_order = (int) get_post_meta( $post_id, '_series_order_' . $this->term_id, true );
		$this->assertSame( 5, $meta_order, 'Failed: Fallback post meta order was not synchronized.' );
	}

	/**
	 * Test 4: Verifies skipping invalid or non-numeric post IDs gracefully.
	 */
	public function test_04_filters_invalid_items_and_persists_valid_entries(): void {
		$post_valid = $this->create_test_post();
		wp_set_object_terms( $post_valid, $this->term_id, self::TAXONOMY );

		$items = array(
			array( 'post_id' => -1, 'order' => 1 ),
			array( 'post_id' => 'string_id', 'order' => 2 ),
			array( 'post_id' => $post_valid, 'order' => 1 ),
		);

		$saved = $this->order_repository->update_series_posts_order( $this->term_id, $items );
		$this->assertTrue( $saved );

		$retrieved = $this->order_repository->get_ordered_post_ids( $this->term_id );
		$this->assertSame( array( $post_valid ), $retrieved );
	}
}