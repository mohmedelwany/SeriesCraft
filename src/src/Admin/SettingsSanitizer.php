<?php
/**
 * Settings Sanitizer & Validator.
 *
 * @package SeriesCraft\Admin
 */

declare(strict_types=1);

namespace SeriesCraft\Admin;

/**
 * Class SettingsSanitizer
 *
 * Pure static methods for validating and sanitizing administrative configuration options.
 */
final class SettingsSanitizer {

	/**
	 * Whitelist of permitted series layout variant slugs.
	 *
	 * @var array<int, string>
	 */
	public const ALLOWED_LAYOUTS = array(
		'media-grid',
		'link-grid',
		'media-list',
		'link-list',
	);

	/**
	 * Default fallback layout.
	 *
	 * @var string
	 */
	public const DEFAULT_LAYOUT = 'link-list';

	/**
	 * Default fallback post types.
	 *
	 * @var array<int, string>
	 */
	public const DEFAULT_POST_TYPES = array( 'post' );

	/**
	 * Sanitize and validate chosen post types against registered candidates.
	 *
	 * @param mixed              $input         Raw user input from form submission.
	 * @param array<int, string> $allowed_types Optional list of registered, eligible post type slugs.
	 * @return array<int, string> Sanitized and filtered array of valid post type slugs.
	 */
	public static function sanitize_post_types( $input, array $allowed_types = array() ): array {
		if ( ! is_array( $input ) ) {
			return self::DEFAULT_POST_TYPES;
		}

		$sanitized = array();

		foreach ( $input as $candidate ) {
			if ( ! is_string( $candidate ) ) {
				continue;
			}

			$clean_type = sanitize_key( $candidate );

			if ( '' === $clean_type ) {
				continue;
			}

			if ( ! empty( $allowed_types ) && ! in_array( $clean_type, $allowed_types, true ) ) {
				continue;
			}

			$sanitized[] = $clean_type;
		}

		return empty( $sanitized ) ? self::DEFAULT_POST_TYPES : array_values( array_unique( $sanitized ) );
	}

	/**
	 * Sanitize and validate layout variant choice against permitted whitelist.
	 *
	 * @param mixed  $input          Raw layout string input.
	 * @param string $default_layout Fallback if input is invalid.
	 * @return string Sanitized valid layout slug.
	 */
	public static function sanitize_layout( $input, string $default_layout = self::DEFAULT_LAYOUT ): string {
		$fallback = in_array( $default_layout, self::ALLOWED_LAYOUTS, true ) ? $default_layout : self::DEFAULT_LAYOUT;

		if ( ! is_string( $input ) ) {
			return $fallback;
		}

		$cleaned = sanitize_key( $input );

		if ( in_array( $cleaned, self::ALLOWED_LAYOUTS, true ) ) {
			return $cleaned;
		}

		return $fallback;
	}

	/**
	 * Retrieve list of all allowed layouts.
	 *
	 * @return array<int, string> Allowed layout slugs.
	 */
	public static function get_allowed_layouts(): array {
		return self::ALLOWED_LAYOUTS;
	}
}
