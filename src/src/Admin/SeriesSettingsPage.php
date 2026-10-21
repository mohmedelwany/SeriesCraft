<?php
/**
 * Plugin admin settings page and configuration controller.
 *
 * @package SeriesCraft\Admin
 */

declare(strict_types=1);

namespace SeriesCraft\Admin;

use SeriesCraft\Database\Repositories\SettingsRepository;
use SeriesCraft\Database\Repositories\SettingsRepositoryInterface;

/**
 * Class SeriesSettingsPage
 *
 * Coordinates administrative settings screen rendering, tab navigation,
 * form submission handling, security verification, and persistence.
 */
class SeriesSettingsPage {

	/**
	 * Settings page query parameter slug.
	 *
	 * @var string
	 */
	public const PAGE_SLUG = 'series-craft';

	/**
	 * Custom Post Types tab slug.
	 *
	 * @var string
	 */
	public const TAB_CPT = 'custom-post-types';

	/**
	 * Layouts tab slug.
	 *
	 * @var string
	 */
	public const TAB_LAYOUTS = 'layouts';

	/**
	 * Whitelist map of tab slugs to their view templates (relative to Views/).
	 *
	 * @var array<string, string>
	 */
	private const TAB_TEMPLATES = array(
		self::TAB_CPT     => 'tab-custom-post-types.php',
		self::TAB_LAYOUTS => 'tab-layouts.php',
	);

	/**
	 * Nonce action for Custom Post Types form.
	 *
	 * @var string
	 */
	public const NONCE_ACTION_CPT = 'seriescraft_save_cpt_action';

	/**
	 * Nonce field name for Custom Post Types form.
	 *
	 * @var string
	 */
	public const NONCE_NAME_CPT = 'seriescraft_cpt_nonce';

	/**
	 * Nonce action for Layouts form.
	 *
	 * @var string
	 */
	public const NONCE_ACTION_LAYOUT = 'seriescraft_save_layout_action';

	/**
	 * Nonce field name for Layouts form.
	 *
	 * @var string
	 */
	public const NONCE_NAME_LAYOUT = 'seriescraft_layout_nonce';

	/**
	 * Settings repository instance.
	 *
	 * @var SettingsRepositoryInterface
	 */
	private SettingsRepositoryInterface $repository;

	/**
	 * Constructor.
	 *
	 * @param SettingsRepositoryInterface|null $repository Settings repository instance.
	 */
	public function __construct( ?SettingsRepositoryInterface $repository = null ) {
		$this->repository = null !== $repository ? $repository : new SettingsRepository();
	}

	/**
	 * Registers WordPress admin hooks for form processing and routes.
	 *
	 * @return void
	 */
	public function register(): void {
		add_action( 'admin_init', array( $this, 'handle_cpt_save' ) );
		add_action( 'admin_init', array( $this, 'handle_layout_save' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
	}

	/**
	 * Enqueue admin scripts and stylesheets on the plugin settings screen.
	 *
	 * @param string $hook_suffix Current admin screen hook suffix.
	 * @return void
	 */
	public function enqueue_admin_assets( string $hook_suffix ): void {
		if ( 'toplevel_page_series-craft' !== $hook_suffix ) {
			return;
		}

		$version = defined( 'SCFT_PLUGIN_VERSION' ) ? SCFT_PLUGIN_VERSION : '1.0.0';

		wp_enqueue_style(
			'seriescraft-inter-font',
			'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
			array(),
			$version
		);

		wp_enqueue_style(
			'seriescraft-material-symbols',
			'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
			array(),
			$version
		);

		// Use content_url to point directly to the physical plugin folder where assets live.
		$css_url = content_url( 'plugins/SeriesCraft/assets/css/admin.css' );

		wp_enqueue_style(
			'seriescraft-admin-settings',
			$css_url,
			array( 'seriescraft-inter-font', 'seriescraft-material-symbols' ),
			$version
		);
	}
	/**
	 * Retrieve repository instance.
	 *
	 * @return SettingsRepositoryInterface
	 */
	public function get_repository(): SettingsRepositoryInterface {
		return $this->repository;
	}

	/**
	 * Retrieves eligible public post types for series integration.
	 *
	 * Filters out internal types like attachments, revisions, and nav menu items.
	 *
	 * @return array<string, \WP_Post_Type> Eligible post types keyed by slug.
	 */
	public function get_eligible_post_types(): array {
		$all_types = get_post_types(
			array(
				'public' => true,
			),
			'objects'
		);

		$excluded = array( 'attachment', 'revision', 'nav_menu_item' );
		$eligible = array();

		foreach ( $all_types as $slug => $post_type_object ) {
			if ( ! in_array( $slug, $excluded, true ) ) {
				$eligible[ $slug ] = $post_type_object;
			}
		}

		return $eligible;
	}

	/**
	 * Handle Custom Post Types form submission.
	 *
	 * @return void
	 */
	public function handle_cpt_save(): void {
		if ( ! isset( $_POST[ self::NONCE_NAME_CPT ] ) ) {
			return;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized access.', 'series-craft' ) );
		}

		$nonce = sanitize_text_field( wp_unslash( $_POST[ self::NONCE_NAME_CPT ] ) );
		if ( ! wp_verify_nonce( $nonce, self::NONCE_ACTION_CPT ) ) {
			wp_die( esc_html__( 'Security check failed.', 'series-craft' ) );
		}

		$raw_types = isset( $_POST['supported_post_types'] ) ? (array) wp_unslash( $_POST['supported_post_types'] ) : array();
		$this->process_cpt_submission( $raw_types );

		$redirect_url = add_query_arg(
			array(
				'page'             => self::PAGE_SLUG,
				'tab'              => self::TAB_CPT,
				'settings-updated' => '1',
			),
			admin_url( 'admin.php' )
		);

		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Process and persist submitted post types.
	 *
	 * @param array<int, string> $raw_types Raw post types from form submission.
	 * @return array<int, string> Sanitized and saved post types.
	 */
	public function process_cpt_submission( array $raw_types ): array {
		$eligible_types = $this->get_eligible_post_types();
		$sanitized      = SettingsSanitizer::sanitize_post_types( $raw_types, array_keys( $eligible_types ) );

		$this->repository->set_supported_post_types( $sanitized );

		return $sanitized;
	}

	/**
	 * Handle Layout Settings form submission.
	 *
	 * @return void
	 */
	public function handle_layout_save(): void {
		if ( ! isset( $_POST[ self::NONCE_NAME_LAYOUT ] ) ) {
			return;
		}

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Unauthorized access.', 'series-craft' ) );
		}

		$nonce = sanitize_text_field( wp_unslash( $_POST[ self::NONCE_NAME_LAYOUT ] ) );
		if ( ! wp_verify_nonce( $nonce, self::NONCE_ACTION_LAYOUT ) ) {
			wp_die( esc_html__( 'Security check failed.', 'series-craft' ) );
		}

		$raw_layout = '';
		if ( isset( $_POST['seriescraft_default_layout'] ) ) {
			$raw_layout = wp_unslash( $_POST['seriescraft_default_layout'] );
		} elseif ( isset( $_POST['content_variant'] ) ) {
			$raw_layout = wp_unslash( $_POST['content_variant'] );
		}

		$this->process_layout_submission( $raw_layout );

		$redirect_url = add_query_arg(
			array(
				'page'             => self::PAGE_SLUG,
				'tab'              => self::TAB_LAYOUTS,
				'settings-updated' => '1',
			),
			admin_url( 'admin.php' )
		);

		wp_safe_redirect( $redirect_url );
		exit;
	}

	/**
	 * Process and persist submitted layout selection.
	 *
	 * @param mixed $raw_layout Raw layout value from form submission.
	 * @return string Sanitized and saved layout slug.
	 */
	public function process_layout_submission( $raw_layout ): string {
		$sanitized = SettingsSanitizer::sanitize_layout( $raw_layout, $this->repository->get_default_layout() );

		$this->repository->set_default_layout( $sanitized );

		return $sanitized;
	}

	/**
	 * Renders the admin settings screen markup.
	 *
	 * @return void
	 */
	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		if ( ! function_exists( 'submit_button' ) && defined( 'ABSPATH' ) && file_exists( ABSPATH . 'wp-admin/includes/template.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/template.php';
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading display tab navigation parameter.
		$current_tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : self::TAB_CPT;

		if ( ! isset( self::TAB_TEMPLATES[ $current_tab ] ) ) {
			$current_tab = self::TAB_CPT;
		}

		// Shell variables.
		$tabs         = array(
			self::TAB_CPT     => __( 'Custom Post Types', 'series-craft' ),
			self::TAB_LAYOUTS => __( 'Layouts', 'series-craft' ),
		);
		$tab_template = __DIR__ . '/Views/' . self::TAB_TEMPLATES[ $current_tab ];
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Reading display updated notice parameter.
		$is_updated = isset( $_GET['settings-updated'] ) && '1' === (string) $_GET['settings-updated'];

		// Tab variables: only the active tab's data is queried and placed in scope.
		if ( self::TAB_LAYOUTS === $current_tab ) {
			$current_layout = $this->repository->get_default_layout();
		} else {
			$eligible_post_types = $this->get_eligible_post_types();
			$supported_types     = $this->repository->get_supported_post_types();
		}

		include __DIR__ . '/Views/settings-page.php';
	}
}
