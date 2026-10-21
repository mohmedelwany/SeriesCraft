<?php
/**
 * Admin Page Class.
 *
 * @package SeriesCraft\Admin
 */

declare(strict_types=1);

namespace SeriesCraft\Admin;

/**
 * AdminPage Class.
 *
 * Orchestrates administrative screens and delegates settings to SeriesSettingsPage.
 */
class AdminPage {

	/**
	 * Settings page controller instance.
	 *
	 * @var SeriesSettingsPage
	 */
	private SeriesSettingsPage $settings_page;

	/**
	 * Constructor.
	 *
	 * @param SeriesSettingsPage|null $settings_page Optional settings page instance.
	 */
	public function __construct( ?SeriesSettingsPage $settings_page = null ) {
		$this->settings_page = null !== $settings_page ? $settings_page : new SeriesSettingsPage();
	}

	/**
	 * Initialize the admin page and register hooks.
	 *
	 * AdminPage is the single owner of the admin menu entry; the settings
	 * controller registers only its form-processing and asset hooks.
	 *
	 * @return void
	 */
	public function init(): void {
		add_action( 'admin_menu', array( $this, 'add_menu_page' ) );
		$this->settings_page->register();
	}

	/**
	 * Add the top-level SeriesCraft menu page.
	 *
	 * @return void
	 */
	public function add_menu_page(): void {
		add_menu_page(
			__( 'Series Craft', 'series-craft' ),
			__( 'Series Craft', 'series-craft' ),
			'manage_options',
			SeriesSettingsPage::PAGE_SLUG,
			array( $this, 'render_admin_page' ),
			'dashicons-list-view'
		);
	}

	/**
	 * Render the admin page.
	 *
	 * @return void
	 */
	public function render_admin_page(): void {
		$this->settings_page->render();
	}

	/**
	 * Retrieve settings page instance.
	 *
	 * @return SeriesSettingsPage
	 */
	public function get_settings_page(): SeriesSettingsPage {
		return $this->settings_page;
	}
}
