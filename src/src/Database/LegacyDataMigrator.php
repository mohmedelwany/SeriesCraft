<?php
/**
 * LegacyDataMigrator file.
 *
 * @package SeriesCraft\Database
 */

declare(strict_types=1);

namespace SeriesCraft\Database;

use SeriesCraft\Taxonomy\SeriesTaxonomy;
use wpdb;

/**
 * Migrates legacy series post ordering data from term meta and core term relationships to custom junction table.
 */
class LegacyDataMigrator {

	/**
	 * Legacy term meta key storing post ordering.
	 */
	public const LEGACY_META_KEY = 'series_post_order';

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
	 * Retrieves the target table name.
	 *
	 * @return string
	 */
	public function get_table_name(): string {
		return $this->table_name;
	}

	/**
	 * Migrates all legacy series post data into the custom junction table.
	 *
	 * 1. Syncs relationships from WordPress core term_relationships joined with term_taxonomy.
	 * 2. Overlays any explicit post order stored in legacy term meta ('series_post_order').
	 *
	 * The migration is non-destructive (legacy records are preserved as fallback)
	 * and idempotent (safe to run multiple times without duplicate entries or errors).
	 *
	 * @return void
	 */
	public function migrate(): void {
		$this->migrate_term_relationships();
		$this->migrate_term_meta();
	}

	/**
	 * Migrates existing series-post relationships from WordPress core term_relationships.
	 *
	 * Queries relationships joined with term_taxonomy where taxonomy matches SeriesTaxonomy::TAXONOMY
	 * and inserts/syncs them into the custom junction table.
	 *
	 * @return void
	 */
	public function migrate_term_relationships(): void {
		$term_rel_table = ! empty( $this->wpdb->term_relationships ) ? $this->wpdb->term_relationships : $this->wpdb->prefix . 'term_relationships';
		$term_tax_table = ! empty( $this->wpdb->term_taxonomy ) ? $this->wpdb->term_taxonomy : $this->wpdb->prefix . 'term_taxonomy';

		$taxonomy = class_exists( SeriesTaxonomy::class ) && defined( SeriesTaxonomy::class . '::TAXONOMY' )
			? SeriesTaxonomy::TAXONOMY
			: 'series';

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$results = $this->wpdb->get_results(
			$this->wpdb->prepare(
				"SELECT tt.term_id AS series_id, tr.object_id AS post_id, tr.term_order AS sort_order
				FROM {$term_rel_table} tr
				INNER JOIN {$term_tax_table} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
				WHERE tt.taxonomy = %s",
				$taxonomy
			),
			ARRAY_A
		);
		// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared

		if ( empty( $results ) || ! is_array( $results ) ) {
			return;
		}

		foreach ( $results as $row ) {
			$series_id  = isset( $row['series_id'] ) ? (int) $row['series_id'] : 0;
			$post_id    = isset( $row['post_id'] ) ? (int) $row['post_id'] : 0;
			$sort_order = isset( $row['sort_order'] ) ? (int) $row['sort_order'] : 0;

			if ( $series_id <= 0 || $post_id <= 0 ) {
				continue;
			}

			$this->wpdb->replace(
				$this->get_table_name(),
				array(
					'series_id'  => $series_id,
					'post_id'    => $post_id,
					'sort_order' => $sort_order,
					'created_at' => current_time( 'mysql' ),
				),
				array( '%d', '%d', '%d', '%s' )
			);
		}
	}

	/**
	 * Migrates legacy series_post_order term meta entries into the custom table.
	 *
	 * @return void
	 */
	public function migrate_term_meta(): void {
		$termmeta_table = ! empty( $this->wpdb->termmeta ) ? $this->wpdb->termmeta : $this->wpdb->prefix . 'termmeta';

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared
		$results = $this->wpdb->get_results(
			$this->wpdb->prepare(
				"SELECT term_id, meta_value FROM {$termmeta_table} WHERE meta_key = %s",
				self::LEGACY_META_KEY
			),
			ARRAY_A
		);
		// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared

		if ( empty( $results ) || ! is_array( $results ) ) {
			return;
		}

		foreach ( $results as $row ) {
			if ( empty( $row['term_id'] ) ) {
				continue;
			}

			$term_id = (int) $row['term_id'];
			if ( $term_id <= 0 ) {
				continue;
			}

			$parsed_post_ids = $this->extract_post_ids( $row['meta_value'] ?? '' );
			if ( empty( $parsed_post_ids ) ) {
				continue;
			}

			foreach ( $parsed_post_ids as $order => $post_id ) {
				$this->wpdb->replace(
					$this->get_table_name(),
					array(
						'series_id'  => $term_id,
						'post_id'    => $post_id,
						'sort_order' => $order,
						'created_at' => current_time( 'mysql' ),
					),
					array( '%d', '%d', '%d', '%s' )
				);
			}
		}
	}

	/**
	 * Extracts and validates an ordered list of positive integer post IDs from legacy meta value.
	 *
	 * Handles comma-separated strings, serialized arrays, and trims invalid/empty values.
	 *
	 * @param mixed $meta_value Raw meta value from database.
	 * @return int[] List of valid, unique positive post IDs in sequence.
	 */
	private function extract_post_ids( $meta_value ): array {
		$unserialized = maybe_unserialize( $meta_value );
		$raw_ids      = array();

		if ( is_array( $unserialized ) ) {
			$raw_ids = $unserialized;
		} elseif ( is_string( $unserialized ) && '' !== trim( $unserialized ) ) {
			$raw_ids = explode( ',', $unserialized );
		}

		$valid_ids = array();
		foreach ( $raw_ids as $id ) {
			$trimmed = is_string( $id ) ? trim( $id ) : $id;
			if ( is_numeric( $trimmed ) ) {
				$post_id = (int) $trimmed;
				if ( $post_id > 0 && ! in_array( $post_id, $valid_ids, true ) ) {
					$valid_ids[] = $post_id;
				}
			}
		}

		return $valid_ids;
	}
}
