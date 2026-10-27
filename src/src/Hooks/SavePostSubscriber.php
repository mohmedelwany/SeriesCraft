<?php
/**
 * SavePostSubscriber file.
 *
 * @package SeriesCraft\Hooks
 */

declare(strict_types=1);

namespace SeriesCraft\Hooks;

use SeriesCraft\Taxonomy\SeriesTaxonomy;
use wpdb;

/**
 * Class SavePostSubscriber
 *
 * Handles post save events to maintain data integrity:
 * - Ensures series taxonomy association (via wp_set_object_terms).
 * - Synchronizes the custom junction table ({$wpdb->prefix}series_craft_posts) with post_id, series_id, and sort_order.
 */
class SavePostSubscriber {

	/**
	 * Database abstraction instance.
	 *
	 * @var wpdb|null
	 */
	private ?wpdb $wpdb = null;

	/**
	 * Custom junction table name.
	 *
	 * @var string
	 */
	private string $table_name;

	/**
	 * Flag indicating whether hooks have been registered.
	 *
	 * @var bool
	 */
	private bool $registered = false;

	/**
	 * Constructor.
	 *
	 * @param wpdb|null $wpdb Optional database abstraction instance.
	 */
	public function __construct( ?wpdb $wpdb = null ) {
		if ( null !== $wpdb ) {
			$this->wpdb = $wpdb;
		} else {
			global $wpdb;
			$this->wpdb = $wpdb;
		}

		$prefix           = ( $this->wpdb && isset( $this->wpdb->prefix ) ) ? $this->wpdb->prefix : 'wp_';
		$this->table_name = $prefix . 'series_craft_posts';
	}

	/**
	 * Registers event listener hooks for post save and term association.
	 *
	 * @return void
	 */
	public function register(): void {
		if ( $this->registered ) {
			return;
		}

		add_action( 'save_post', array( $this, 'on_save_post' ), 20, 2 );
		add_action( 'set_object_terms', array( $this, 'on_set_object_terms' ), 20, 4 );

		$this->registered = true;
	}

	/**
	 * Retrieves the custom junction table name.
	 *
	 * @return string
	 */
	public function get_table_name(): string {
		return $this->table_name;
	}

	/**
	 * Handles save_post action to persist series association and sync custom table.
	 *
	 * @param int         $post_id Post ID being saved.
	 * @param object|null $post    Post object.
	 * @return void
	 */
	public function on_save_post( int $post_id, $post = null ): void {
		if ( $post_id <= 0 ) {
			return;
		}

		// Avoid autosaves and revisions.
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		if ( function_exists( 'wp_is_post_revision' ) && wp_is_post_revision( $post_id ) ) {
			return;
		}

		if ( function_exists( 'wp_is_post_autosave' ) && wp_is_post_autosave( $post_id ) ) {
			return;
		}

		if ( is_object( $post ) && isset( $post->post_status ) && in_array( $post->post_status, array( 'trash', 'auto-draft' ), true ) ) {
			return;
		}

		// Handle manual submission if sent in $_POST.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		if ( isset( $_POST['series'] ) ) {
			// phpcs:ignore WordPress.Security.NonceVerification.Missing
			$series_input = $_POST['series'];
			$series_ids   = is_array( $series_input ) ? array_map( 'intval', $series_input ) : array( (int) $series_input );
			$series_ids   = array_filter( $series_ids );
			if ( function_exists( 'wp_set_object_terms' ) ) {
				wp_set_object_terms( $post_id, $series_ids, SeriesTaxonomy::TAXONOMY );
			}
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		} elseif ( isset( $_POST['seriescraft_series_id'] ) ) {
			// phpcs:ignore WordPress.Security.NonceVerification.Missing
			$series_id = (int) $_POST['seriescraft_series_id'];
			if ( function_exists( 'wp_set_object_terms' ) ) {
				wp_set_object_terms( $post_id, $series_id > 0 ? array( $series_id ) : array(), SeriesTaxonomy::TAXONOMY );
			}
		}

		$this->sync_junction_table( $post_id );
	}

	/**
	 * Handles set_object_terms action to sync custom table when taxonomy terms are updated.
	 *
	 * @param int    $object_id Object ID (post ID).
	 * @param array  $terms     Array of term IDs or names.
	 * @param array  $tt_ids    Array of term taxonomy IDs.
	 * @param string $taxonomy  Taxonomy slug.
	 * @return void
	 */
	public function on_set_object_terms( int $object_id, $terms, $tt_ids, string $taxonomy ): void {
		if ( SeriesTaxonomy::TAXONOMY !== $taxonomy && 'series' !== $taxonomy ) {
			return;
		}

		$this->sync_junction_table( $object_id );
	}

	/**
	 * Synchronizes the custom {$wpdb->prefix}series_craft_posts table with current term associations.
	 *
	 * @param int $post_id Target post ID.
	 * @return void
	 */
	public function sync_junction_table( int $post_id ): void {
		if ( ! $this->wpdb || ! function_exists( 'wp_get_object_terms' ) ) {
			return;
		}

		$terms = wp_get_object_terms( $post_id, SeriesTaxonomy::TAXONOMY, array( 'fields' => 'ids' ) );

		if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
			$terms = array();
		}

		$assigned_series_ids = array_map( 'intval', $terms );

		// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared

		// 1. Insert or update sort_order for newly assigned series
		foreach ( $assigned_series_ids as $series_id ) {
			if ( $series_id <= 0 ) {
				continue;
			}

			$existing_order = $this->wpdb->get_var(
				$this->wpdb->prepare(
					"SELECT sort_order FROM {$this->table_name} WHERE series_id = %d AND post_id = %d",
					$series_id,
					$post_id
				)
			);

			if ( null === $existing_order ) {
				$max_order = (int) $this->wpdb->get_var(
					$this->wpdb->prepare(
						"SELECT MAX(sort_order) FROM {$this->table_name} WHERE series_id = %d",
						$series_id
					)
				);

				$sort_order = $max_order + 1;

				$this->wpdb->insert(
					$this->table_name,
					array(
						'series_id'  => $series_id,
						'post_id'    => $post_id,
						'sort_order' => $sort_order,
						'created_at' => function_exists( 'current_time' ) ? current_time( 'mysql' ) : gmdate( 'Y-m-d H:i:s' ),
					),
					array( '%d', '%d', '%d', '%s' )
				);

				// Sync term_order in wp_term_relationships if available.
				if ( ! empty( $this->wpdb->term_relationships ) && function_exists( 'get_term' ) ) {
					$term_obj = get_term( $series_id, SeriesTaxonomy::TAXONOMY );
					if ( is_object( $term_obj ) && isset( $term_obj->term_taxonomy_id ) ) {
						$this->wpdb->update(
							$this->wpdb->term_relationships,
							array( 'term_order' => $sort_order ),
							array(
								'object_id'        => $post_id,
								'term_taxonomy_id' => (int) $term_obj->term_taxonomy_id,
							),
							array( '%d' ),
							array( '%d', '%d' )
						);
					}
				}
			}
		}

		// 2. Remove unassigned series for this post from the junction table
		if ( ! empty( $assigned_series_ids ) ) {
			$placeholders = implode( ',', array_fill( 0, count( $assigned_series_ids ), '%d' ) );
			$this->wpdb->query(
				$this->wpdb->prepare(
					"DELETE FROM {$this->table_name} WHERE post_id = %d AND series_id NOT IN ({$placeholders})",
					...array_merge( array( $post_id ), $assigned_series_ids )
				)
			);
		} else {
			$this->wpdb->delete(
				$this->table_name,
				array( 'post_id' => $post_id ),
				array( '%d' )
			);
		}

		// phpcs:enable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}
}
