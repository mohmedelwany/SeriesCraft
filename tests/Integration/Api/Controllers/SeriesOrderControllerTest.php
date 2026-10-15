<?php
/**
 * SeriesOrderControllerTest integration test suite.
 *
 * @package SeriesCraft\Tests\Integration\Api\Controllers
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Api\Controllers;

use SeriesCraft\Api\Controllers\SeriesRestController;
use SeriesCraft\Database\Repositories\SeriesRepository;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use SeriesCraft\Tests\Integration\IntegrationTestCase;
use WP_REST_Request;
use WP_REST_Server;

/**
 * Class SeriesRestControllerTest
 *
 * Integration tests for the SeriesRestController REST endpoints.
 */
class SeriesRestControllerTest extends IntegrationTestCase {

	/**
	 * REST Server instance.
	 *
	 * @var WP_REST_Server
	 */
	protected $server;

	/**
	 * Controller instance under test.
	 *
	 * @var SeriesRestController
	 */
	private SeriesRestController $controller;

	/**
	 * Repository instance.
	 *
	 * @var SeriesRepository
	 */
	private SeriesRepository $repository;

	/**
	 * Test series term ID.
	 *
	 * @var int
	 */
	private int $term_id = 0;

	/**
	 * Setup before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();

		global $wp_rest_server;
		$this->server = new WP_REST_Server();
		$wp_rest_server = $this->server;

		$this->repository = new SeriesRepository();
		$this->controller = new SeriesRestController( $this->repository );
		$this->controller->register_routes();

		if ( ! taxonomy_exists( SeriesTaxonomy::TAXONOMY ) ) {
			register_taxonomy( SeriesTaxonomy::TAXONOMY, array( 'post' ) );
		}

		$term = wp_insert_term( 'Test Series REST ' . wp_generate_password( 6, false ), SeriesTaxonomy::TAXONOMY );
		if ( ! is_wp_error( $term ) && isset( $term['term_id'] ) ) {
			$this->term_id = (int) $term['term_id'];
		}
	}

	/**
	 * Clean up state after each test.
	 */
	protected function tearDown(): void {
		global $wp_rest_server;
		$wp_rest_server = null;

		if ( $this->term_id > 0 ) {
			wp_delete_term( $this->term_id, SeriesTaxonomy::TAXONOMY );
		}

		wp_set_current_user( 0 );

		parent::tearDown();
	}

	/**
	 * Helper to create an admin user without using $this->factory.
	 *
	 * @return int
	 */
	private function create_admin_user(): int {
		$login = 'admin_' . wp_generate_password( 6, false );
		$user_id = wp_create_user( $login, 'password123', $login . '@example.com' );
		if ( ! is_wp_error( $user_id ) ) {
			$user = get_user_by( 'id', $user_id );
			if ( $user ) {
				$user->add_role( 'administrator' );
			}
			return (int) $user_id;
		}
		return 0;
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
	 * Test 1: Verifies the route is registered in the REST server.
	 */
	public function test_01_route_is_registered(): void {
		$routes = $this->server->get_routes();
		$route  = '/series-craft/v1/series/(?P<id>[\d]+)/order';

		$this->assertArrayHasKey( $route, $routes, 'Failed: Route is not registered.' );
	}

	/**
	 * Test 2: Verifies unauthorized request is rejected with 401 or 403.
	 */
	public function test_02_unauthorized_user_cannot_update_order(): void {
		wp_set_current_user( 0 );

		$request = new WP_REST_Request( 'POST', '/series-craft/v1/series/' . $this->term_id . '/order' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( (string) wp_json_encode( array( 'post_ids' => array( 1, 2, 3 ) ) ) );

		$response = $this->server->dispatch( $request );
		$this->assertContains( $response->get_status(), array( 401, 403 ) );
	}

	/**
	 * Test 3: Verifies authorized user can update post order successfully.
	 */
	public function test_03_authorized_user_can_update_order(): void {
		$admin_id = $this->create_admin_user();
		wp_set_current_user( $admin_id );

		$post_1 = $this->create_test_post();
		$post_2 = $this->create_test_post();
		$post_3 = $this->create_test_post();

		wp_set_object_terms( $post_1, $this->term_id, SeriesTaxonomy::TAXONOMY );
		wp_set_object_terms( $post_2, $this->term_id, SeriesTaxonomy::TAXONOMY );
		wp_set_object_terms( $post_3, $this->term_id, SeriesTaxonomy::TAXONOMY );

		$ordered_ids = array( $post_3, $post_1, $post_2 );

		$request = new WP_REST_Request( 'POST', '/series-craft/v1/series/' . $this->term_id . '/order' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( (string) wp_json_encode( array( 'post_ids' => $ordered_ids ) ) );

		$response = $this->server->dispatch( $request );
		$this->assertSame( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertTrue( $data['success'] );

		// Verify database order.
		$posts = $this->repository->get_series_posts( $this->term_id );
		$retrieved_ids = array_map( static fn( $p ) => (int) $p->ID, $posts );
		$this->assertSame( $ordered_ids, $retrieved_ids );
	}

	/**
	 * Test 4: Verifies request with non-existent series returns 404.
	 */
	public function test_04_returns_404_for_non_existent_series(): void {
		$admin_id = $this->create_admin_user();
		wp_set_current_user( $admin_id );

		$request = new WP_REST_Request( 'POST', '/series-craft/v1/series/999999/order' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( (string) wp_json_encode( array( 'post_ids' => array( 1, 2 ) ) ) );

		$response = $this->server->dispatch( $request );
		$this->assertSame( 404, $response->get_status() );
	}

	/**
	 * Test 5: Verifies request with invalid payload returns 400.
	 */
	public function test_05_returns_400_for_invalid_payload(): void {
		$admin_id = $this->create_admin_user();
		wp_set_current_user( $admin_id );

		$request = new WP_REST_Request( 'POST', '/series-craft/v1/series/' . $this->term_id . '/order' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( (string) wp_json_encode( array( 'post_ids' => 'not_an_array' ) ) );

		$response = $this->server->dispatch( $request );
		$this->assertSame( 400, $response->get_status() );
	}
}