<?php
/**
 * Main plugin class file.
 *
 * @package SeriesCraft\Core
 */

declare(strict_types=1);

namespace SeriesCraft\Core;

use SeriesCraft\Admin\AdminPage;
use SeriesCraft\Database\LifecycleSubscriber;

/**
 * Main Class.
 */
class Main {

	/**
	 * Lifecycle subscriber instance.
	 *
	 * @var LifecycleSubscriber|null
	 */
	private ?LifecycleSubscriber $lifecycle_subscriber = null;

	/**
	 * Initialize the plugin.
	 *
	 * @return void
	 */
	public function init(): void {
		// Initialize database lifecycle subscriber to maintain data integrity.
		if ( class_exists( LifecycleSubscriber::class ) ) {
			$this->lifecycle_subscriber = new LifecycleSubscriber();
			$this->lifecycle_subscriber->register();
		}

		// Initialize hooks here.
		add_action( 'init', array( $this, 'register_assets' ) );

		if ( is_admin() ) {
			( new AdminPage() )->init();
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
	 * Register scripts and styles.
	 *
	 * @return void
	 */
	public function register_assets(): void {
		// Register scripts and styles.
	}
}
