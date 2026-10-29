<?php
/**
 * SavePostSubscriberTest file.
 *
 * @package SeriesCraft\Tests\Integration\Hooks
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Hooks;

use SeriesCraft\Database\Repositories\SeriesRepository;
use SeriesCraft\Hooks\SavePostSubscriber;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use SeriesCraft\Tests\Integration\IntegrationTestCase;
use wpdb;

/**
 * Class SavePostSubscriberTest
 *
 * Integration test suite for SavePostSubscriber.
 * Verifies custom table synchronization on post save and taxonomy term assignment:
 * - Auto-sequencing new posts with sort_order = MAX(sort_order) + 1.
 * - Syncing cleanly with SeriesRepository.
 * - Safely removing detached series records using parameter unpacking in NOT IN query.
 * - Preserving existing ordering and handling unassignment.
 *
 * @package SeriesCraft\Tests\Integration\Hooks
 */
class SavePostSubscriberTest extends IntegrationTestCase {

	/**
	 * Database abstraction instance.
	 *
	 * @var wpdb
	 */
	private wpdb $wpdb;

	/**
	 * Save post subscriber under test.
	 *
	 * @var SavePostSubscriber
	 */
	private SavePostSubscriber $subscriber;

	/**
	 * Series repository instance.
	 *
	 * @var SeriesRepository
	 */
	private SeriesRepository $repository;

	/**
	 * Primary test series term ID.
	 *
	 * @var int
	 */
	private int $term_id;

	/**
	 * Secondary test series term ID.
	 *
	 * @var int
	 */
	private int $second_term_id;

	/**
	 * Created test post IDs for teardown cleanup.
	 *
	 * @var array<int>
	 */
	private array $post_ids = array();

	/**
	 * Set up test fixtures before each test execution.
	 */
	protected function setUp(): void {
		parent::setUp();

		global $wpdb;
		$this->wpdb = $wpdb;

		( new SeriesTaxonomy() )->register();

		$this->repository = new SeriesRepository();
		$this->subscriber = new SavePostSubscriber();
		$this->subscriber->register();

		$term = wp_insert_term( 'Integration Test Series ' . uniqid(), SeriesTaxonomy::TAXONOMY );
		$this->assertIsArray( $term );
		$this->term_id = (int) $term['term_id'];

		$second_term = wp_insert_term( 'Secondary Series ' . uniqid(), SeriesTaxonomy::TAXONOMY );
		$this->assertIsArray( $second_term );
		$this->second_term_id = (int) $second_term['term_id'];
	}

	/**
	 * Clean up test fixtures after each run.
	 */
	protected function tearDown(): void {
		unset( $_POST['series'], $_POST['seriescraft_series_id'] );

		foreach ( $this->post_ids as $post_id ) {
			wp_delete_post( $post_id, true );
		}

		wp_delete_term( $this->term_id, SeriesTaxonomy::TAXONOMY );
		wp_delete_term( $this->second_term_id, SeriesTaxonomy::TAXONOMY );

		parent::tearDown();
	}

	/**
	 * Helper method to create a test post.
	 *
	 * @param string $title  Post title.
	 * @param string $status Post status.
	 * @return int Created post ID.
	 */
	private function create_test_post( string $title = 'Test Post', string $status = 'publish' ): int {
		$post_id = (int) wp_insert_post(
			array(
				'post_title'  => $title,
				'post_status' => $status,
				'post_date'   => current_time( 'mysql' ),
			)
		);

		$this->post_ids[] = $post_id;

		return $post_id;
	}

	/**
	 * Test 1: Verify assigning a post to a series sets sort_order = 1 and syncs with SeriesRepository.
	 */
	public function test_01_it_auto_assigns_sort_order_when_post_assigned_to_series(): void {
		$post_id = $this->create_test_post( 'First Article' );

		wp_set_object_terms( $post_id, array( $this->term_id ), SeriesTaxonomy::TAXONOMY );

		$table_name = $this->subscriber->get_table_name();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$row = $this->wpdb->get_row(
			$this->wpdb->prepare(
				"SELECT post_id, series_id, sort_order, created_at FROM {$table_name} WHERE series_id = %d AND post_id = %d",
				$this->term_id,
				$post_id
			),
			ARRAY_A
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared

		$this->assertNotNull( $row, 'Junction table row must exist for assigned series.' );
		$this->assertSame( 1, (int) $row['sort_order'], 'First assigned post must receive sort_order 1.' );
		$this->assertNotEmpty( $row['created_at'], 'created_at timestamp must be populated.' );

		// Verify sync with SeriesRepository.
		$posts = $this->repository->get_series_posts( $this->term_id );
		$this->assertCount( 1, $posts );
		$this->assertSame( $post_id, (int) $posts[0]->ID );
	}

	/**
	 * Test 2: Verify sequential post assignments automatically increment sort_order = MAX(sort_order) + 1.
	 */
	public function test_02_it_increments_sort_order_for_subsequent_posts(): void {
		$post_1 = $this->create_test_post( 'Post Part 1' );
		$post_2 = $this->create_test_post( 'Post Part 2' );
		$post_3 = $this->create_test_post( 'Post Part 3' );

		wp_set_object_terms( $post_1, array( $this->term_id ), SeriesTaxonomy::TAXONOMY );
		wp_set_object_terms( $post_2, array( $this->term_id ), SeriesTaxonomy::TAXONOMY );
		wp_set_object_terms( $post_3, array( $this->term_id ), SeriesTaxonomy::TAXONOMY );

		$table_name = $this->subscriber->get_table_name();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$rows = $this->wpdb->get_results(
			$this->wpdb->prepare(
				"SELECT post_id, sort_order FROM {$table_name} WHERE series_id = %d ORDER BY sort_order ASC",
				$this->term_id
			),
			ARRAY_A
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared

		$this->assertCount( 3, $rows );
		$this->assertSame( $post_1, (int) $rows[0]['post_id'] );
		$this->assertSame( 1, (int) $rows[0]['sort_order'] );

		$this->assertSame( $post_2, (int) $rows[1]['post_id'] );
		$this->assertSame( 2, (int) $rows[1]['sort_order'] );

		$this->assertSame( $post_3, (int) $rows[2]['post_id'] );
		$this->assertSame( 3, (int) $rows[2]['sort_order'] );

		// Verify SeriesRepository retrieves all 3 posts in exact order.
		$series_posts = $this->repository->get_series_posts( $this->term_id );
		$series_ids   = array_map( 'intval', wp_list_pluck( $series_posts, 'ID' ) );
		$this->assertSame( array( $post_1, $post_2, $post_3 ), $series_ids );
	}

	/**
	 * Test 3: Verify detaching a post from series removes its junction table row.
	 */
	public function test_03_it_removes_junction_record_when_series_detached(): void {
		$post_id = $this->create_test_post( 'Detachable Post' );

		wp_set_object_terms( $post_id, array( $this->term_id ), SeriesTaxonomy::TAXONOMY );

		$table_name = $this->subscriber->get_table_name();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$initial_count = (int) $this->wpdb->get_var(
			$this->wpdb->prepare(
				"SELECT COUNT(*) FROM {$table_name} WHERE post_id = %d AND series_id = %d",
				$post_id,
				$this->term_id
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$this->assertSame( 1, $initial_count );

		// Detach post from series.
		wp_set_object_terms( $post_id, array(), SeriesTaxonomy::TAXONOMY );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$after_count = (int) $this->wpdb->get_var(
			$this->wpdb->prepare(
				"SELECT COUNT(*) FROM {$table_name} WHERE post_id = %d AND series_id = %d",
				$post_id,
				$this->term_id
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$this->assertSame( 0, $after_count, 'Junction table row must be removed when series is detached.' );

		// Verify SeriesRepository returns empty.
		$posts = $this->repository->get_series_posts( $this->term_id );
		$this->assertEmpty( $posts );
	}

	/**
	 * Test 4: Verify unpacked NOT IN query removes only detached series when post has multiple series.
	 */
	public function test_04_it_removes_only_detached_series_when_multiple_assigned(): void {
		$post_id = $this->create_test_post( 'Multi-Series Post' );

		// Assign to both series.
		wp_set_object_terms( $post_id, array( $this->term_id, $this->second_term_id ), SeriesTaxonomy::TAXONOMY );

		$table_name = $this->subscriber->get_table_name();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$assigned_before = $this->wpdb->get_col(
			$this->wpdb->prepare(
				"SELECT series_id FROM {$table_name} WHERE post_id = %d ORDER BY series_id ASC",
				$post_id
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$assigned_before = array_map( 'intval', $assigned_before );
		$this->assertCount( 2, $assigned_before );

		// Keep only the second series (detaching first series).
		wp_set_object_terms( $post_id, array( $this->second_term_id ), SeriesTaxonomy::TAXONOMY );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$assigned_after = $this->wpdb->get_col(
			$this->wpdb->prepare(
				"SELECT series_id FROM {$table_name} WHERE post_id = %d",
				$post_id
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$assigned_after = array_map( 'intval', $assigned_after );

		$this->assertCount( 1, $assigned_after );
		$this->assertSame( array( $this->second_term_id ), $assigned_after );
		$this->assertNotContains( $this->term_id, $assigned_after );
	}

	/**
	 * Test 5: Verify on_save_post handles manual submission via $_POST and maintains order.
	 */
	public function test_05_it_handles_save_post_action_with_post_data(): void {
		$post_id = $this->create_test_post( 'POST Array Submission' );

		$_POST['series'] = array( (string) $this->term_id );

		$post = get_post( $post_id );
		$this->subscriber->on_save_post( $post_id, $post );

		$table_name = $this->subscriber->get_table_name();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$row = $this->wpdb->get_row(
			$this->wpdb->prepare(
				"SELECT series_id, post_id, sort_order FROM {$table_name} WHERE post_id = %d AND series_id = %d",
				$post_id,
				$this->term_id
			),
			ARRAY_A
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared

		$this->assertNotNull( $row );
		$this->assertSame( 1, (int) $row['sort_order'] );

		unset( $_POST['series'] );
	}
}
