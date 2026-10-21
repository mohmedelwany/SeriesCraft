<?php
/**
 * SeriesOrderRepository class definition.
 *
 * @package SeriesCraft\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Database\Repositories;

/**
 * Class SeriesOrderRepository
 *
 * Handles database persistence for series post sequencing and batch order synchronization.
 */
class SeriesOrderRepository {

	/**
	 * Meta key prefix for legacy order fallback.
	 */
	private const META_KEY_PREFIX = '_series_order_';

	/**
	 * Updates the sequential order of posts within a specific series term.
	 *
	 * Performs batch updates on wp_term_relationships.term_order and synchronizes
	 * fallback post meta.
	 *
	 * @param int   $term_id Term ID of the series.
	 * @param array $items   Array of associative arrays containing 'post_id' and 'order'.
	 * @return bool True on success, false on failure.
	 */
	public function update_series_posts_order( int $term_id, array $items ): bool {
		global $wpdb;

		if ( $term_id <= 0 ) {
			return false;
		}

		if ( empty( $items ) ) {
			return true;
		}

		$term_taxonomy_id = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT term_taxonomy_id FROM {$wpdb->term_taxonomy} WHERE term_id = %d LIMIT 1",
				$term_id
			)
		);

		if ( ! $term_taxonomy_id ) {
			return false;
		}

		$term_taxonomy_id = (int) $term_taxonomy_id;

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || ! isset( $item['post_id'], $item['order'] ) ) {
				continue;
			}

			$post_id = (int) $item['post_id'];
			$order   = (int) $item['order'];

			if ( $post_id <= 0 || $order < 0 ) {
				continue;
			}

			// Update term_order column in wp_term_relationships.
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

			// Synchronize custom junction table.
			$table_name = $wpdb->prefix . 'series_craft_posts';
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

			// Synchronize post meta fallback.
			update_post_meta( $post_id, self::META_KEY_PREFIX . $term_id, $order );

			clean_post_cache( $post_id );
		}

		clean_term_cache( $term_id, 'series' );

		return true;
	}

	/**
	 * Retrieves post IDs associated with a series ordered by term_order ascending.
	 *
	 * @param int $term_id Term ID of the series.
	 * @return int[] Array of ordered post IDs.
	 */
	public function get_ordered_post_ids( int $term_id ): array {
		global $wpdb;

		if ( $term_id <= 0 ) {
			return array();
		}

		$results = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT tr.object_id
				 FROM {$wpdb->term_relationships} tr
				 INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
				 WHERE tt.term_id = %d
				 ORDER BY tr.term_order ASC, tr.object_id ASC",
				$term_id
			)
		);

		if ( empty( $results ) ) {
			return array();
		}

		return array_map( 'intval', $results );
	}
}
