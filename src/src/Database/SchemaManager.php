<?php
/**
 * SchemaManager file.
 *
 * @package SeriesCraft\Database
 */

declare(strict_types=1);

namespace SeriesCraft\Database;

use wpdb;

/**
 * Manages database schema creation, updates, and removals for SeriesCraft.
 */
class SchemaManager {

	/**
	 * Database schema version.
	 */
	public const VERSION = '1.0.0';

	/**
	 * WordPress database abstraction instance.
	 *
	 * @var wpdb
	 */
	private wpdb $wpdb;

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
	}

	/**
	 * Retrieves the fully qualified table name with the WordPress prefix.
	 *
	 * @return string
	 */
	public function get_table_name(): string {
		return $this->wpdb->prefix . 'series_craft_posts';
	}

	/**
	 * Creates or updates the plugin database tables using WordPress dbDelta().
	 *
	 * Adheres strictly to dbDelta formatting requirements:
	 * - Primary key has two spaces: PRIMARY KEY  (...)
	 * - Each column definition on its own line
	 * - Explicit field lengths for integers
	 * - Character set collation appended
	 *
	 * @return void
	 */
	public function create_tables(): void {
		$table_name      = $this->get_table_name();
		$charset_collate = $this->wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
  series_id bigint(20) unsigned NOT NULL,
  post_id bigint(20) unsigned NOT NULL,
  sort_order int(11) NOT NULL DEFAULT 0,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY  (series_id, post_id),
  KEY series_order (series_id, sort_order),
  KEY post_series (post_id, series_id)
) {$charset_collate};";

		if ( ! function_exists( 'dbDelta' ) ) {
			$upgrade_file = ( defined( 'ABSPATH' ) ? ABSPATH : '' ) . 'wp-admin/includes/upgrade.php';
			if ( file_exists( $upgrade_file ) ) {
				require_once $upgrade_file;
			}
		}

		if ( function_exists( 'dbDelta' ) ) {
			dbDelta( $sql );
		} else {
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Schema definition executed as fallback.
			$this->wpdb->query( $sql );
		}
	}

	/**
	 * Drops the plugin database tables.
	 *
	 * Useful for uninstallation routines and test cleanups.
	 *
	 * @return void
	 */
	public function drop_tables(): void {
		$table_name = $this->get_table_name();
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name is safely prefixed.
		$this->wpdb->query( "DROP TABLE IF EXISTS {$table_name}" );
	}

	/**
	 * Returns the current schema version.
	 *
	 * @return string
	 */
	public function get_version(): string {
		return self::VERSION;
	}
}
