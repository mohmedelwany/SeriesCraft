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

		if ( function_exists( 'add_action' ) ) {
			add_action( 'rest_api_init', array( $this, 'register_rest_fields' ) );
		}
	}

	/**
	 * Registers custom REST API fields for the series taxonomy.
	 *
	 * @return void
	 */
	public function register_rest_fields(): void {
		if ( ! function_exists( 'register_rest_field' ) ) {
			return;
		}

		register_rest_field(
			self::TAXONOMY,
			'settings',
			array(
				'get_callback'    => array( $this, 'get_term_settings_rest' ),
				'update_callback' => array( $this, 'update_term_settings_rest' ),
				'schema'          => array(
					'description' => 'Series settings including layout and styling.',
					'type'        => 'object',
				),
			)
		);
	}

	/**
	 * REST field getter for series term settings.
	 *
	 * @param array<string, mixed> $term Prepared term array.
	 * @return array<string, mixed> Series settings payload.
	 */
	public function get_term_settings_rest( array $term ): array {
		$term_id       = (int) ( $term['id'] ?? 0 );
		$meta_settings = get_term_meta( $term_id, 'sm_series_settings', true );

		if ( ! is_array( $meta_settings ) ) {
			if ( is_string( $meta_settings ) ) {
				$decoded       = json_decode( $meta_settings, true );
				$meta_settings = is_array( $decoded ) ? $decoded : array();
			} else {
				$meta_settings = array();
			}
		}

		$default_layout = get_option( 'seriescraft_default_layout', '' );
		if ( empty( $default_layout ) ) {
			$default_layout = get_option( 'content_variant', 'link-list' );
		}
		if ( empty( $default_layout ) ) {
			$default_layout = 'link-list';
		}

		$layout = ! empty( $meta_settings['layout'] )
			? (string) $meta_settings['layout']
			: ( ! empty( $meta_settings['content_variant'] )
				? (string) $meta_settings['content_variant']
				: (string) $default_layout );

		$styles = (array) ( $meta_settings['custom_styles'] ?? ( $meta_settings['style'] ?? array() ) );

		return array(
			'layout'        => $layout,
			'custom_styles' => $styles,
			'style'         => $styles,
		);
	}

	/**
	 * REST field setter for series term settings.
	 *
	 * @param mixed   $value Value sent in REST request.
	 * @param WP_Term $term  Term object.
	 * @return bool True on success, false on failure.
	 */
	public function update_term_settings_rest( $value, WP_Term $term ): bool {
		if ( ! is_array( $value ) ) {
			return false;
		}

		$existing = get_term_meta( $term->term_id, 'sm_series_settings', true );
		if ( ! is_array( $existing ) ) {
			$existing = array();
		}

		$merged = array_merge( $existing, $value );

		return (bool) update_term_meta( $term->term_id, 'sm_series_settings', $merged );
	}
}
