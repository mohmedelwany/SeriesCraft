<?php
/**
 * SeriesRepository file.
 *
 * @package SeriesCraft\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Database\Repositories;

use SeriesCraft\Taxonomy\SeriesTaxonomy;
use wpdb;
use WP_Post;
use WP_Term;

/**
 * Class SeriesRepository
 *
 * Implements data access operations for series terms and explicit post ordering.
 * Uses the custom series_craft_posts table as the primary source of truth,
 * while maintaining backward-compatible synchronization with wp_term_relationships
 * and sm_series_order post meta.
 *
 * @package SeriesCraft\Database\Repositories
 */
class SeriesRepository implements SeriesRepositoryInterface {

	/**
	 * WordPress database abstraction instance.
	 *
	 * @var wpdb
	 */
	private wpdb $wpdb;

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

		$this->table_name = $this->wpdb->prefix . 'series_craft_posts';
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
	 * Queries the custom series_craft_posts table as primary source of truth.
	 *
	 * @param int           $term_id  Series taxonomy term ID.
	 * @param array<string> $statuses Post statuses to include. Defaults to array( 'publish' ).
	 * @return array<WP_Post> Ordered list of WP_Post objects.
	 */
	public function get_series_posts( int $term_id, array $statuses = array( 'publish' ) ): array {
		if ( empty( $statuses ) ) {
			$statuses = array( 'publish' );
		}

		$sanitized_statuses = array();
		foreach ( $statuses as $status ) {
			if ( is_string( $status ) && '' !== trim( $status ) ) {
				$sanitized_statuses[] = trim( $status );
			}
		}

		if ( empty( $sanitized_statuses ) ) {
			$sanitized_statuses = array( 'publish' );
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
	 * to be persisted even if missing, and syncs backward-compatibly with
	 * wp_term_relationships and sm_series_order post meta.
	 *
	 * @param int        $term_id  Series taxonomy term ID.
	 * @param array<int> $post_ids Ordered list of post IDs.
	 * @return bool True on success, false on failure.
	 */
	public function update_series_order( int $term_id, array $post_ids ): bool {
		$term_taxonomy = get_term( $term_id, SeriesTaxonomy::TAXONOMY );
		if ( ! ( $term_taxonomy instanceof WP_Term ) ) {
			return false;
		}

		$term_taxonomy_id = (int) $term_taxonomy->term_taxonomy_id;
		$table_name       = $this->get_table_name();

		foreach ( $post_ids as $index => $post_id ) {
			$order   = $index + 1;
			$post_id = (int) $post_id;

			// 1. Persist explicit order to custom table series_craft_posts via replace.
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

			// 2. Synchronize term_order in wp_term_relationships for backward compatibility.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$this->wpdb->update(
				$this->wpdb->term_relationships,
				array( 'term_order' => $order ),
				array(
					'object_id'        => $post_id,
					'term_taxonomy_id' => $term_taxonomy_id,
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
}
