<?php
/**
 * EnqueueManager definition.
 *
 * @package SeriesCraft\Assets
 */

declare(strict_types=1);

namespace SeriesCraft\Assets;

/**
 * Class EnqueueManager
 *
 * Handles enqueuing of block editor and frontend assets.
 */
class EnqueueManager {

	/**
	 * Plugin directory path.
	 *
	 * @var string
	 */
	private string $plugin_path;

	/**
	 * Plugin directory URL.
	 *
	 * @var string
	 */
	private string $plugin_url;

	/**
	 * Constructor.
	 *
	 * @param string $plugin_path Plugin directory path.
	 * @param string $plugin_url  Plugin directory URL.
	 */
	public function __construct( string $plugin_path, string $plugin_url ) {
		$this->plugin_path = rtrim( $plugin_path, '/\\' );
		$this->plugin_url  = rtrim( $plugin_url, '/\\' );
	}

	/**
	 * Registers WordPress asset enqueue hooks.
	 *
	 * @return void
	 */
	public function register(): void {
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_block_assets' ) );
	}

	/**
	 * Enqueues block editor scripts and styles.
	 *
	 * @return void
	 */
	public function enqueue_editor_assets(): void {
		$script_path = $this->plugin_path . '/assets/js/editor.js';
		$script_url  = $this->plugin_url . '/assets/js/editor.js';
		$asset_file  = $this->plugin_path . '/assets/js/editor.asset.php';
		$style_path  = $this->plugin_path . '/assets/css/editor.css';
		$style_url   = $this->plugin_url . '/assets/css/editor.css';

		if ( ! file_exists( $script_path ) ) {
			$parent_path = dirname( $this->plugin_path );
			if ( file_exists( $parent_path . '/assets/js/editor.js' ) ) {
				$script_path = $parent_path . '/assets/js/editor.js';
				$asset_file  = $parent_path . '/assets/js/editor.asset.php';
				$script_url  = function_exists( 'content_url' )
					? content_url( 'plugins/' . basename( $parent_path ) . '/assets/js/editor.js' )
					: $parent_path . '/assets/js/editor.js';
				$style_path  = $parent_path . '/assets/css/editor.css';
				$style_url   = function_exists( 'content_url' )
					? content_url( 'plugins/' . basename( $parent_path ) . '/assets/css/editor.css' )
					: $parent_path . '/assets/css/editor.css';
			} else {
				return;
			}
		}

		$asset = file_exists( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array(),
				'version'      => '1.0.0',
			);

		wp_enqueue_script(
			'seriescraft-editor',
			$script_url,
			$asset['dependencies'] ?? array(),
			$asset['version'] ?? '1.0.0',
			true
		);

		if ( file_exists( $style_path ) ) {
			wp_enqueue_style(
				'seriescraft-editor-style',
				$style_url,
				array(),
				$asset['version'] ?? '1.0.0'
			);
		}
	}

	/**
	 * Enqueues block assets for editor iframe compatibility.
	 *
	 * @return void
	 */
	public function enqueue_block_assets(): void {
		if ( function_exists( 'is_admin' ) && ! is_admin() ) {
			return;
		}

		$style_path = $this->plugin_path . '/assets/css/editor.css';
		$style_url  = $this->plugin_url . '/assets/css/editor.css';

		if ( ! file_exists( $style_path ) ) {
			$parent_path = dirname( $this->plugin_path );
			if ( file_exists( $parent_path . '/assets/css/editor.css' ) ) {
				$style_path = $parent_path . '/assets/css/editor.css';
				$style_url  = function_exists( 'content_url' )
					? content_url( 'plugins/' . basename( $parent_path ) . '/assets/css/editor.css' )
					: $parent_path . '/assets/css/editor.css';
			} else {
				return;
			}
		}

		if ( file_exists( $style_path ) ) {
			wp_enqueue_style(
				'seriescraft-editor-style',
				$style_url,
				array(),
				'1.0.0'
			);
		}
	}

	/**
	 * Magic caller for camelCase method compatibility.
	 *
	 * @param string $name      Method name.
	 * @param array  $arguments Method arguments.
	 * @return mixed
	 * @throws \BadMethodCallException If method does not exist.
	 */
	public function __call( string $name, array $arguments ) {
		if ( 'enqueueEditorAssets' === $name ) {
			return $this->enqueue_editor_assets( ...$arguments );
		}

		if ( 'enqueueBlockAssets' === $name ) {
			return $this->enqueue_block_assets( ...$arguments );
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped
		throw new \BadMethodCallException( sprintf( 'Call to undefined method %s::%s()', __CLASS__, $name ) );
	}
}
