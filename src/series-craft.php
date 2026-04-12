<?php
/**
 * Plugin Name:       Series Craft
 * Description:       Create ordered post series with a clean front-end table of contents and next/prev navigation to guide readers through multi-part articles.
 * Version:           0.1.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            Mohamed Elwany
 * Author URI:        mailto:dev.mohamedelwany@gmail.com
 * License:           GPL v3 or later
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain:       series-craft
 * Domain Path:       /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Define plugin constants.
define( 'SCFT_PLUGIN_VERSION', '1.0.0' );
define( 'SCFT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'SCFT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Load Composer autoloader.
if ( file_exists( SCFT_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
	require_once SCFT_PLUGIN_DIR . 'vendor/autoload.php';
}

/**
 * Initialize the plugin
 */
add_action(
	'plugins_loaded',
	function () {
		if ( class_exists( 'SeriesCraft\\Core\\Main' ) ) {
			( new \SeriesCraft\Core\Main() )->init();
		}
	}
);
