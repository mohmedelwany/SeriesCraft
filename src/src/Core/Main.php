<?php
/**
 * Main plugin class file.
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
	 * Constructor.
	 *
	 * @param EnqueueManager|null       $enqueue_manager      Optional injected asset manager.
	 * @param SeriesTaxonomy|null       $taxonomy             Optional injected taxonomy manager.
	 * @param SavePostSubscriber|null   $save_post_subscriber Optional injected save post subscriber.
	 * @param FrontendRenderer|null     $frontend_renderer    Optional injected frontend renderer.
	 * @param LifecycleSubscriber|null  $lifecycle_subscriber Optional injected lifecycle subscriber.
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
	 * Initialize the plugin.
	 *
	 * @return void
	 */
	public function init(): void {
		// Initialize database lifecycle subscriber to maintain data integrity.
		if ( null === $this->lifecycle_subscriber && class_exists( LifecycleSubscriber::class ) ) {
			$this->lifecycle_subscriber = new LifecycleSubscriber();
		}

		if ( null !== $this->lifecycle_subscriber ) {
			$this->lifecycle_subscriber->register();
		}

		if ( function_exists( 'did_action' ) && did_action( 'init' ) ) {
			$this->taxonomy->register();
		} else {
			add_action( 'init', array( $this->taxonomy, 'register' ) );
		}

		// Register post save hook subscriber for series association & junction table persistence.
		$this->save_post_subscriber->register();

		// Register asset loader for editor and frontend.
		$this->enqueue_manager->register();

		// Register frontend series display injection on the_content.
		add_filter( 'the_content', array( $this->frontend_renderer, 'filter_content' ) );

		// Register REST API endpoints.
		if ( function_exists( 'did_action' ) && did_action( 'rest_api_init' ) ) {
			$this->register_rest_routes();
		} else {
			add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		}

		// Register Gutenberg block metadata if available.
		if ( function_exists( 'register_block_type' ) ) {
			$plugin_dir = defined( 'SCFT_PLUGIN_DIR' ) ? SCFT_PLUGIN_DIR : dirname( __DIR__, 2 );
			$block_json = $plugin_dir . '/resources/js/blocks/series-list/block.json';
			if ( ! file_exists( $block_json ) ) {
				$block_json = dirname( $plugin_dir ) . '/resources/js/blocks/series-list/block.json';
			}
			if ( file_exists( $block_json ) ) {
				register_block_type( $block_json );
			}
		}

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
	 * Registers REST API endpoints.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		$series_repo   = new SeriesRepository();
		$settings_repo = new SettingsRepository();

		( new SeriesRestController( $series_repo ) )->register_routes();
		( new SettingsRestController( $settings_repo ) )->register_routes();
	}
}
