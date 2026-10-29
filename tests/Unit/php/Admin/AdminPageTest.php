<?php
/**
 * AdminPageTest unit test suite.
 *
 * @package SeriesCraft\Tests\Unit\Admin
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Unit\php\Admin;

use Brain\Monkey;
use Brain\Monkey\Actions;
use Brain\Monkey\Functions;
use PHPUnit\Framework\TestCase;
use SeriesCraft\Admin\AdminPage;
use SeriesCraft\Admin\SeriesSettingsPage;

/**
 * Class AdminPageTest
 *
 * Isolated unit test suite for AdminPage orchestrator.
 */
class AdminPageTest extends TestCase {

	/**
	 * Setup before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();
		Monkey\setUp();

		Functions\when( '__' )->returnArg();
	}

	/**
	 * Tear down after each test run.
	 */
	protected function tearDown(): void {
		Monkey\tearDown();
		parent::tearDown();
	}

	/**
	 * Test 1: Verifies that AdminPage::init registers admin_menu hook and delegates to settings page register.
	 *
	 * @return void
	 */
	public function test_init_registers_admin_menu_action_and_settings_page(): void {
		$mock_settings_page = $this->createMock( SeriesSettingsPage::class );
		$mock_settings_page->expects( $this->once() )
			->method( 'register' );

		$admin_page = new AdminPage( $mock_settings_page );

		Actions\expectAdded( 'admin_menu' )
			->once()
			->with( array( $admin_page, 'add_menu_page' ) );

		$admin_page->init();

		$this->assertSame( $mock_settings_page, $admin_page->get_settings_page() );
	}

	/**
	 * Test 2: Verifies that add_menu_page registers the top-level menu with exact arguments.
	 *
	 * @return void
	 */
	public function test_add_menu_page_registers_top_level_menu_with_exact_parameters(): void {
		$mock_settings_page = $this->createMock( SeriesSettingsPage::class );
		$admin_page         = new AdminPage( $mock_settings_page );

		Functions\expect( 'add_menu_page' )
			->once()
			->with(
				'Series Craft',
				'Series Craft',
				'manage_options',
				'series-craft',
				array( $admin_page, 'render_admin_page' ),
				'dashicons-list-view'
			);

		$admin_page->add_menu_page();

		$this->addToAssertionCount( 1 );
	}

	/**
	 * Test 3: Verifies that render_admin_page delegates to SeriesSettingsPage::render.
	 *
	 * @return void
	 */
	public function test_render_admin_page_delegates_to_settings_page_render(): void {
		$mock_settings_page = $this->createMock( SeriesSettingsPage::class );
		$mock_settings_page->expects( $this->once() )
			->method( 'render' );

		$admin_page = new AdminPage( $mock_settings_page );
		$admin_page->render_admin_page();
	}

	/**
	 * Test 4: Verifies that default constructor instantiates a SeriesSettingsPage instance.
	 *
	 * @return void
	 */
	public function test_default_constructor_initializes_settings_page(): void {
		$admin_page = new AdminPage();

		$this->assertInstanceOf( SeriesSettingsPage::class, $admin_page->get_settings_page() );
	}
}
