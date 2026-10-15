<?php
/**
 * SeriesRepository file.
 *
 * @package SeriesCraft\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Database\Repositories;

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
	 * @param int $term_id Series taxonomy term ID.
	 * @return array<WP_Post> Ordered list of WP_Post objects.
	 */
	public function get_series_posts( int $term_id ): array {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$results = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT p.* FROM {$wpdb->posts} p
				INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
				INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
				WHERE tt.term_id = %d AND tt.taxonomy = %s AND p.post_status = 'publish'
				ORDER BY tr.term_order ASC, p.post_date ASC",
				$term_id,
				SeriesTaxonomy::TAXONOMY
			)
		);

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

			// 2. Synchronize legacy/fallback post meta.
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
}
