<?php
/**
 * SeriesSettingsTest integration test suite.
 *
 * @package SeriesCraft\Tests\Integration\Admin
 */

declare(strict_types=1);

namespace SeriesCraft\Tests\Integration\Admin;

use SeriesCraft\Admin\AdminPage;
use SeriesCraft\Admin\SeriesSettingsPage;
use SeriesCraft\Admin\SettingsSanitizer;
use SeriesCraft\Database\Repositories\SettingsRepository;
use SeriesCraft\Tests\Integration\IntegrationTestCase;

/**
 * Class SeriesSettingsTest
 *
 * Integration test suite for Admin Settings and Configuration layer.
 * Validates repository persistence, legacy migration fallbacks, sanitizer whitelist rules,
 * menu registration, security capabilities, and view template rendering.
 */
class SeriesSettingsTest extends IntegrationTestCase {

	/**
	 * Repository instance under test.
	 *
	 * @var SettingsRepository
	 */
	private SettingsRepository $repository;

	/**
	 * Settings page controller under test.
	 *
	 * @var SeriesSettingsPage
	 */
	private SeriesSettingsPage $settings_page;

	/**
	 * Created test administrator user ID.
	 *
	 * @var int
	 */
	private int $admin_user_id = 0;

	/**
	 * Setup before each test run.
	 */
	protected function setUp(): void {
		parent::setUp();

		if ( ! function_exists( 'wp_delete_user' ) && defined( 'ABSPATH' ) && file_exists( ABSPATH . 'wp-admin/includes/user.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/user.php';
		}

		if ( ! function_exists( 'submit_button' ) && defined( 'ABSPATH' ) && file_exists( ABSPATH . 'wp-admin/includes/template.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/template.php';
		}

		$this->repository    = new SettingsRepository();
		$this->settings_page = new SeriesSettingsPage( $this->repository );

		// Clean options state.
		delete_option( SettingsRepository::OPTION_SUPPORTED_POST_TYPES );
		delete_option( SettingsRepository::LEGACY_OPTION_SUPPORTED_POST_TYPES );
		delete_option( SettingsRepository::OPTION_DEFAULT_LAYOUT );
		delete_option( SettingsRepository::LEGACY_OPTION_DEFAULT_LAYOUT );

		// Create an administrator user for capability-protected tests.
		$user_login = 'test_admin_' . wp_generate_password( 6, false );
		$user_email = $user_login . '@example.com';
		$user_id    = wp_create_user( $user_login, 'password123', $user_email );

		if ( ! is_wp_error( $user_id ) ) {
			$this->admin_user_id = $user_id;
			$user                = get_user_by( 'id', $user_id );
			if ( $user ) {
				$user->add_role( 'administrator' );
			}
		}
	}

	/**
	 * Clean up state after each test.
	 */
	protected function tearDown(): void {
		wp_set_current_user( 0 );

		if ( $this->admin_user_id > 0 && function_exists( 'wp_delete_user' ) ) {
			wp_delete_user( $this->admin_user_id );
		}

		delete_option( SettingsRepository::OPTION_SUPPORTED_POST_TYPES );
		delete_option( SettingsRepository::LEGACY_OPTION_SUPPORTED_POST_TYPES );
		delete_option( SettingsRepository::OPTION_DEFAULT_LAYOUT );
		delete_option( SettingsRepository::LEGACY_OPTION_DEFAULT_LAYOUT );

		unset( $_GET['tab'], $_GET['settings-updated'] );
		unset( $_POST[ SeriesSettingsPage::NONCE_NAME_CPT ], $_POST[ SeriesSettingsPage::NONCE_NAME_LAYOUT ] );
		unset( $_POST['supported_post_types'], $_POST['seriescraft_default_layout'], $_POST['content_variant'] );

		parent::tearDown();
	}

	/**
	 * Test 1: Verifies repository returns default supported post types when no options are set in database.
	 */
	public function test_01_repository_returns_default_supported_post_types(): void {
		$post_types = $this->repository->get_supported_post_types();

		$this->assertSame(
			array( 'post' ),
			$post_types,
			'Failed: Expected default supported post types to be array("post").'
		);
	}

	/**
	 * Test 2: Verifies repository falls back to legacy sm_supported_post_types when modern key is absent.
	 */
	public function test_02_repository_reads_legacy_supported_post_types_fallback(): void {
		update_option( SettingsRepository::LEGACY_OPTION_SUPPORTED_POST_TYPES, array( 'post', 'page' ) );

		$post_types = $this->repository->get_supported_post_types();

		$this->assertSame(
			array( 'post', 'page' ),
			$post_types,
			'Failed: Did not fall back to legacy sm_supported_post_types key.'
		);
	}

	/**
	 * Test 3: Verifies repository persists and retrieves supported post types using seriescraft_supported_post_types.
	 */
	public function test_03_repository_persists_and_retrieves_supported_post_types(): void {
		$saved = $this->repository->set_supported_post_types( array( 'post', 'page', 'custom_book' ) );

		$this->assertTrue( $saved, 'Failed: set_supported_post_types returned false.' );
		$this->assertSame(
			array( 'post', 'page', 'custom_book' ),
			$this->repository->get_supported_post_types(),
			'Failed: Persisted supported post types do not match.'
		);

		// Verify database option key directly.
		$direct_option = get_option( SettingsRepository::OPTION_SUPPORTED_POST_TYPES );
		$this->assertSame( array( 'post', 'page', 'custom_book' ), $direct_option );
	}

	/**
	 * Test 4: Verifies repository returns default layout when no layout option is configured.
	 */
	public function test_04_repository_returns_default_layout(): void {
		$default_layout = $this->repository->get_default_layout();

		$this->assertSame(
			'link-list',
			$default_layout,
			'Failed: Expected default layout to be "link-list".'
		);
	}

	/**
	 * Test 5: Verifies repository falls back to legacy content_variant option when modern key is absent.
	 */
	public function test_05_repository_reads_legacy_content_variant_fallback(): void {
		update_option( SettingsRepository::LEGACY_OPTION_DEFAULT_LAYOUT, 'media-grid' );

		$layout = $this->repository->get_default_layout();

		$this->assertSame(
			'media-grid',
			$layout,
			'Failed: Did not fall back to legacy content_variant key.'
		);
	}

	/**
	 * Test 6: Verifies repository persists and retrieves default layout using seriescraft_default_layout.
	 */
	public function test_06_repository_persists_and_retrieves_default_layout(): void {
		$saved = $this->repository->set_default_layout( 'media-list' );

		$this->assertTrue( $saved, 'Failed: set_default_layout returned false.' );
		$this->assertSame(
			'media-list',
			$this->repository->get_default_layout(),
			'Failed: Persisted layout does not match.'
		);

		$direct_option = get_option( SettingsRepository::OPTION_DEFAULT_LAYOUT );
		$this->assertSame( 'media-list', $direct_option );
	}

	/**
	 * Test 7: Verifies SettingsSanitizer sanitizes and validates post types against allowed candidates.
	 */
	public function test_07_sanitizer_validates_post_types_against_allowed_list(): void {
		$allowed = array( 'post', 'page', 'tutorial' );
		$input   = array( 'post', 'tutorial', 'invalid_unregistered_cpt', '<script>alert(1)</script>' );

		$sanitized = SettingsSanitizer::sanitize_post_types( $input, $allowed );

		$this->assertSame(
			array( 'post', 'tutorial' ),
			$sanitized,
			'Failed: Sanitizer did not filter out invalid or unregistered post types.'
		);

		// Non-array input fallback.
		$fallback = SettingsSanitizer::sanitize_post_types( 'not_an_array', $allowed );
		$this->assertSame( array( 'post' ), $fallback );
	}

	/**
	 * Test 8: Verifies SettingsSanitizer validates and restricts layout variants against permitted whitelist.
	 */
	public function test_08_sanitizer_restricts_layout_to_allowed_whitelist(): void {
		$valid_layouts = array( 'media-grid', 'link-grid', 'media-list', 'link-list' );

		foreach ( $valid_layouts as $valid ) {
			$this->assertSame( $valid, SettingsSanitizer::sanitize_layout( $valid ) );
		}

		// Invalid values must fall back to default.
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( 'unsupported_custom_layout' ) );
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( 12345 ) );
		$this->assertSame( 'link-list', SettingsSanitizer::sanitize_layout( null ) );
	}

	/**
	 * Test 9: Verifies SeriesSettingsPage retrieves eligible public post types excluding internal types.
	 */
	public function test_09_eligible_post_types_excludes_attachments_and_revisions(): void {
		$eligible = $this->settings_page->get_eligible_post_types();

		$this->assertArrayHasKey( 'post', $eligible, 'Failed: "post" must be in eligible post types.' );
		$this->assertArrayNotHasKey( 'attachment', $eligible, 'Failed: "attachment" must not be eligible.' );
		$this->assertArrayNotHasKey( 'revision', $eligible, 'Failed: "revision" must not be eligible.' );
		$this->assertArrayNotHasKey( 'nav_menu_item', $eligible, 'Failed: "nav_menu_item" must not be eligible.' );
	}

	/**
	 * Test 10: Verifies AdminPage registers the top-level menu under series-craft and connects settings page.
	 */
	public function test_10_admin_page_registers_menu_and_connects_settings(): void {
		$admin_page = new AdminPage( $this->settings_page );
		$admin_page->init();

		$this->assertNotFalse(
			has_action( 'admin_menu', array( $admin_page, 'add_menu_page' ) ),
			'Failed: admin_menu action is not registered in AdminPage.'
		);

		$this->assertSame(
			$this->settings_page,
			$admin_page->get_settings_page(),
			'Failed: AdminPage did not store the settings page instance.'
		);

		wp_set_current_user( $this->admin_user_id );
		ob_start();
		$admin_page->render_admin_page();
		$output = ob_get_clean();
		$this->assertStringContainsString( 'SeriesCraft Settings', $output );
	}

	/**
	 * Test 11: Verifies SeriesSettingsPage registers admin hooks for saving settings.
	 */
	public function test_11_settings_page_registers_save_hooks(): void {
		$this->settings_page->register();

		$this->assertFalse(
			has_action( 'admin_menu', array( $this->settings_page, 'add_menu_page' ) ),
			'Failed: admin_menu must be registered only by AdminPage, not by SeriesSettingsPage.'
		);

		$this->assertNotFalse(
			has_action( 'admin_init', array( $this->settings_page, 'handle_cpt_save' ) ),
			'Failed: admin_init action for handle_cpt_save is not registered.'
		);

		$this->assertNotFalse(
			has_action( 'admin_init', array( $this->settings_page, 'handle_layout_save' ) ),
			'Failed: admin_init action for handle_layout_save is not registered.'
		);

		$this->assertNotFalse(
			has_action( 'admin_enqueue_scripts', array( $this->settings_page, 'enqueue_admin_assets' ) ),
			'Failed: admin_enqueue_scripts action for enqueue_admin_assets is not registered.'
		);
	}

	/**
	 * Test 12: Verifies process_cpt_submission sanitizes and persists valid post types.
	 */
	public function test_12_process_cpt_submission_persists_valid_types(): void {
		$raw_types = array( 'post', 'page', 'non_existent_cpt' );
		$saved     = $this->settings_page->process_cpt_submission( $raw_types );

		$this->assertContains( 'post', $saved );
		$this->assertNotContains( 'non_existent_cpt', $saved );
		$this->assertSame( $saved, $this->repository->get_supported_post_types() );
	}

	/**
	 * Test 13: Verifies process_layout_submission sanitizes and persists valid layout choice.
	 */
	public function test_13_process_layout_submission_persists_valid_choice(): void {
		$saved = $this->settings_page->process_layout_submission( 'media-grid' );

		$this->assertSame( 'media-grid', $saved );
		$this->assertSame( 'media-grid', $this->repository->get_default_layout() );

		// Invalid choice fallback.
		$fallback = $this->settings_page->process_layout_submission( 'invalid_layout' );
		$this->assertSame( 'media-grid', $fallback, 'Failed: Should retain previous valid layout as fallback.' );
	}

	/**
	 * Test 14: Verifies render method outputs Custom Post Types tab markup for authorized administrators.
	 */
	public function test_14_render_outputs_custom_post_types_tab(): void {
		wp_set_current_user( $this->admin_user_id );

		ob_start();
		$this->settings_page->render();
		$output = ob_get_clean();

		$this->assertNotEmpty( $output );
		$this->assertStringContainsString( 'SeriesCraft Settings', $output );
		$this->assertStringContainsString( 'Supported Post Types', $output );
		$this->assertStringContainsString( 'name="supported_post_types[]"', $output );
		$this->assertStringContainsString( 'value="post"', $output );
		$this->assertStringNotContainsString( 'sm-layouts-cards', $output, 'Failed: Layouts tab markup must not render on the CPT tab.' );
	}

	/**
	 * Test 15: Verifies render method outputs Layouts tab with wireframe cards when tab=layouts.
	 */
	public function test_15_render_outputs_layouts_tab_with_wireframe_cards(): void {
		wp_set_current_user( $this->admin_user_id );
		$_GET['tab'] = 'layouts';

		ob_start();
		$this->settings_page->render();
		$output = ob_get_clean();

		$this->assertNotEmpty( $output );
		$this->assertStringContainsString( 'Default Post Layout', $output );
		$this->assertStringContainsString( 'Media Grid Layout', $output );
		$this->assertStringContainsString( 'Link Grid Layout', $output );
		$this->assertStringContainsString( 'Media List', $output );
		$this->assertStringContainsString( 'Link List', $output );
		$this->assertStringContainsString( 'name="content_variant"', $output );
		$this->assertStringContainsString( 'sm-layouts-cards', $output );
		$this->assertStringNotContainsString( 'name="supported_post_types[]"', $output, 'Failed: CPT tab markup must not render on the Layouts tab.' );
	}

	/**
	 * Test 16: Verifies render method does not output markup when current user lacks manage_options capability.
	 */
	public function test_16_render_denies_unauthorized_users(): void {
		// Log in as user without manage_options (subscriber).
		$sub_id = wp_create_user( 'subscriber_test', 'pass123', 'sub@example.com' );
		wp_set_current_user( $sub_id );

		ob_start();
		$this->settings_page->render();
		$output = ob_get_clean();

		$this->assertEmpty( $output, 'Failed: Render must output nothing for unauthorized users.' );

		if ( function_exists( 'wp_delete_user' ) ) {
			wp_delete_user( $sub_id );
		}
	}

	/**
	 * Test 17: Verifies enqueue_admin_assets enqueues Google fonts, Material symbols, and stylesheet on settings screen.
	 */
	public function test_17_enqueues_fonts_and_styles_only_on_settings_page(): void {
		// Non-matching screen should not enqueue.
		$this->settings_page->enqueue_admin_assets( 'edit.php' );
		$this->assertFalse( wp_style_is( 'seriescraft-admin-settings', 'enqueued' ) );

		// Settings screen hook suffix.
		$this->settings_page->enqueue_admin_assets( 'toplevel_page_series-craft' );
		$this->assertTrue( wp_style_is( 'seriescraft-inter-font', 'enqueued' ) );
		$this->assertTrue( wp_style_is( 'seriescraft-material-symbols', 'enqueued' ) );
		$this->assertTrue( wp_style_is( 'seriescraft-admin-settings', 'enqueued' ) );
	}
}
