<?php
/**
 * LifecycleSubscriber file.
 *
 * @package SeriesCraft\Database
 */

declare(strict_types=1);

namespace SeriesCraft\Database;

use wpdb;

/**
 * Handles WordPress lifecycle events to maintain data integrity in custom tables.
 */
class LifecycleSubscriber {

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
	 * Flag indicating whether hooks have been registered.
	 *
	 * @var bool
	 */
	private bool $registered = false;

	/**
	 * Constructor.
	 *
	 * @param wpdb|null $wpdb          Optional WordPress database instance for dependency injection.
	 * @param bool      $auto_register Whether to automatically register hooks upon instantiation.
	 */
	public function __construct( ?wpdb $wpdb = null, bool $auto_register = true ) {
		if ( null !== $wpdb ) {
			$this->wpdb = $wpdb;
		} else {
			global $wpdb;
			$this->wpdb = $wpdb;
		}

		$this->table_name = $this->wpdb->prefix . 'series_craft_posts';

		if ( $auto_register ) {
			$this->register();
		}
	}

	/**
	 * Registers WordPress lifecycle action hooks.
	 *
	 * @return void
	 */
	public function register(): void {
		if ( $this->registered ) {
			return;
		}

		add_action( 'deleted_post', array( $this, 'on_deleted_post' ) );
		add_action( 'pre_delete_term', array( $this, 'on_pre_delete_term' ), 10, 2 );

		$this->registered = true;
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
	 * Handles post deletion to clean up custom relationship records.
	 *
	 * @param int $post_id ID of the deleted post.
	 * @return void
	 */
	public function on_deleted_post( int $post_id ): void {
		$this->wpdb->delete(
			$this->get_table_name(),
			array( 'post_id' => $post_id ),
			array( '%d' )
		);
	}

	/**
	 * Handles term deletion to clean up all post associations belonging to the deleted series.
	 *
	 * @param int    $term_id  ID of the deleted term.
	 * @param string $taxonomy Taxonomy name.
	 * @return void
	 */
	public function on_pre_delete_term( int $term_id, string $taxonomy ): void {
		if ( 'series' !== $taxonomy ) {
			return;
		}

		$this->wpdb->delete(
			$this->get_table_name(),
			array( 'series_id' => $term_id ),
			array( '%d' )
		);
	}
}
