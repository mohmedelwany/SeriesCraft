<?php
/**
 * SettingsRestControllerTest integration test suite.
 *
 * @package SeriesCraft\Tests\Integration\Api\Controllers
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Api\Controllers;

use SeriesCraft\Api\Controllers\SettingsRestController;
use SeriesCraft\Database\Repositories\SettingsRepository;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use SeriesCraft\Tests\Integration\IntegrationTestCase;
use WP_REST_Request;
use WP_REST_Server;

/**
 * Class SettingsRestControllerTest
 *
 * Integration tests for the SettingsRestController REST endpoints.
 */
class SettingsRestControllerTest extends IntegrationTestCase {

	/**
	 * REST Server instance.
	 *
	 * @var WP_REST_Server
	 */
	protected $server;

	/**
	 * Controller instance under test.
	 *
	 * @var SettingsRestController
	 */
	private SettingsRestController $controller;

	/**
	 * Repository instance.
	 *
	 * @var SettingsRepository
	 */
	private SettingsRepository $settings_repository;

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

		$this->settings_repository = new SettingsRepository();
		$this->controller          = new SettingsRestController( $this->settings_repository );
		$this->controller->register_routes();

		if ( ! taxonomy_exists( SeriesTaxonomy::TAXONOMY ) ) {
			register_taxonomy( SeriesTaxonomy::TAXONOMY, array( 'post' ) );
		}

		$term = wp_insert_term( 'Settings Test Series ' . wp_generate_password( 6, false ), SeriesTaxonomy::TAXONOMY );
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
	 * Helper to create an admin user without $this->factory.
	 *
	 * @return int
	 */
	private function create_admin_user(): int {
		$login   = 'admin_settings_' . wp_generate_password( 6, false );
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
	 * Test 1: Verifies GET and POST settings routes are registered.
	 */
	public function test_01_routes_are_registered(): void {
		$routes = $this->server->get_routes();
		$route  = '/series-craft/v1/series/(?P<id>[\d]+)/settings';

		$this->assertArrayHasKey( $route, $routes, 'Failed: Route is not registered.' );
	}

	/**
	 * Test 2: Verifies authorized user can read series settings via GET.
	 */
	public function test_02_authorized_user_can_get_settings(): void {
		$admin_id = $this->create_admin_user();
		wp_set_current_user( $admin_id );

		$request  = new WP_REST_Request( 'GET', '/series-craft/v1/series/' . $this->term_id . '/settings' );
		$response = $this->server->dispatch( $request );

		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();

		$this->assertArrayHasKey( 'term_id', $data );
		$this->assertArrayHasKey( 'layout', $data );
		$this->assertSame( $this->term_id, $data['term_id'] );
	}

	/**
	 * Test 3: Verifies unauthorized user cannot update settings via POST.
	 */
	public function test_03_unauthorized_user_cannot_update_settings(): void {
		wp_set_current_user( 0 );

		$request = new WP_REST_Request( 'POST', '/series-craft/v1/series/' . $this->term_id . '/settings' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( (string) wp_json_encode( array( 'layout' => 'media-grid' ) ) );

		$response = $this->server->dispatch( $request );
		$this->assertContains( $response->get_status(), array( 401, 403 ) );
	}

	/**
	 * Test 4: Verifies authorized user can update series settings via POST.
	 */
	public function test_04_authorized_user_can_update_settings(): void {
		$admin_id = $this->create_admin_user();
		wp_set_current_user( $admin_id );

		$payload = array(
			'layout'        => 'media-grid',
			'custom_styles' => array(
				'border_color' => '#112233',
			),
		);

		$request = new WP_REST_Request( 'POST', '/series-craft/v1/series/' . $this->term_id . '/settings' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( (string) wp_json_encode( $payload ) );

		$response = $this->server->dispatch( $request );
		$this->assertSame( 200, $response->get_status() );

		$data = $response->get_data();
		$this->assertTrue( $data['success'] );
		$this->assertSame( 'media-grid', $data['settings']['layout'] );
		$this->assertSame( '#112233', $data['settings']['custom_styles']['border_color'] );

		// Verify meta in database.
		$saved_meta = get_term_meta( $this->term_id, 'sm_series_settings', true );
		$this->assertIsArray( $saved_meta );
		$this->assertSame( 'media-grid', $saved_meta['layout'] );
	}

	/**
	 * Test 5: Verifies request with non-existent series returns 404.
	 */
	public function test_05_returns_404_for_non_existent_series(): void {
		$admin_id = $this->create_admin_user();
		wp_set_current_user( $admin_id );

		$request = new WP_REST_Request( 'GET', '/series-craft/v1/series/999999/settings' );
		$response = $this->server->dispatch( $request );

		$this->assertSame( 404, $response->get_status() );
	}

	/**
	 * Test 6: Verifies invalid layout value returns 400.
	 */
	public function test_06_returns_400_for_invalid_layout(): void {
		$admin_id = $this->create_admin_user();
		wp_set_current_user( $admin_id );

		$request = new WP_REST_Request( 'POST', '/series-craft/v1/series/' . $this->term_id . '/settings' );
		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( (string) wp_json_encode( array( 'layout' => 'invalid-layout-name' ) ) );

		$response = $this->server->dispatch( $request );
		$this->assertSame( 400, $response->get_status() );
	}
}