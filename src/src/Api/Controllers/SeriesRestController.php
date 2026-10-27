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
	 * Registers REST routes for series order management and series listings.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		$series_list_route = array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_series' ),
				'permission_callback' => array( $this, 'check_read_series_permission' ),
				'args'                => array(
					'mode'   => array(
						'description' => 'Display mode (all, top, user, topics).',
						'type'        => 'string',
						'default'     => 'all',
					),
					'limit'  => array(
						'description' => 'Maximum number of series to return.',
						'type'        => 'integer',
						'default'     => 5,
					),
					'userId' => array(
						'description' => 'User ID for filtering by author.',
						'type'        => 'string',
						'default'     => '',
					),
				),
			),
		);

		// Register on primary namespace ('series-craft/v1').
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			$series_list_route
		);

		// Register on alias namespace ('seriescraft/v1') for block and client compatibility.
		register_rest_route(
			'seriescraft/v1',
			'/' . $this->rest_base,
			$series_list_route
		);

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

		register_rest_route(
			'seriescraft/v1',
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

		$series_posts_route = array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_series_posts' ),
				'permission_callback' => array( $this, 'check_read_series_permission' ),
				'args'                => array(
					'id'     => array(
						'description' => 'Unique identifier for the series term.',
						'type'        => 'integer',
						'required'    => true,
					),
					'status' => array(
						'description' => 'Allowed post statuses (comma-separated or array).',
						'type'        => 'string',
						'default'     => 'publish,draft,pending',
					),
				),
			),
		);

		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<id>[\d]+)/posts',
			$series_posts_route
		);

		register_rest_route(
			'seriescraft/v1',
			'/' . $this->rest_base . '/(?P<id>[\d]+)/posts',
			$series_posts_route
		);
	}

	/**
	 * Checks whether the current user has permission to read series listing.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return bool True.
	 */
	public function check_read_series_permission( WP_REST_Request $request ): bool {
		return true;
	}

	/**
	 * Retrieves list of series terms based on display mode and limit.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response Response object with series array.
	 */
	public function get_series( WP_REST_Request $request ): WP_REST_Response {
		$mode    = sanitize_text_field( (string) ( $request->get_param( 'mode' ) ? $request->get_param( 'mode' ) : 'all' ) );
		$limit   = (int) ( $request->get_param( 'limit' ) ? $request->get_param( 'limit' ) : 5 );
		$user_id = sanitize_text_field( (string) ( $request->get_param( 'userId' ) ? $request->get_param( 'userId' ) : '' ) );

		$args = array(
			'taxonomy'   => SeriesTaxonomy::TAXONOMY,
			'hide_empty' => ( 'top' === $mode ),
		);

		if ( 'top' === $mode ) {
			$args['orderby'] = 'count';
			$args['order']   = 'DESC';
			$args['number']  = $limit > 0 ? $limit : 5;
		} else {
			$args['orderby'] = 'name';
			$args['order']   = 'ASC';
			if ( $limit > 0 && ( 'user' === $mode || 'topics' === $mode ) ) {
				$args['number'] = $limit;
			}
		}

		$terms = get_terms( $args );

		if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
			return new WP_REST_Response( array(), 200 );
		}

		$results = array();
		foreach ( $terms as $term ) {
			if ( ! is_object( $term ) || ! isset( $term->term_id ) ) {
				continue;
			}
			$results[] = array(
				'id'    => (int) $term->term_id,
				'name'  => (string) $term->name,
				'slug'  => (string) $term->slug,
				'count' => (int) $term->count,
			);
		}

		return new WP_REST_Response( $results, 200 );
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

	/**
	 * Retrieves posts belonging to a specific series, querying valid post statuses.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return WP_REST_Response Response object with posts array.
	 */
	public function get_series_posts( WP_REST_Request $request ): WP_REST_Response {
		$term_id      = (int) $request->get_param( 'id' );
		$status_param = $request->get_param( 'status' ) ? $request->get_param( 'status' ) : 'publish,draft,pending';

		$statuses = is_array( $status_param )
			? $status_param
			: array_map( 'trim', explode( ',', (string) $status_param ) );
		$statuses = array_filter( $statuses );
		if ( empty( $statuses ) ) {
			$statuses = array( 'publish', 'draft', 'pending' );
		}

		$term = get_term( $term_id, SeriesTaxonomy::TAXONOMY );
		if ( ! $term || is_wp_error( $term ) ) {
			return new WP_REST_Response( array(), 200 );
		}

		$posts = $this->series_repository->get_series_posts( $term_id, $statuses );

		$results = array();
		foreach ( $posts as $index => $post ) {
			$post_id   = (int) $post->ID;
			$title     = function_exists( 'get_the_title' ) ? get_the_title( $post_id ) : ( $post->post_title ?? '' );
			$results[] = array(
				'id'         => $post_id,
				'title'      => array(
					'rendered' => (string) $title,
				),
				'status'     => (string) ( $post->post_status ?? 'publish' ),
				'part_order' => $index + 1,
			);
		}

		return new WP_REST_Response( $results, 200 );
	}
}
