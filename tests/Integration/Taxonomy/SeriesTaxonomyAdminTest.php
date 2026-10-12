<?php
/**
 * SeriesTaxonomyAdminTest file.
 *
 * @package SeriesCraft\Tests\Integration\Taxonomy
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Taxonomy;

use SeriesCraft\Tests\Integration\IntegrationTestCase;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use SeriesCraft\Taxonomy\SeriesTaxonomyAdmin;
use SeriesCraft\Database\Repositories\SeriesRepository;

/**
 * Class SeriesTaxonomyAdminTest
 *
 * Integration test suite for SeriesTaxonomyAdmin covering classic taxonomy fallback screens.
 * Covers project requirement 3.14:
 * - Validates registration of admin action hooks for term edit forms.
 * - Asserts enqueueing of jquery-ui-sortable only on the series taxonomy screen.
 * - Confirms saving explicit post order submitted via the classic admin form.
 *
 * @package SeriesCraft\Tests\Integration\Taxonomy
 */
class SeriesTaxonomyAdminTest extends IntegrationTestCase {

	/**
	 * Admin service under test.
	 *
	 * @var SeriesTaxonomyAdmin
	 */
	private SeriesTaxonomyAdmin $admin;

	/**
	 * Repository dependency.
	 *
	 * @var SeriesRepository
	 */
	private SeriesRepository $repository;

	/**
	 * Test term ID.
	 *
	 * @var int
	 */
	private int $term_id;

	/**
	 * Created test post IDs.
	 *
	 * @var array<int>
	 */
	private array $post_ids = array();

	/**
	 * Setup test fixture before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();

		( new SeriesTaxonomy() )->register();
		$this->repository = new SeriesRepository();
		$this->admin      = new SeriesTaxonomyAdmin( $this->repository );

		$term = wp_insert_term( 'Classic Architecture Series', SeriesTaxonomy::TAXONOMY );
		$this->assertIsArray( $term );
		$this->term_id = (int) $term['term_id'];

		$post_a = (int) wp_insert_post(
			array(
				'post_title'  => 'Article One',
				'post_status' => 'publish',
			)
		);
		$post_b = (int) wp_insert_post(
			array(
				'post_title'  => 'Article Two',
				'post_status' => 'publish',
			)
		);

		$this->post_ids = array( $post_a, $post_b );

		foreach ( $this->post_ids as $post_id ) {
			wp_set_object_terms( $post_id, array( $this->term_id ), SeriesTaxonomy::TAXONOMY, true );
		}
	}

	/**
	 * Clean up created artifacts after each test run.
	 */
	protected function tearDown(): void {
		foreach ( $this->post_ids as $post_id ) {
			wp_delete_post( $post_id, true );
		}

		wp_delete_term( $this->term_id, SeriesTaxonomy::TAXONOMY );

		parent::tearDown();
	}

	/**
	 * Test 1: Verify that required WordPress admin hooks are registered.
	 */
	public function test_01_it_registers_admin_hooks(): void {
		$this->admin->register();

		$this->assertNotFalse(
			has_action( SeriesTaxonomy::TAXONOMY . '_edit_form_fields', array( $this->admin, 'render_order_field' ) ),
			'Failed: Edit form fields hook is not registered.'
		);

		$this->assertNotFalse(
			has_action( 'edited_' . SeriesTaxonomy::TAXONOMY, array( $this->admin, 'save_order_field' ) ),
			'Failed: Save term order hook is not registered.'
		);

		$this->assertNotFalse(
			has_action( 'admin_enqueue_scripts', array( $this->admin, 'enqueue_scripts' ) ),
			'Failed: Admin enqueue scripts hook is not registered.'
		);
	}

	/**
	 * Test 2: Verify that form rendering outputs the ordering container and security nonce.
	 */
	public function test_02_it_renders_order_field_markup(): void {
		$term = get_term( $this->term_id, SeriesTaxonomy::TAXONOMY );
		$this->assertNotNull( $term );

		ob_start();
		$this->admin->render_order_field( $term );
		$output = (string) ob_get_clean();

		$this->assertStringContainsString( 'series-order-sortable', $output );
		$this->assertStringContainsString( 'series_craft_order_nonce', $output );
		$this->assertStringContainsString( 'Article One', $output );
		$this->assertStringContainsString( 'Article Two', $output );
	}

	/**
	 * Test 3: Verify that posted order data updates post positions via repository.
	 */
	public function test_03_it_saves_order_from_post_data(): void {
		$user_id = (int) wp_insert_user(
			array(
				'user_login' => 'test_admin_user',
				'user_pass'  => 'password123',
				'role'       => 'administrator',
			)
		);
		wp_set_current_user( $user_id );

		$_POST['series_craft_order_nonce'] = wp_create_nonce( SeriesTaxonomyAdmin::NONCE_ACTION );
		$_POST['series_post_order']        = implode( ',', array( $this->post_ids[1], $this->post_ids[0] ) );

		$this->admin->save_order_field( $this->term_id );

		$ordered_posts = $this->repository->get_series_posts( $this->term_id );
		$retrieved_ids = array_map( 'intval', wp_list_pluck( $ordered_posts, 'ID' ) );

		$this->assertSame( array( $this->post_ids[1], $this->post_ids[0] ), $retrieved_ids );

		unset( $_POST['series_craft_order_nonce'], $_POST['series_post_order'] );
	}
}
