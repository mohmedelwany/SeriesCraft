<?php
/**
 * Settings repository implementation.
 *
 * @package SeriesCraft\Database\Repositories
 */

declare(strict_types=1);

namespace SeriesCraft\Database\Repositories;

/**
 * Class SettingsRepository
 *
 * Handles persistence and retrieval of admin configuration options in wp_options,
 * with backward-compatible fallbacks for legacy Series Manager option keys.
 */
class SettingsRepository implements SettingsRepositoryInterface {

	/**
	 * Option key for supported post types.
	 *
	 * @var string
	 */
	public const OPTION_SUPPORTED_POST_TYPES = 'seriescraft_supported_post_types';

	/**
	 * Legacy option key for supported post types.
	 *
	 * @var string
	 */
	public const LEGACY_OPTION_SUPPORTED_POST_TYPES = 'sm_supported_post_types';

	/**
	 * Option key for default layout variant.
	 *
	 * @var string
	 */
	public const OPTION_DEFAULT_LAYOUT = 'seriescraft_default_layout';

	/**
	 * Legacy option key for layout variant.
	 *
	 * @var string
	 */
	public const LEGACY_OPTION_DEFAULT_LAYOUT = 'content_variant';

	/**
	 * Default supported post types fallback.
	 *
	 * @var array<int, string>
	 */
	public const DEFAULT_POST_TYPES = array( 'post' );

	/**
	 * Default layout variant fallback.
	 *
	 * @var string
	 */
	public const DEFAULT_LAYOUT = 'link-list';

	/**
	 * Retrieve supported post types.
	 *
	 * Checks the primary option key first, then falls back to the legacy key.
	 *
	 * @return array<int, string> List of supported post type slugs.
	 */
	public function get_supported_post_types(): array {
		$saved = get_option( self::OPTION_SUPPORTED_POST_TYPES, null );

		if ( null === $saved ) {
			$saved = get_option( self::LEGACY_OPTION_SUPPORTED_POST_TYPES, null );
		}

		if ( ! is_array( $saved ) || empty( $saved ) ) {
			return self::DEFAULT_POST_TYPES;
		}

		$filtered = array_values( array_filter( $saved, 'is_string' ) );

		return empty( $filtered ) ? self::DEFAULT_POST_TYPES : $filtered;
	}

	/**
	 * Persist supported post types.
	 *
	 * @param array<int, string> $post_types Validated post type slugs.
	 * @return bool True if value changed, false otherwise.
	 */
	public function set_supported_post_types( array $post_types ): bool {
		$clean = array_values( array_unique( array_filter( $post_types, 'is_string' ) ) );

		return update_option( self::OPTION_SUPPORTED_POST_TYPES, $clean );
	}

	/**
	 * Retrieve default layout variant.
	 *
	 * Checks the primary option key first, then falls back to the legacy key.
	 *
	 * @return string Layout slug.
	 */
	public function get_default_layout(): string {
		$layout = get_option( self::OPTION_DEFAULT_LAYOUT, null );

		if ( null === $layout || '' === $layout ) {
			$layout = get_option( self::LEGACY_OPTION_DEFAULT_LAYOUT, self::DEFAULT_LAYOUT );
		}

		return is_string( $layout ) && '' !== $layout ? $layout : self::DEFAULT_LAYOUT;
	}

	/**
	 * Persist default layout variant.
	 *
	 * @param string $layout Validated layout variant.
	 * @return bool True if value changed, false otherwise.
	 */
	public function set_default_layout( string $layout ): bool {
		return update_option( self::OPTION_DEFAULT_LAYOUT, $layout );
	}
}
