<?php
/**
 * SettingsRestControllerTest unit test suite.
 *
 * @package SeriesCraft\Tests\Unit\Api
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\php\Api;

use Brain\Monkey;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Api\Controllers\SettingsRestController;
use SeriesCraft\Database\Repositories\SettingsRepositoryInterface;
use WP_Error;
use WP_REST_Request;

/**
 * Class SettingsRestControllerTest
 *
 * Isolated unit test suite for SettingsRestController request validation,
 * permissions, sanitization, and response formatting.
 */
class SettingsRestControllerTest extends TestCase {

	/**
	 * Setup before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		Functions\when( 'rest_authorization_required_code' )->justReturn( 401 );
		Functions\when( 'is_wp_error' )->alias(
			static function ( $thing ) {
				return ( $thing instanceof WP_Error );
			}
		);
		Functions\when( 'sanitize_text_field' )->alias(
			static function ( $str ) {
				return strip_tags( (string) $str );
			}
		);
	}

	/**
	 * Tear down after each test run.
	 */
	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	/**
	 * Test 1: Verifies check_read_permission grants access when user has edit_posts capability.
	 *
	 * @return void
	 */
	public function test_check_read_permission_allows_authorized_user(): void {
		Functions\expect( 'current_user_can' )
			->once()
			->with( 'edit_posts' )
			->andReturn( true );

		$mock_repo  = $this->createMock( SettingsRepositoryInterface::class );
		$controller = new SettingsRestController( $mock_repo );
		$request    = new WP_REST_Request( array( 'id' => 10 ) );

		$this->assertTrue( $controller->check_read_permission( $request ) );
	}

	/**
	 * Test 2: Verifies check_read_permission rejects unauthorized user with 401 rest_forbidden error.
	 *
	 * @return void
	 */
	public function test_check_read_permission_rejects_unauthorized_user(): void {
		Functions\expect( 'current_user_can' )
			->once()
			->with( 'edit_posts' )
			->andReturn( false );

		$mock_repo  = $this->createMock( SettingsRepositoryInterface::class );
		$controller = new SettingsRestController( $mock_repo );
		$request    = new WP_REST_Request( array( 'id' => 10 ) );

		$result = $controller->check_read_permission( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'rest_forbidden', $result->get_error_code() );
		$this->assertSame( array( 'status' => 401 ), $result->get_error_data() );
	}

	/**
	 * Test 3: Verifies check_write_permission rejects unauthorized user.
	 *
	 * @return void
	 */
	public function test_check_write_permission_rejects_unauthorized_user(): void {
		Functions\expect( 'current_user_can' )
			->once()
			->with( 'edit_posts' )
			->andReturn( false );

		$mock_repo  = $this->createMock( SettingsRepositoryInterface::class );
		$controller = new SettingsRestController( $mock_repo );
		$request    = new WP_REST_Request( array( 'id' => 10 ) );

		$result = $controller->check_write_permission( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'rest_forbidden', $result->get_error_code() );
	}

	/**
	 * Test 4: Verifies get_settings returns 404 WP_Error when target series term does not exist.
	 *
	 * @return void
	 */
	public function test_get_settings_returns_404_when_series_not_found(): void {
		Functions\expect( 'get_term' )
			->once()
			->with( 999, 'series' )
			->andReturn( false );

		$mock_repo  = $this->createMock( SettingsRepositoryInterface::class );
		$controller = new SettingsRestController( $mock_repo );
		$request    = new WP_REST_Request( array( 'id' => 999 ) );

		$response = $controller->get_settings( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'series_not_found', $response->get_error_code() );
		$this->assertSame( array( 'status' => 404 ), $response->get_error_data() );
	}

	/**
	 * Test 5: Verifies get_settings resolves defaults from repository when meta is empty.
	 *
	 * @return void
	 */
	public function test_get_settings_returns_200_and_resolves_repository_default_layout(): void {
		Functions\expect( 'get_term' )
			->once()
			->with( 15, 'series' )
			->andReturn( (object) array( 'term_id' => 15, 'name' => 'Architecture Series' ) );

		Functions\expect( 'get_term_meta' )
			->once()
			->with( 15, SettingsRestController::TERM_SETTINGS_META_KEY, true )
			->andReturn( false );

		$mock_repo = $this->createMock( SettingsRepositoryInterface::class );
		$mock_repo->expects( $this->once() )
			->method( 'get_default_layout' )
			->willReturn( 'media-grid' );

		$controller = new SettingsRestController( $mock_repo );
		$request    = new WP_REST_Request( array( 'id' => 15 ) );

		$response = $controller->get_settings( $request );

		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();
		$this->assertSame( 15, $data['term_id'] );
		$this->assertSame( 'media-grid', $data['layout'] );
		$this->assertSame( array(), $data['custom_styles'] );
	}

	/**
	 * Test 6: Verifies update_settings returns 400 Bad Request error when layout is invalid.
	 *
	 * @return void
	 */
	public function test_update_settings_returns_400_for_invalid_layout(): void {
		Functions\expect( 'get_term' )
			->once()
			->with( 15, 'series' )
			->andReturn( (object) array( 'term_id' => 15 ) );

		Functions\expect( 'get_term_meta' )
			->once()
			->with( 15, SettingsRestController::TERM_SETTINGS_META_KEY, true )
			->andReturn( array() );

		$mock_repo  = $this->createMock( SettingsRepositoryInterface::class );
		$controller = new SettingsRestController( $mock_repo );
		$request    = new WP_REST_Request( array( 'id' => 15 ), array( 'layout' => 'unsupported_layout_variant' ) );

		$response = $controller->update_settings( $request );

		$this->assertInstanceOf( WP_Error::class, $response );
		$this->assertSame( 'invalid_layout', $response->get_error_code() );
		$this->assertSame( array( 'status' => 400 ), $response->get_error_data() );
	}

	/**
	 * Test 7: Verifies update_settings sanitizes custom styles and saves valid layout to term meta.
	 *
	 * @return void
	 */
	public function test_update_settings_sanitizes_custom_styles_and_updates_term_meta(): void {
		Functions\expect( 'get_term' )
			->once()
			->with( 20, 'series' )
			->andReturn( (object) array( 'term_id' => 20 ) );

		Functions\expect( 'get_term_meta' )
			->once()
			->with( 20, SettingsRestController::TERM_SETTINGS_META_KEY, true )
			->andReturn( array( 'layout' => 'link-list' ) );

		Functions\expect( 'update_term_meta' )
			->once()
			->with(
				20,
				SettingsRestController::TERM_SETTINGS_META_KEY,
				\Mockery::on(
					static function ( $saved ) {
						return 'media-grid' === $saved['layout']
							&& '#336699' === $saved['custom_styles']['border_color']
							&& 'clean text' === $saved['custom_styles']['label']
							&& '#336699' === $saved['style']['border_color'];
					}
				)
			);

		Functions\expect( 'clean_term_cache' )
			->once()
			->with( 20, 'series' );

		$mock_repo  = $this->createMock( SettingsRepositoryInterface::class );
		$controller = new SettingsRestController( $mock_repo );

		$payload = array(
			'layout'        => 'media-grid',
			'custom_styles' => array(
				'border_color' => '#336699',
				'label'        => '<b>clean text</b>',
			),
		);
		$request = new WP_REST_Request( array( 'id' => 20 ), $payload );

		$response = $controller->update_settings( $request );

		$this->assertSame( 200, $response->get_status() );
		$data = $response->get_data();
		$this->assertTrue( $data['success'] );
		$this->assertSame( 20, $data['term_id'] );
		$this->assertSame( 'media-grid', $data['settings']['layout'] );
		$this->assertSame( 'clean text', $data['settings']['custom_styles']['label'] );
	}
}
