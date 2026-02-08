<?php
/**
 * Admin Page Class.
 */

namespace SeriesCraft\Admin;

/**
 * AdminPage Class.
 */
class AdminPage {

	/**
	 * Initialize the admin page.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'add_menu_page' ) );
	}

	/**
	 * Add menu page.
	 *
	 * @return void
	 */
	public function add_menu_page() {
		add_menu_page(
			__( 'Series Craft', 'series-craft' ),
			__( 'Series Craft', 'series-craft' ),
			'manage_options',
			'series-craft',
			array( $this, 'render_admin_page' ),
			'dashicons-list-view'
		);
	}

	/**
	 * Render the admin page.
	 *
	 * @return void
	 */
	public function render_admin_page() {
		echo '<div class="wrap"><h1>' . esc_html__( 'Series Craft', 'series-craft' ) . '</h1></div>';
	}
}
