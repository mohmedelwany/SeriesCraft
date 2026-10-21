<?php
/**
 * LegacyDataMigrator file.
 *
 * @package SeriesCraft\Database
 */

declare(strict_types=1);

namespace SeriesCraft\Database;

use wpdb;

/**
 * Migrates legacy series post ordering data from term meta to custom junction table.
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
	 * Migrates all legacy series_post_order term meta entries into the custom table.
	 *
	 * The migration is non-destructive (legacy meta is preserved as fallback)
	 * and idempotent (safe to run multiple times without duplicate entries or errors).
	 *
	 * @return void
	 */
	public function migrate(): void {
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
