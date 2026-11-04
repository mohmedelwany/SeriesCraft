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
		add_action( 'admin_init', array( $this, 'add_editor_styles' ) );
		add_filter( 'block_editor_settings_all', array( $this, 'filter_editor_settings' ) );
	}

	/**
	 * Registers editor styles with WordPress for the post canvas iframe.
	 *
	 * @return void
	 */
	public function add_editor_styles(): void {
		if ( ! function_exists( 'add_editor_style' ) ) {
			return;
		}

		add_editor_style( 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200' );

		$frontend_path = $this->plugin_path . '/assets/css/frontend.css';
		$frontend_url  = $this->plugin_url . '/assets/css/frontend.css';

		if ( ! file_exists( $frontend_path ) ) {
			$parent_path = dirname( $this->plugin_path );
			if ( file_exists( $parent_path . '/assets/css/frontend.css' ) ) {
				$frontend_url = function_exists( 'content_url' )
					? content_url( 'plugins/' . basename( $parent_path ) . '/assets/css/frontend.css' )
					: $parent_path . '/assets/css/frontend.css';
			}
		}

		add_editor_style( $frontend_url );
	}

	/**
	 * Injects frontend styles and Google Material Symbols font into block editor settings for iframe canvas.
	 *
	 * @param array $settings Block editor settings.
	 * @return array Modified settings.
	 */
	public function filter_editor_settings( array $settings ): array {
		if ( ! isset( $settings['styles'] ) || ! is_array( $settings['styles'] ) ) {
			$settings['styles'] = array();
		}

		$settings['styles'][] = array(
			'css' => '@import url("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200");',
		);

		$frontend_path = $this->plugin_path . '/assets/css/frontend.css';
		$frontend_url  = $this->plugin_url . '/assets/css/frontend.css';

		if ( ! file_exists( $frontend_path ) ) {
			$parent_path = dirname( $this->plugin_path );
			if ( file_exists( $parent_path . '/assets/css/frontend.css' ) ) {
				$frontend_path = $parent_path . '/assets/css/frontend.css';
				$frontend_url  = function_exists( 'content_url' )
					? content_url( 'plugins/' . basename( $parent_path ) . '/assets/css/frontend.css' )
					: $parent_path . '/assets/css/frontend.css';
			}
		}

		if ( file_exists( $frontend_path ) ) {
			$css_content = file_get_contents( $frontend_path );
			if ( false !== $css_content ) {
				$settings['styles'][] = array(
					'css'     => $css_content,
					'baseURL' => $frontend_url,
				);
			}
		}

		return $settings;
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

		wp_enqueue_style(
			'series-craft-material-symbols',
			'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
			array(),
			null
		);

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

		// Enqueue frontend CSS for editor canvas and display variants.
		$frontend_path = $this->plugin_path . '/assets/css/frontend.css';
		$frontend_url  = $this->plugin_url . '/assets/css/frontend.css';

		if ( ! file_exists( $frontend_path ) ) {
			$parent_path = dirname( $this->plugin_path );
			if ( file_exists( $parent_path . '/assets/css/frontend.css' ) ) {
				$frontend_path = $parent_path . '/assets/css/frontend.css';
				$frontend_url  = function_exists( 'content_url' )
					? content_url( 'plugins/' . basename( $parent_path ) . '/assets/css/frontend.css' )
					: $parent_path . '/assets/css/frontend.css';
			}
		}

		if ( file_exists( $frontend_path ) ) {
			wp_enqueue_style(
				'seriescraft-frontend',
				$frontend_url,
				array(),
				$asset['version'] ?? '1.0.0'
			);

			if ( function_exists( 'add_editor_style' ) ) {
				add_editor_style( $frontend_url );
			}
		}
	}

	/**
	 * Enqueues block assets for editor iframe compatibility.
	 *
	 * @return void
	 */
	public function enqueue_block_assets(): void {
		$frontend_style_path = $this->plugin_path . '/assets/css/frontend.css';
		$frontend_style_url  = $this->plugin_url . '/assets/css/frontend.css';

		if ( ! file_exists( $frontend_style_path ) ) {
			$parent_path = dirname( $this->plugin_path );
			if ( file_exists( $parent_path . '/assets/css/frontend.css' ) ) {
				$frontend_style_path = $parent_path . '/assets/css/frontend.css';
				$frontend_style_url  = function_exists( 'content_url' )
					? content_url( 'plugins/' . basename( $parent_path ) . '/assets/css/frontend.css' )
					: $parent_path . '/assets/css/frontend.css';
			}
		}

		if ( file_exists( $frontend_style_path ) ) {
			wp_enqueue_style(
				'seriescraft-frontend',
				$frontend_style_url,
				array(),
				'1.0.0'
			);
		}

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
