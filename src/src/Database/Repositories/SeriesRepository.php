<?php
/**
 * SeriesRepository file.
 *
 * @package SeriesCraft\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Database\Repositories;

use SeriesCraft\Services\ThumbnailResolver;
use SeriesCraft\Taxonomy\SeriesTaxonomy;
use wpdb;
use WP_Post;
use WP_Term;

/**
 * Class SeriesRepository
 *
 * Implements data access operations for series terms and explicit post ordering.
 * Uses the custom series_craft_posts junction table as the exclusive source of truth.
 *
 * @package SeriesCraft\Database\Repositories
 */
class SeriesRepository implements SeriesRepositoryInterface {



	/**
	 * WordPress database abstraction instance.
	 *
	 * @var wpdb|null
	 */
	private ?wpdb $wpdb = null;

	/**
	 * Target table name.
	 *
	 * @var string
	 */
	private string $table_name;

	/**
	 * Constructor.
	 *
	 * @param wpdb|null $wpdb Optional WordPress database instance for dependency injection.
	 */
	public function __construct( ?wpdb $wpdb = null ) {
		if ( null !== $wpdb ) {
			$this->wpdb = $wpdb;
		} else {
			global $wpdb;
			$this->wpdb = $wpdb;
		}

		$prefix           = ($this->wpdb && isset( $this->wpdb->prefix )) ? $this->wpdb->prefix : 'wp_';
		$this->table_name = $prefix . 'series_craft_posts';
	}

	/**
	 * Retrieves the fully qualified target table name.
	 *
	 * @return string
	 */
	public function get_table_name(): string {
		return $this->table_name;
	}

	/**
	 * Retrieves all posts assigned to a series ordered explicitly by numerical position.
	 *
	 * Queries the custom series_craft_posts table as the exclusive source of truth.
	 *
	 * @param int           $term_id  Series taxonomy term ID.
	 * @param array<string> $statuses Post statuses to include. Defaults to array( 'publish', 'draft', 'pending' ).
	 * @return array<WP_Post> Ordered list of WP_Post objects.
	 */
	public function get_series_posts( int $term_id, array $statuses = array( 'publish', 'draft', 'pending' ) ): array {
		if ( ! $this->wpdb ) {
			return array();
		}

		if ( empty( $statuses ) ) {
			$statuses = array( 'publish', 'draft', 'pending' );
		}

		$sanitized_statuses = array();
		foreach ( $statuses as $status ) {
			if ( is_string( $status ) && '' !== trim( $status ) ) {
				$sanitized_statuses[] = trim( $status );
			}
		}

		if ( empty( $sanitized_statuses ) ) {
			$sanitized_statuses = array( 'publish', 'draft', 'pending' );
		}

		$placeholders = implode( ', ', array_fill( 0, count( $sanitized_statuses ), '%s' ) );
		$table_name   = $this->get_table_name();

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$results = $this->wpdb->get_results(
			$this->wpdb->prepare(
				"SELECT p.* FROM {$this->wpdb->posts} p
				INNER JOIN {$table_name} scp ON p.ID = scp.post_id
				WHERE scp.series_id = %d AND p.post_status IN ({$placeholders})
				ORDER BY scp.sort_order ASC, p.post_date ASC",
				array_merge( array( $term_id ), $sanitized_statuses )
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared

		if ( empty( $results ) || ! is_array( $results ) ) {
			return array();
		}

		return array_map( static fn( object $post ): WP_Post => new WP_Post( $post ), $results );
	}

	/**
	 * Persists an explicit numerical order for posts in a specific series.
	 *
	 * Uses $wpdb->replace() on series_craft_posts so records are guaranteed
	 * to be persisted in the dedicated junction table without altering core tables.
	 *
	 * @param int        $term_id  Series taxonomy term ID.
	 * @param array<int> $post_ids Ordered list of post IDs.
	 * @return bool True on success, false on failure.
	 */
	public function update_series_order( int $term_id, array $post_ids ): bool {
		if ( ! $this->wpdb ) {
			return false;
		}

		$term_taxonomy = get_term( $term_id, SeriesTaxonomy::TAXONOMY );
		if ( ! ($term_taxonomy instanceof WP_Term) ) {
			return false;
		}

		$table_name = $this->get_table_name();

		foreach ( $post_ids as $index => $post_id ) {
			$order   = $index + 1;
			$post_id = (int) $post_id;

			// Persist explicit order exclusively to custom table series_craft_posts.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$this->wpdb->replace(
				$table_name,
				array(
					'series_id'  => $term_id,
					'post_id'    => $post_id,
					'sort_order' => $order,
					'created_at' => current_time( 'mysql' ),
				),
				array( '%d', '%d', '%d', '%s' )
			);
		}

		clean_term_cache( $term_id, SeriesTaxonomy::TAXONOMY );

		return true;
	}

	/**
	 * Retrieves all series taxonomy terms assigned to a specific post.
	 *
	 * @param int $post_id Target post ID.
	 * @return array<WP_Term> Array of assigned series WP_Term objects.
	 */
	public function get_post_series( int $post_id ): array {
		/**
		 * Terms assigned to the post.
		 *
		 * @var array<WP_Term>|false $terms
		 */
		$terms = get_the_terms( $post_id, SeriesTaxonomy::TAXONOMY );

		if ( ! is_array( $terms ) ) {
			return array();
		}

		return $terms;
	}

	// phpcs:disable WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	/**
	 * Retrieves formatted series data with posts, layout, and styles for a specific post.
	 *
	 * @param int             $post_id    Target post ID.
	 * @param array<int>|null $series_ids Optional explicit series IDs for editor previews.
	 * @return array<int, array{id: int, name: string, layout: string, styles: array<string, mixed>, posts: array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}>}> Array of series data.
	 */
	public function getSeriesForPost( int $post_id, ?array $series_ids = null ): array {
		/**
		 * Terms assigned to the post.
		 *
		 * @var array<\WP_Term>|\WP_Error $terms
		 */
		if ( null === $series_ids ) {
			$terms = wp_get_post_terms( $post_id, SeriesTaxonomy::TAXONOMY );
		} else {
			$series_ids = array_values( array_unique( array_filter( array_map( 'absint', $series_ids ) ) ) );
			if ( empty( $series_ids ) ) {
				return array();
			}

			$terms = get_terms(
				array(
					'taxonomy'   => SeriesTaxonomy::TAXONOMY,
					'hide_empty' => false,
					'include'    => $series_ids,
				)
			);
			if ( ! is_wp_error( $terms ) && is_array( $terms ) ) {
				$terms_by_id = array();
				foreach ( $terms as $term ) {
					if ( $term instanceof WP_Term ) {
						$terms_by_id[ (int) $term->term_id ] = $term;
					}
				}

				$ordered_terms = array();
				foreach ( $series_ids as $series_id ) {
					if ( isset( $terms_by_id[ $series_id ] ) ) {
						$ordered_terms[] = $terms_by_id[ $series_id ];
					}
				}
				$terms = $ordered_terms;
			}
		}

		if ( is_wp_error( $terms ) || empty( $terms ) || ! is_array( $terms ) ) {
			return array();
		}

		$default_layout = get_option( 'seriescraft_default_layout', '' );
		if ( empty( $default_layout ) ) {
			$default_layout = get_option( 'content_variant', 'link-list' );
		}
		if ( empty( $default_layout ) ) {
			$default_layout = 'link-list';
		}

		$series_data = array();

		foreach ( $terms as $term ) {
			if ( ! ($term instanceof WP_Term) ) {
				continue;
			}

			$term_id       = (int) $term->term_id;
			$meta_settings = get_term_meta( $term_id, 'sm_series_settings', true );
			if ( ! is_array( $meta_settings ) ) {
				if ( is_string( $meta_settings ) ) {
					$decoded       = json_decode( $meta_settings, true );
					$meta_settings = is_array( $decoded ) ? $decoded : array();
				} else {
					$meta_settings = array();
				}
			}

			$layout = ! empty( $meta_settings['layout'] )
				? (string) $meta_settings['layout']
				: ( ! empty( $meta_settings['content_variant'] )
					? (string) $meta_settings['content_variant']
					: (string) $default_layout);

			$styles = (array) ($meta_settings['custom_styles'] ?? ($meta_settings['style'] ?? array()));

			$ordered_posts = $this->get_series_posts( $term_id );
			$posts_data    = array();

			foreach ( $ordered_posts as $index => $post_obj ) {
				$post_content  = isset( $post_obj->post_content ) ? (string) $post_obj->post_content : null;
				$thumbnail_url = ThumbnailResolver::resolve_post_image( (int) $post_obj->ID, $post_content );

				$posts_data[] = array(
					'id'         => (int) $post_obj->ID,
					'title'      => get_the_title( $post_obj->ID ),
					'url'        => (string) get_permalink( $post_obj->ID ),
					'part_order' => $index + 1,
					'thumbnail'  => ! empty( $thumbnail_url ) ? $thumbnail_url : null,
				);
			}

			$series_data[] = array(
				'id'     => $term_id,
				'name'   => (string) $term->name,
				'layout' => $layout,
				'styles' => $styles,
				'posts'  => $posts_data,
			);
		}

		return $series_data;
	}
	// phpcs:enable WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid

	/**
	 * Snake_case alias for getSeriesForPost.
	 *
	 * @param int             $post_id    Target post ID.
	 * @param array<int>|null $series_ids Optional explicit series IDs for editor previews.
	 * @return array<int, array{id: int, name: string, layout: string, styles: array<string, mixed>, posts: array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}>}>
	 */
	public function get_series_for_post( int $post_id, ?array $series_ids = null ): array {
		return $this->getSeriesForPost( $post_id, $series_ids );
	}
}
