<?php
/**
 * SeriesTaxonomy file.
 *
 * @package SeriesCraft\Taxonomy
 */

declare(strict_types=1);

namespace SeriesCraft\Taxonomy;

/**
 * Class SeriesTaxonomy
 *
 * Handles registration and configuration of the custom 'series' taxonomy in WordPress.
 * Supports dynamic post type binding, REST API discovery for Gutenberg editor panels,
 * and security capability mapping.
 *
 * @package SeriesCraft\Taxonomy
 */
class SeriesTaxonomy {

	/**
	 * Unique taxonomy identifier.
	 */
	public const TAXONOMY = 'series';

	/**
	 * Base slug for REST API endpoints.
	 */
	public const REST_BASE = 'series';

	/**
	 * Default post types associated with the taxonomy if none are provided.
	 *
	 * @var array<string>
	 */
	private const DEFAULT_OBJECT_TYPES = array( 'post' );

	/**
	 * Registers the custom taxonomy with WordPress.
	 *
	 * @param array<string>|mixed $object_types Array of post types to bind the taxonomy to.
	 * @return void
	 */
	public function register( $object_types = self::DEFAULT_OBJECT_TYPES ): void {
		if ( ! is_array( $object_types ) || empty( $object_types ) ) {
			$object_types = self::DEFAULT_OBJECT_TYPES;
		}
		$labels = array(
			'name'                       => _x( 'Series', 'taxonomy general name', 'series-craft' ),
			'singular_name'              => _x( 'Series', 'taxonomy singular name', 'series-craft' ),
			'search_items'               => __( 'Search Series', 'series-craft' ),
			'popular_items'              => __( 'Popular Series', 'series-craft' ),
			'all_items'                  => __( 'All Series', 'series-craft' ),
			'parent_item'                => null,
			'parent_item_colon'          => null,
			'edit_item'                  => __( 'Edit Series', 'series-craft' ),
			'update_item'                => __( 'Update Series', 'series-craft' ),
			'add_new_item'               => __( 'Add New Series', 'series-craft' ),
			'new_item_name'              => __( 'New Series Name', 'series-craft' ),
			'separate_items_with_commas' => __( 'Separate series with commas', 'series-craft' ),
			'add_or_remove_items'        => __( 'Add or remove series', 'series-craft' ),
			'choose_from_most_used'      => __( 'Choose from the most used series', 'series-craft' ),
			'not_found'                  => __( 'No series found.', 'series-craft' ),
			'menu_name'                  => __( 'Series', 'series-craft' ),
			'back_to_items'              => __( '&larr; Go to Series', 'series-craft' ),
		);

		$capabilities = array(
			'manage_terms' => 'manage_categories',
			'edit_terms'   => 'manage_categories',
			'delete_terms' => 'manage_categories',
			'assign_terms' => 'edit_posts',
		);

		$args = array(
			'hierarchical'          => false,
			'labels'                => $labels,
			'show_ui'               => true,
			'show_in_menu'          => 'edit.php',
			'show_admin_column'     => true,
			'update_count_callback' => '_update_post_term_count',
			'query_var'             => true,
			'rewrite'               => array(
				'slug'       => 'series',
				'with_front' => false,
			),
			'show_in_rest'          => true,
			'rest_base'             => self::REST_BASE,
			'capabilities'          => $capabilities,
		);

		register_taxonomy( self::TAXONOMY, $object_types, $args );
	}
}
