<?php
/**
 * Main plugin class file.
 */

namespace SeriesCraft\Core;

/**
 * Main Class.
 */
class Main {

	/**
	 * Initialize the plugin.
	 *
	 * @return void
	 */
	public function init() {
		// Initialize hooks here.
		add_action( 'init', array( $this, 'register_assets' ) );

		if ( is_admin() ) {
			( new \SeriesCraft\Admin\AdminPage() )->init();
		}
	}

	/**
	 * Register scripts and styles.
	 *
	 * @return void
	 */
	public function register_assets() {
		// Register scripts and styles.
	}
}
