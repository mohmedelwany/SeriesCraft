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
use WP_Post;
use WP_Term;

/**
 * Class SeriesRepository
 *
 * Implements data access operations for series terms and explicit post ordering.
 * Uses WordPress term_relationships.term_order and synchronizes sm_series_order meta.
 *
 * @package SeriesCraft\Database\Repositories
 */
class SeriesRepository implements SeriesRepositoryInterface {

	/**
	 * Retrieves all posts assigned to a series ordered explicitly by numerical position.
	 *
	 * @param int           $term_id  Series taxonomy term ID.
	 * @param array<string> $statuses Allowed post statuses (defaults to publish, draft, pending).
	 * @return array<WP_Post> Ordered list of WP_Post objects.
	 */
	public function get_series_posts( int $term_id, array $statuses = array( 'publish', 'draft', 'pending' ) ): array {
		global $wpdb;

		if ( empty( $statuses ) ) {
			$statuses = array( 'publish', 'draft', 'pending' );
		}

		$status_placeholders = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );
		$params              = array_merge( array( $term_id, SeriesTaxonomy::TAXONOMY ), $statuses );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT p.* FROM {$wpdb->posts} p
				INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
				INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
				WHERE tt.term_id = %d AND tt.taxonomy = %s AND p.post_status IN ({$status_placeholders})
				ORDER BY tr.term_order ASC, p.post_date ASC",
				...$params
			)
		);
		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQLPlaceholders.ReplacementsWrongNumber

		if ( empty( $results ) ) {
			return array();
		}

		return array_map( static fn( object $post ): WP_Post => new WP_Post( $post ), $results );
	}

	/**
	 * Persists an explicit numerical order for posts in a specific series.
	 *
	 * @param int        $term_id  Series taxonomy term ID.
	 * @param array<int> $post_ids Ordered list of post IDs.
	 * @return bool True on success, false on failure.
	 */
	public function update_series_order( int $term_id, array $post_ids ): bool {
		global $wpdb;

		$term_taxonomy = get_term( $term_id, SeriesTaxonomy::TAXONOMY );
		if ( ! ( $term_taxonomy instanceof WP_Term ) ) {
			return false;
		}

		$term_taxonomy_id = (int) $term_taxonomy->term_taxonomy_id;
		$table_name       = $wpdb->prefix . 'series_craft_posts';

		foreach ( $post_ids as $index => $post_id ) {
			$order = $index + 1;

			// 1. Update term_order in wp_term_relationships.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->update(
				$wpdb->term_relationships,
				array( 'term_order' => $order ),
				array(
					'object_id'        => $post_id,
					'term_taxonomy_id' => $term_taxonomy_id,
				),
				array( '%d' ),
				array( '%d', '%d' )
			);

			// 2. Synchronize custom junction table.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$wpdb->update(
				$table_name,
				array( 'sort_order' => $order ),
				array(
					'series_id' => $term_id,
					'post_id'   => $post_id,
				),
				array( '%d' ),
				array( '%d', '%d' )
			);

			// 3. Synchronize legacy/fallback post meta.
			update_post_meta( $post_id, 'sm_series_order', $order );
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
	 * @param int $post_id Target post ID.
	 * @return array<int, array{id: int, name: string, layout: string, styles: array<string, mixed>, posts: array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}>}> Array of series data.
	 */
	public function getSeriesForPost( int $post_id ): array {
		/**
		 * Terms assigned to the post.
		 *
		 * @var array<WP_Term>|WP_Error $terms
		 */
		$terms = wp_get_post_terms( $post_id, SeriesTaxonomy::TAXONOMY );

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
			if ( ! ( $term instanceof WP_Term ) ) {
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
					: (string) $default_layout );

			$styles = (array) ( $meta_settings['custom_styles'] ?? ( $meta_settings['style'] ?? array() ) );

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
	 * @param int $post_id Target post ID.
	 * @return array<int, array{id: int, name: string, layout: string, styles: array<string, mixed>, posts: array<int, array{id: int, title: string, url: string, part_order: int, thumbnail: string|null}>}>
	 */
	public function get_series_for_post( int $post_id ): array {
		return $this->getSeriesForPost( $post_id );
	}
}
