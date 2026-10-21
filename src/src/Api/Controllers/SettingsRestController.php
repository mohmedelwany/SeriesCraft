<?php
/**
 * SettingsRestController class definition.
 *
 * @package SeriesCraft\Api\Controllers
 */

declare(strict_types=1);

namespace SeriesCraft\Api\Controllers;

use SeriesCraft\Database\Repositories\SettingsRepositoryInterface;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use WP_Error;
use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Class SettingsRestController
 *
 * Endpoint controller for term-level and global plugin settings.
 */
class SettingsRestController extends WP_REST_Controller {

	/**
	 * Meta key used for term-level series settings.
	 */
	public const TERM_SETTINGS_META_KEY = 'sm_series_settings';

	/**
	 * Whitelist of permitted layout variants.
	 */
	private const ALLOWED_LAYOUTS = array(
		'link-list',
		'link-grid',
		'media-list',
		'media-grid',
	);

	/**
	 * Settings repository instance.
	 *
	 * @var SettingsRepositoryInterface
	 */
	private SettingsRepositoryInterface $settings_repository;

	/**
	 * Constructor.
	 *
	 * @param SettingsRepositoryInterface $settings_repository Settings repository.
	 */
	public function __construct( SettingsRepositoryInterface $settings_repository ) {
		$this->namespace           = 'series-craft/v1';
		$this->rest_base           = 'series';
		$this->settings_repository = $settings_repository;
	}

	/**
	 * Registers REST routes for series settings management.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'check_read_permission' ),
					'args'                => array(
						'id' => array(
							'description' => 'Unique identifier for the series term.',
							'type'        => 'integer',
							'required'    => true,
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'check_write_permission' ),
					'args'                => array(
						'id'            => array(
							'description' => 'Unique identifier for the series term.',
							'type'        => 'integer',
							'required'    => true,
						),
						'layout'        => array(
							'description'       => 'Layout variant for the series.',
							'type'              => 'string',
							'required'          => false,
							'validate_callback' => function ( $param ): bool {
								return in_array( $param, self::ALLOWED_LAYOUTS, true );
							},
						),
						'custom_styles' => array(
							'description' => 'Custom color and dimension styles for the series.',
							'type'        => 'object',
							'required'    => false,
						),
						'style'         => array(
							'description' => 'Alias for custom styles.',
							'type'        => 'object',
							'required'    => false,
						),
					),
				),
			)
		);

		register_rest_route(
			'seriescraft/v1',
			'/' . $this->rest_base . '/(?P<id>[\d]+)/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'check_read_permission' ),
					'args'                => array(
						'id' => array(
							'description' => 'Unique identifier for the series term.',
							'type'        => 'integer',
							'required'    => true,
						),
					),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'check_write_permission' ),
				),
			)
		);
	}

	/**
	 * Checks whether the current user has permission to read series settings.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return bool|WP_Error
	 */
	public function check_read_permission( WP_REST_Request $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'rest_forbidden',
				'You do not have permission to view series settings.',
				array( 'status' => rest_authorization_required_code() )
			);
		}

		return true;
	}

	/**
	 * Checks whether the current user has permission to update series settings.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return bool|WP_Error
	 */
	public function check_write_permission( WP_REST_Request $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'rest_forbidden',
				'You do not have permission to edit series settings.',
				array( 'status' => rest_authorization_required_code() )
			);
		}

		return true;
	}

	/**
	 * Retrieves settings for a specific series term.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_settings( WP_REST_Request $request ) {
		$term_id = (int) $request->get_param( 'id' );

		$term = get_term( $term_id, SeriesTaxonomy::TAXONOMY );
		if ( ! $term || is_wp_error( $term ) ) {
			return new WP_Error(
				'series_not_found',
				'The specified series term was not found.',
				array( 'status' => 404 )
			);
		}

		$meta_settings = get_term_meta( $term_id, self::TERM_SETTINGS_META_KEY, true );
		if ( ! is_array( $meta_settings ) ) {
			$meta_settings = array();
		}

		$default_layout = $this->settings_repository->get_default_layout();
		$custom_styles  = $meta_settings['custom_styles'] ?? ( $meta_settings['style'] ?? array() );

		$response_data = array(
			'term_id'       => $term_id,
			'layout'        => $meta_settings['layout'] ?? $default_layout,
			'custom_styles' => $custom_styles,
			'style'         => $custom_styles,
		);

		return new WP_REST_Response( $response_data, 200 );
	}

	/**
	 * Recursively sanitizes style attributes.
	 *
	 * @param array $styles Input style array.
	 * @return array Sanitized array.
	 */
	private function sanitize_styles_recursive( array $styles ): array {
		$sanitized = array();
		foreach ( $styles as $key => $value ) {
			$clean_key = sanitize_key( (string) $key );
			if ( is_array( $value ) ) {
				$sanitized[ $clean_key ] = $this->sanitize_styles_recursive( $value );
			} elseif ( is_scalar( $value ) ) {
				$sanitized[ $clean_key ] = sanitize_text_field( (string) $value );
			}
		}
		return $sanitized;
	}

	/**
	 * Updates settings for a specific series term.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_settings( WP_REST_Request $request ) {
		$term_id = (int) $request->get_param( 'id' );

		$term = get_term( $term_id, SeriesTaxonomy::TAXONOMY );
		if ( ! $term || is_wp_error( $term ) ) {
			return new WP_Error(
				'series_not_found',
				'The specified series term was not found.',
				array( 'status' => 404 )
			);
		}

		$existing_settings = get_term_meta( $term_id, self::TERM_SETTINGS_META_KEY, true );
		if ( ! is_array( $existing_settings ) ) {
			$existing_settings = array();
		}

		$params = $request->get_json_params();
		if ( empty( $params ) ) {
			$params = $request->get_params();
		}

		if ( isset( $params['layout'] ) ) {
			$layout = sanitize_text_field( (string) $params['layout'] );
			if ( ! in_array( $layout, self::ALLOWED_LAYOUTS, true ) ) {
				return new WP_Error(
					'invalid_layout',
					'The provided layout variant is invalid.',
					array( 'status' => 400 )
				);
			}
			$existing_settings['layout'] = $layout;
		}

		$raw_styles = $params['custom_styles'] ?? ( $params['style'] ?? null );
		if ( is_array( $raw_styles ) ) {
			$sanitized_styles                   = $this->sanitize_styles_recursive( $raw_styles );
			$existing_settings['custom_styles'] = $sanitized_styles;
			$existing_settings['style']         = $sanitized_styles;
		}

		update_term_meta( $term_id, self::TERM_SETTINGS_META_KEY, $existing_settings );
		clean_term_cache( $term_id, SeriesTaxonomy::TAXONOMY );

		return new WP_REST_Response(
			array(
				'success'  => true,
				'term_id'  => $term_id,
				'settings' => $existing_settings,
			),
			200
		);
	}
}
