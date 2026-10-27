<?php
/**
 * Plugin activation integration tests.
 *
 * @package SeriesCraft\Tests\Integration
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration;

use SeriesCraft\Core\Main;
use SeriesCraft\Database\LegacyDataMigrator;
use SeriesCraft\Database\LifecycleSubscriber;
use SeriesCraft\Database\SchemaManager;
use wpdb;

/**
 * Integration tests for plugin activation and Core bootstrap lifecycle wiring.
 */
class PluginActivationTest extends IntegrationTestCase {

	/**
	 * Database abstraction instance.
	 *
	 * @var wpdb
	 */
	private wpdb $wpdb;

	/**
	 * Fully qualified custom table name.
	 *
	 * @var string
	 */
	private string $table_name;

	/**
	 * Schema manager instance.
	 *
	 * @var SchemaManager
	 */
	private SchemaManager $schema_manager;

	/**
	 * Set up test fixtures before each test execution.
	 */
	protected function setUp(): void {
		parent::setUp();

		global $wpdb;
		$this->wpdb           = $wpdb;
		$this->table_name     = $this->wpdb->prefix . 'series_craft_posts';
		$this->schema_manager = new SchemaManager();

		// Start with clean state.
		$this->schema_manager->drop_tables();

		if ( ! taxonomy_exists( 'series' ) ) {
			register_taxonomy( 'series', 'post' );
		}
	}

	/**
	 * Clean up after test execution.
	 */
	protected function tearDown(): void {
		if ( isset( $this->schema_manager ) ) {
			$this->schema_manager->drop_tables();
		}

		parent::tearDown();
	}

	/**
	 * Test 1: Verify activation routine creates the custom junction table and migrates legacy data.
	 */
	public function test_activation_routine_creates_tables_and_migrates_data(): void {
		// 1. Prepare legacy term and posts.
		$term_result = wp_insert_term( 'Legacy Series ' . uniqid(), 'series' );
		$series_id   = is_array( $term_result ) && isset( $term_result['term_id'] ) ? (int) $term_result['term_id'] : 999;

		$post1_id = (int) wp_insert_post(
			array(
				'post_title'  => 'Legacy Post 1',
				'post_status' => 'publish',
			)
		);
		$post2_id = (int) wp_insert_post(
			array(
				'post_title'  => 'Legacy Post 2',
				'post_status' => 'publish',
			)
		);

		update_term_meta( $series_id, LegacyDataMigrator::LEGACY_META_KEY, array( $post1_id, $post2_id ) );

		// 2. Table should NOT exist initially.
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$initial_check = $this->wpdb->get_var( $this->wpdb->prepare( 'SHOW TABLES LIKE %s', $this->table_name ) );
		$this->assertNull( $initial_check );

		// 3. Simulate activation hook callback execution.
		$schema_manager = new SchemaManager();
		$schema_manager->create_tables();

		$legacy_migrator = new LegacyDataMigrator();
		$legacy_migrator->migrate();

		// 4. Verify table now exists.
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$table = $this->wpdb->get_var( $this->wpdb->prepare( 'SHOW TABLES LIKE %s', $this->table_name ) );
		$this->assertSame( $this->table_name, $table, 'Custom table must exist after activation callback.' );

		// 5. Verify legacy rows were migrated.
		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$rows = $this->wpdb->get_results(
			$this->wpdb->prepare(
				"SELECT post_id, sort_order FROM {$this->table_name} WHERE series_id = %d ORDER BY sort_order ASC",
				$series_id
			),
			ARRAY_A
		);
		// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared

		$this->assertCount( 2, $rows, 'Both legacy posts should have been migrated.' );
		$this->assertSame( (int) $rows[0]['post_id'], $post1_id );
		$this->assertSame( (int) $rows[0]['sort_order'], 0 );
		$this->assertSame( (int) $rows[1]['post_id'], $post2_id );
		$this->assertSame( (int) $rows[1]['sort_order'], 1 );
	}

	/**
	 * Test 2: Verify Main::init() initializes LifecycleSubscriber and registers cleanup hooks.
	 */
	public function test_main_init_initializes_lifecycle_subscriber(): void {
		$main = new Main();
		$this->assertNull( $main->get_lifecycle_subscriber(), 'Lifecycle subscriber should be null before init().' );

		$main->init();

		$subscriber = $main->get_lifecycle_subscriber();
		$this->assertInstanceOf(
			LifecycleSubscriber::class,
			$subscriber,
			'LifecycleSubscriber must be instantiated by Main::init().'
		);

		// Verify hooks are attached.
		$this->assertNotFalse(
			has_action( 'deleted_post', array( $subscriber, 'on_deleted_post' ) ),
			'deleted_post hook must be registered by LifecycleSubscriber.'
		);
		$this->assertNotFalse(
			has_action( 'pre_delete_term', array( $subscriber, 'on_pre_delete_term' ) ),
			'pre_delete_term hook must be registered by LifecycleSubscriber.'
		);
	}
}
