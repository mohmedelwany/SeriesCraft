<?php
/**
 * SeriesRestController class definition.
 *
 * @package SeriesCraft\Api\Controllers
 */

declare(strict_types=1);

namespace SeriesCraft\Api\Controllers;

use SeriesCraft\Database\Repositories\SeriesRepositoryInterface;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use WP_Error;
use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

/**
 * Class SeriesRestController
 *
 * Endpoint controller for series ordering, posts, and terms.
 */
class SeriesRestController extends WP_REST_Controller {

	/**
	 * Repository instance for series persistence.
	 *
	 * @var SeriesRepositoryInterface
	 */
	private SeriesRepositoryInterface $series_repository;

	/**
	 * Constructor.
	 *
	 * @param SeriesRepositoryInterface $series_repository Repository instance.
	 */
	public function __construct( SeriesRepositoryInterface $series_repository ) {
		$this->namespace         = 'series-craft/v1';
		$this->rest_base         = 'series';
		$this->series_repository = $series_repository;
	}

	/**
	 * Registers REST routes for series order management.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)/order',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_order' ),
					'permission_callback' => array( $this, 'check_permission' ),
					'args'                => array(
						'id'       => array(
							'description' => 'Unique identifier for the series term.',
							'type'        => 'integer',
							'required'    => true,
						),
						'post_ids' => array(
							'description'       => 'Ordered array of post IDs.',
							'type'              => 'array',
							'required'          => true,
							'validate_callback' => static function ( $param ): bool {
								return is_array( $param );
							},
						),
					),
				),
			)
		);
	}

	/**
	 * Checks whether the current user has permission to update series order.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return bool|WP_Error True if authorized, WP_Error otherwise.
	 */
	public function check_permission( WP_REST_Request $request ) {
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'rest_forbidden',
				'You do not have permission to edit series order.',
				array( 'status' => rest_authorization_required_code() )
			);
		}

		return true;
	}

	/**
	 * Updates the sequential order of posts for a specific series.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response|WP_Error Response object on success, WP_Error on failure.
	 */
	public function update_order( WP_REST_Request $request ) {
		$term_id  = (int) $request->get_param( 'id' );
		$post_ids = $request->get_param( 'post_ids' );

		if ( ! is_array( $post_ids ) ) {
			return new WP_Error(
				'invalid_payload',
				'The post_ids parameter must be an array of integers.',
				array( 'status' => 400 )
			);
		}

		$term = get_term( $term_id, SeriesTaxonomy::TAXONOMY );
		if ( ! $term || is_wp_error( $term ) ) {
			return new WP_Error(
				'series_not_found',
				'The specified series term was not found.',
				array( 'status' => 404 )
			);
		}

		$sanitized_ids = array_map( 'intval', $post_ids );
		$sanitized_ids = array_filter( $sanitized_ids, static fn( int $id ): bool => $id > 0 );

		$updated = $this->series_repository->update_series_order( $term_id, $sanitized_ids );

		if ( ! $updated ) {
			return new WP_Error(
				'update_failed',
				'Failed to persist series post ordering.',
				array( 'status' => 500 )
			);
		}

		return new WP_REST_Response(
			array(
				'success' => true,
				'term_id' => $term_id,
				'updated' => count( $sanitized_ids ),
			),
			200
		);
	}
}