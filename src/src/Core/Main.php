<?php
/**
 * Main plugin class file (Composition Root & Bootstrap Orchestrator).
 *
 * Implements the Subscriber Pattern via `init()`, delegating hook registration
 * to dedicated domain subscribers while enforcing strict separation between
 * REST Controllers and Database Repositories.
 *
 * @package SeriesCraft\Core
 */

declare(strict_types=1);

namespace SeriesCraft\Core;

use SeriesCraft\Admin\AdminPage;
use SeriesCraft\Api\Controllers\SeriesRestController;
use SeriesCraft\Api\Controllers\SettingsRestController;
use SeriesCraft\Assets\EnqueueManager;
use SeriesCraft\Database\LifecycleSubscriber;
use SeriesCraft\Database\Repositories\SeriesRepository;
use SeriesCraft\Database\Repositories\SettingsRepository;
use SeriesCraft\Frontend\FrontendRenderer;
use SeriesCraft\Hooks\SavePostSubscriber;
use SeriesCraft\Services\NavigationService;
use SeriesCraft\Services\StyleSanitizer;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use SeriesCraft\Taxonomy\SeriesTaxonomyAdmin;
use SeriesCraft\Views\AccordionLayout;

/**
 * Main Class.
 */
class Main {

	/**
	 * Asset manager instance.
	 *
	 * @var EnqueueManager
	 */
	private EnqueueManager $enqueue_manager;

	/**
	 * Taxonomy instance.
	 *
	 * @var SeriesTaxonomy
	 */
	private SeriesTaxonomy $taxonomy;

	/**
	 * Save post subscriber instance.
	 *
	 * @var SavePostSubscriber
	 */
	private SavePostSubscriber $save_post_subscriber;

	/**
	 * Frontend renderer instance.
	 *
	 * @var FrontendRenderer
	 */
	private FrontendRenderer $frontend_renderer;

	/**
	 * Lifecycle subscriber instance.
	 *
	 * @var LifecycleSubscriber|null
	 */
	private ?LifecycleSubscriber $lifecycle_subscriber = null;

	/**
	 * Constructor: Initializes core services and injects dependencies.
	 *
	 * @param EnqueueManager|null      $enqueue_manager      Optional injected asset manager.
	 * @param SeriesTaxonomy|null      $taxonomy             Optional injected taxonomy manager.
	 * @param SavePostSubscriber|null  $save_post_subscriber Optional injected save post subscriber.
	 * @param FrontendRenderer|null    $frontend_renderer    Optional injected frontend renderer.
	 * @param LifecycleSubscriber|null $lifecycle_subscriber Optional injected lifecycle subscriber.
	 */
	public function __construct(
		?EnqueueManager $enqueue_manager = null,
		?SeriesTaxonomy $taxonomy = null,
		?SavePostSubscriber $save_post_subscriber = null,
		?FrontendRenderer $frontend_renderer = null,
		?LifecycleSubscriber $lifecycle_subscriber = null
	) {
		$plugin_dir = defined( 'SCFT_PLUGIN_DIR' ) ? SCFT_PLUGIN_DIR : dirname( __DIR__, 2 );
		$plugin_url = defined( 'SCFT_PLUGIN_URL' ) ? SCFT_PLUGIN_URL : '';

		$this->enqueue_manager      = $enqueue_manager ?? new EnqueueManager( $plugin_dir, $plugin_url );
		$this->taxonomy             = $taxonomy ?? new SeriesTaxonomy();
		$this->save_post_subscriber = $save_post_subscriber ?? new SavePostSubscriber();
		$this->lifecycle_subscriber = $lifecycle_subscriber;

		$this->frontend_renderer = $frontend_renderer ?? new FrontendRenderer(
			new SeriesRepository(),
			new NavigationService(),
			new StyleSanitizer(),
			new AccordionLayout()
		);
	}

	/**
	 * Initialize the plugin using the Subscriber Pattern.
	 * Each domain class registers its own WordPress hooks via `register()`.
	 *
	 * Registration Order:
	 *  LifecycleSubscriber : Cleans up orphan records in `wp_series_craft_posts` on post/series deletion.
	 *  SeriesTaxonomy      : Registers the custom series taxonomy in WordPress.
	 *  SavePostSubscriber  : Hooks into `save_post` to sync post-series relations in the junction table.
	 *  EnqueueManager      : Loads isolated CSS & JS bundles for Admin, Editor, and Frontend.
	 *  Frontend & Block    : Hooks `the_content` filter and binds the `series-list` dynamic block to `FrontendRenderer`.
	 *  REST API Routes     : Registers REST endpoints (`SeriesRestController` & `SettingsRestController`).
	 *  Admin Dashboard     : Initializes `SeriesTaxonomyAdmin` and `AdminPage` settings tabs when inside WP Admin.
	 *
	 * @return void
	 */
	public function init(): void {
		// Database Lifecycle Subscriber: Maintain data integrity & clean up orphan records on delete.
		if ( null === $this->lifecycle_subscriber && class_exists( LifecycleSubscriber::class ) ) {
			$this->lifecycle_subscriber = new LifecycleSubscriber();
		}

		if ( null !== $this->lifecycle_subscriber ) {
			$this->lifecycle_subscriber->register();
		}

		// Custom Taxonomy Registration: Register the Series taxonomy on 'init'.
		if ( function_exists( 'did_action' ) && did_action( 'init' ) ) {
			$this->taxonomy->register();
		} else {
			add_action( 'init', array( $this->taxonomy, 'register' ) );
		}

		// Post Save Subscriber: Sync post-series relationship & sort order in `wp_series_craft_posts`.
		$this->save_post_subscriber->register();

		// 4. Asset Loader: Enqueue isolated Admin, Editor, and Frontend CSS/JS bundles.
		$this->enqueue_manager->register();

		// Frontend Content Filter: Automatically inject series navigation/box into `the_content`.
		add_filter( 'the_content', array( $this->frontend_renderer, 'filter_content' ) );

		// Gutenberg Dynamic Block: Register `series-list` block and bind `FrontendRenderer::render_series_block`.
		if ( function_exists( 'register_block_type' ) ) {
			$plugin_dir = defined( 'SCFT_PLUGIN_DIR' ) ? rtrim( (string) SCFT_PLUGIN_DIR, '/\\' ) : dirname( __DIR__, 2 );

			$block_json = $plugin_dir . '/resources/js/blocks/series-list/block.json';
			if ( ! file_exists( $block_json ) ) {
				$block_json = dirname( $plugin_dir ) . '/resources/js/blocks/series-list/block.json';
			}
			if ( file_exists( $block_json ) ) {
				register_block_type(
					$block_json,
					array(
						'render_callback' => array( $this->frontend_renderer, 'render_series_block' ),
					)
				);
			}
		}

				// REST API Endpoints: Register custom `/wp-json/series-craft/v1/` routes.
		if ( function_exists( 'did_action' ) && did_action( 'rest_api_init' ) ) {
			$this->register_rest_routes();
		} else {
			add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		}

		// Admin Dashboard & Taxonomy UI: Initialize only within the WordPress Admin context.
		if ( function_exists( 'is_admin' ) && is_admin() ) {
			$repository = new SeriesRepository();
			( new SeriesTaxonomyAdmin( $repository ) )->register();

			if ( class_exists( AdminPage::class ) ) {
				( new AdminPage() )->init();
			}
		}
	}

	/**
	 * Retrieve the lifecycle subscriber instance.
	 *
	 * @return LifecycleSubscriber|null
	 */
	public function get_lifecycle_subscriber(): ?LifecycleSubscriber {
		return $this->lifecycle_subscriber;
	}

	/**
	 * Registers REST API endpoints with Dependency Injection.
	 *
	 * Architectural Rule (Strict Layer Separation):
	 * - Controllers ONLY handle auth/nonce checks, input sanitization, and HTTP responses.
	 * - Direct SQL / `$wpdb` calls are strictly forbidden outside `Database/Repositories/`.
	 * - `SeriesRepository` exclusively manages `wp_series_craft_posts` (junction table & sort order).
	 * - `SettingsRepository` exclusively manages `sm_series_settings` in `wp_termmeta`.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		// Instantiate isolated Data Access Repositories.
		$series_repo   = new SeriesRepository();
		$settings_repo = new SettingsRepository();

		// Inject repositories into REST Controllers and register routes.
		( new SeriesRestController( $series_repo ) )->register_routes();
		( new SettingsRestController( $settings_repo ) )->register_routes();
	}
}
